package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/mattermost/mattermost/server/public/plugin"
)

type HashtagCount struct {
	Tag      string `json:"tag"`
	Count    int    `json:"count"`
	CreateAt int64  `json:"createAt"`
	LastUsed int64  `json:"lastUsed"`
}

type HashtagPost struct {
	ID        string `json:"id"`
	Message   string `json:"message"`
	CreateAt  int64  `json:"create_at"`
	Username  string `json:"username"`
	ChannelID string `json:"channel_id"`
}

type HashtagResponse struct {
	Hashtags []HashtagCount `json:"hashtags"`
	Groups   []HashtagGroup `json:"groups"`
}

// GET /api/hashtags?channel_id=XXX&limit=200
func (p *Plugin) handleHashtags(w http.ResponseWriter, r *http.Request) {
	channelID := r.URL.Query().Get("channel_id")
	if channelID == "" {
		http.Error(w, "channel_id required", http.StatusBadRequest)
		return
	}

	hashtags, err := p.computeHashtags(channelID, 5000) // scan up to N recent posts; tune as needed
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	groups := groupHashtagsByPrefix(hashtags)
	response := HashtagResponse{
		Hashtags: hashtags,
		Groups:   groups,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		p.API.LogError("Failed to write response", "error", err.Error())
	}
}

// GET /api/posts?tag=XXX
func (p *Plugin) handleGetTagPosts(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	tag := r.URL.Query().Get("tag")
	if tag == "" {
		http.Error(w, "tag is required", http.StatusBadRequest)
		return
	}

	channelID := r.URL.Query().Get("channel_id")
	p.API.LogDebug("Getting posts for tag", "tag", tag, "channel_id", channelID)

	// Get channel info for logging
	if channelID != "" {
		if channel, err := p.API.GetChannel(channelID); err == nil {
			p.API.LogDebug("Channel info", "name", channel.Name, "team_id", channel.TeamId)
		} else {
			p.API.LogError("Failed to get channel info", "error", err.Error())
		}
	}
	
	posts, err := p.getPostsWithHashtag(tag, channelID)
	if err != nil {
		p.API.LogError("Failed to get posts", "error", err.Error(), "tag", tag, "channel_id", channelID)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if posts == nil {
		p.API.LogDebug("No posts found", "tag", tag, "channel_id", channelID)
		posts = []HashtagPost{} // Return empty array instead of null
	} else {
		p.API.LogDebug("Found posts", "count", len(posts), "tag", tag, "channel_id", channelID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// GET /api/team_hashtags?team_id=XXX&max=1000
func (p *Plugin) handleTeamHashtags(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	teamID := r.URL.Query().Get("team_id")
	p.API.LogDebug("Received team_id", "team_id", teamID)
	
	if teamID == "" {
		http.Error(w, "Missing team_id parameter", http.StatusBadRequest)
		return
	}

	maxStr := r.URL.Query().Get("max")
	max := 1000
	if maxStr != "" {
		var err error
		max, err = strconv.Atoi(maxStr)
		if err != nil {
			http.Error(w, "Invalid max parameter", http.StatusBadRequest)
			return
		}
	}

	hashtags, err := p.computeTeamHashtags(teamID, max)
	if err != nil {
		p.API.LogError("Failed to compute team hashtags", "error", err.Error(), "team_id", teamID)
		http.Error(w, fmt.Sprintf("Internal error: %v", err), http.StatusInternalServerError)
		return
	}

	groups := groupHashtagsByPrefix(hashtags)
	response := HashtagResponse{
		Hashtags: hashtags,
		Groups:   groups,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		p.API.LogError("Failed to write response", "error", err.Error())
	}
}

// ServeHTTP handles HTTP requests to the plugin
func (p *Plugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/api/hashtags":
		p.handleHashtags(w, r)
	case "/api/team_hashtags":
		p.handleTeamHashtags(w, r)
	case "/api/posts":
		p.handleGetTagPosts(c, w, r)
	default:
		http.NotFound(w, r)
	}
}
