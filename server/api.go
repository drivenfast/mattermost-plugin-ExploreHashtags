package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/mattermost/mattermost/server/public/plugin"
)

type HashtagCount struct {
	Tag   string `json:"tag"`
	Count int    `json:"count"`
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
func (p *Plugin) handleHashtagPosts(w http.ResponseWriter, r *http.Request) {
	tag := r.URL.Query().Get("tag")
	if tag == "" {
		http.Error(w, "tag required", http.StatusBadRequest)
		return
	}

	posts, err := p.getPostsWithHashtag(tag)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(posts)
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
		p.handleHashtagPosts(w, r)
	default:
		http.NotFound(w, r)
	}
}
