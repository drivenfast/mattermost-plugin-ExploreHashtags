package main

import (
	"fmt"
	"regexp"
	"sort"
	"strings"
	
	"github.com/mattermost/mattermost/server/public/model"
)

type HashtagGroup struct {
	Prefix string         `json:"prefix"`
	Tags   []HashtagCount `json:"tags"`
}

var tagRe = regexp.MustCompile(`(^|\s)#([a-zA-Z0-9_\-\.]+)`)

func (p *Plugin) getPostsWithHashtag(tag string) ([]HashtagPost, error) {
	var result []HashtagPost

	teams, appErr := p.API.GetTeams()
	if appErr != nil {
		return nil, appErr
	}

	searchParams := []*model.SearchParams{{
		Terms:      "#" + tag,
		IsHashtag:  true,
		InChannels: []string{},
		FromUsers:  []string{},
	}}

	// Search in each team the user has access to
	for _, team := range teams {
		posts, appErr := p.API.SearchPostsInTeam(team.Id, searchParams)
		if appErr != nil {
			continue
		}

		for _, post := range posts {
			if user, appErr := p.API.GetUser(post.UserId); appErr == nil {
				// Skip if the user is a bot
				if user.IsBot {
					continue
				}
				
				// Check if the user has access to the channel where the post is
				if _, appErr := p.API.GetChannel(post.ChannelId); appErr == nil {
					result = append(result, HashtagPost{
						ID:        post.Id,
						Message:   post.Message,
						CreateAt:  post.CreateAt,
						Username:  user.Username,
						ChannelID: post.ChannelId,
					})
				}
			}
		}
	}

	// Sort posts by creation time, newest first
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreateAt > result[j].CreateAt
	})

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
	total := 0

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

				for _, m := range tagRe.FindAllStringSubmatch(post.Message, -1) {
					tag := m[2]
					counts[tag]++
				}
				total++
				if total >= max {
					break
				}
			}
			if total >= max {
				break
			}
			page++
		}
	}

	return formatHashtagCounts(counts)
}

func (p *Plugin) computeHashtags(channelID string, max int) ([]HashtagCount, error) {
	counts := map[string]int{}
	total := 0

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
			for _, m := range tagRe.FindAllStringSubmatch(post.Message, -1) {
				tag := m[2]
				counts[tag]++
			}
			total++
			if total >= max {
				break
			}
		}
		if total >= max {
			break
		}
		page++
	}

	return formatHashtagCounts(counts)
}