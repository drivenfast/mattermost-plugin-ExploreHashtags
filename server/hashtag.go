package main

import (
	"fmt"
	"regexp"
	"sort"
	"strings"
)

type HashtagGroup struct {
	Prefix string         `json:"prefix"`
	Tags   []HashtagCount `json:"tags"`
}

var tagRe = regexp.MustCompile(`(^|\s)#([a-zA-Z0-9_\-\.]+)`)

func (p *Plugin) getPostsWithHashtag(tag string, channelID string) ([]HashtagPost, error) {
	var result []HashtagPost

	// If channelID is provided, get posts from that channel
	if channelID != "" {
		channel, appErr := p.API.GetChannel(channelID)
		if appErr != nil {
			return nil, fmt.Errorf("failed to get channel: %w", appErr)
		}

		p.API.LogDebug("Searching for hashtag in channel", 
			"tag", tag,
			"channel_id", channelID,
			"team_id", channel.TeamId,
			"channel_name", channel.Name)

		page := 0
		perPage := 200

		for {
			posts, appErr := p.API.GetPostsForChannel(channelID, page, perPage)
			if appErr != nil {
				return nil, fmt.Errorf("failed to get posts: %w", appErr)
			}
			if posts == nil || len(posts.Order) == 0 {
				break
			}

			p.API.LogDebug("Processing posts from channel", 
				"page", page,
				"count", len(posts.Order))

			for _, id := range posts.Order {
				post := posts.Posts[id]
				if post == nil || post.Type != "" {
					continue
				}

				// Check if post contains the hashtag
				matches := tagRe.FindAllStringSubmatch(post.Message, -1)
				hasTag := false
				for _, m := range matches {
					if m[2] == tag {
						hasTag = true
						break
					}
				}

				if !hasTag {
					continue
				}

				// Skip bot posts
				user, appErr := p.API.GetUser(post.UserId)
				if appErr != nil || user.IsBot {
					continue
				}

				result = append(result, HashtagPost{
					ID:        post.Id,
					Message:   post.Message,
					CreateAt:  post.CreateAt,
					Username:  user.Username,
					ChannelID: post.ChannelId,
				})
			}
			page++
		}
	} else {
		// If no channelID provided, search across all teams
		teams, appErr := p.API.GetTeams()
		if appErr != nil {
			return nil, fmt.Errorf("failed to get teams: %w", appErr)
		}

		for _, team := range teams {
			channels, appErr := p.API.GetPublicChannelsForTeam(team.Id, 0, 1000)
			if appErr != nil {
				p.API.LogError("Failed to get channels for team", "error", appErr.Error(), "team_id", team.Id)
				continue
			}

			for _, channel := range channels {
				page := 0
				perPage := 200

				for {
					posts, appErr := p.API.GetPostsForChannel(channel.Id, page, perPage)
					if appErr != nil {
						p.API.LogError("Failed to get posts for channel", "error", appErr.Error(), "channel_id", channel.Id)
						break
					}
					if posts == nil || len(posts.Order) == 0 {
						break
					}

					for _, id := range posts.Order {
						post := posts.Posts[id]
						if post == nil || post.Type != "" {
							continue
						}

						// Check if post contains the hashtag
						matches := tagRe.FindAllStringSubmatch(post.Message, -1)
						hasTag := false
						for _, m := range matches {
							if m[2] == tag {
								hasTag = true
								break
							}
						}

						if !hasTag {
							continue
						}

						// Skip bot posts
						user, appErr := p.API.GetUser(post.UserId)
						if appErr != nil || user.IsBot {
							continue
						}

						result = append(result, HashtagPost{
							ID:        post.Id,
							Message:   post.Message,
							CreateAt:  post.CreateAt,
							Username:  user.Username,
							ChannelID: post.ChannelId,
						})
					}
					page++
				}
			}
		}
	}

	// Sort posts by creation time, newest first
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreateAt > result[j].CreateAt
	})

	p.API.LogDebug("Returning posts", "count", len(result))
	return result, nil
}

func groupHashtagsByPrefix(tags []HashtagCount) []HashtagGroup {
	groups := make(map[string][]HashtagCount)
	
	for _, tag := range tags {
		parts := strings.Split(tag.Tag, "-")
		if len(parts) > 1 {
			prefix := parts[0]
			if _, ok := groups[prefix]; !ok {
				groups[prefix] = []HashtagCount{}
			}
			groups[prefix] = append(groups[prefix], tag)
		} else {
			// Handle tags without hyphens by using themselves as the prefix
			if _, ok := groups[tag.Tag]; !ok {
				groups[tag.Tag] = []HashtagCount{}
			}
			groups[tag.Tag] = append(groups[tag.Tag], tag)
		}
	}

	// Convert map to sorted slice
	result := make([]HashtagGroup, 0, len(groups))
	for prefix, tags := range groups {
		// Only create a group if there are multiple tags with the same prefix
		if len(tags) > 1 || !strings.Contains(prefix, "-") {
			result = append(result, HashtagGroup{
				Prefix: prefix,
				Tags:   tags,
			})
		}
	}

	// Sort groups by prefix
	sort.Slice(result, func(i, j int) bool {
		return result[i].Prefix < result[j].Prefix
	})

	return result
}

func formatHashtagCounts(counts map[string]int) ([]HashtagCount, error) {
	tags := make([]HashtagCount, 0, len(counts))
	for t, c := range counts {
		tags = append(tags, HashtagCount{Tag: t, Count: c})
	}
	sort.Slice(tags, func(i, j int) bool { return tags[i].Count > tags[j].Count })
	return tags, nil
}

func (p *Plugin) computeTeamHashtags(teamID string, max int) ([]HashtagCount, error) {
	counts := map[string]int{}
	totalTags := 0

	p.API.LogDebug("Getting channels for team", "team_id", teamID)
	channels, appErr := p.API.GetPublicChannelsForTeam(teamID, 0, 1000)
	if appErr != nil {
		p.API.LogError("Failed to get channels", "error", appErr.Error(), "team_id", teamID)
		return nil, fmt.Errorf("failed to get channels: %w", appErr)
	}

	p.API.LogDebug("Found channels", "count", len(channels))

	for _, channel := range channels {
		page := 0
		perPage := 200

		for {
			posts, appErr := p.API.GetPostsForChannel(channel.Id, page, perPage)
			if appErr != nil {
				return nil, appErr
			}
			if posts == nil || len(posts.Order) == 0 {
				break
			}
			for _, id := range posts.Order {
				post := posts.Posts[id]
				if post == nil || post.Type != "" {
					continue
				}
				
				// Check if the post is from a bot
				user, appErr := p.API.GetUser(post.UserId)
				if appErr != nil || user.IsBot {
					continue
				}

				matches := tagRe.FindAllStringSubmatch(post.Message, -1)
				for _, m := range matches {
					tag := m[2]
					counts[tag]++
					totalTags++
					if max > 0 && totalTags >= max {
						break
					}
				}
				
				if max > 0 && totalTags >= max {
					break
				}
			}
			if max > 0 && totalTags >= max {
				break
			}
			page++
		}
	}

	return formatHashtagCounts(counts)
}

func (p *Plugin) computeHashtags(channelID string, max int) ([]HashtagCount, error) {
	counts := map[string]int{}
	totalTags := 0

	page := 0
	perPage := 200

	for {
		posts, appErr := p.API.GetPostsForChannel(channelID, page, perPage)
		if appErr != nil {
			return nil, appErr
		}
		if posts == nil || len(posts.Order) == 0 {
			break
		}
		for _, id := range posts.Order {
			post := posts.Posts[id]
			if post == nil || post.Type != "" {
				continue
			}
			
			// Skip bot posts for consistency with team view
			user, appErr := p.API.GetUser(post.UserId)
			if appErr != nil || user.IsBot {
				continue
			}

			matches := tagRe.FindAllStringSubmatch(post.Message, -1)
			for _, m := range matches {
				tag := m[2]
				counts[tag]++
				totalTags++
				if max > 0 && totalTags >= max {
					break
				}
			}
			
			if max > 0 && totalTags >= max {
				break
			}
		}
		if max > 0 && totalTags >= max {
			break
		}
		page++
	}

	return formatHashtagCounts(counts)
}