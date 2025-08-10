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

type PaginatedHashtagResponse struct {
	Posts      []HashtagPost `json:"posts"`
	TotalCount int           `json:"total_count"`
	Page       int           `json:"page"`
	PerPage    int           `json:"per_page"`
	HasMore    bool          `json:"has_more"`
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

// GET /api/posts?tag=XXX&page=1&per_page=20
func (p *Plugin) handleGetTagPosts(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	tag := r.URL.Query().Get("tag")
	if tag == "" {
		http.Error(w, "tag is required", http.StatusBadRequest)
		return
	}

	channelID := r.URL.Query().Get("channel_id")
	
	// Parse pagination parameters
	page := r.URL.Query().Get("page")
	perPage := r.URL.Query().Get("per_page")
	
	pageNum := 1
	if page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			pageNum = p
		}
	}
	
	perPageNum := 20 // default
	if perPage != "" {
		if pp, err := strconv.Atoi(perPage); err == nil && pp > 0 && pp <= 100 {
			perPageNum = pp
		}
	}

	p.API.LogDebug("Getting posts for tag", "tag", tag, "channel_id", channelID, "page", pageNum, "per_page", perPageNum)

	// Get channel info for logging
	if channelID != "" {
		if channel, err := p.API.GetChannel(channelID); err == nil {
			p.API.LogDebug("Channel info", "name", channel.Name, "team_id", channel.TeamId)
		} else {
			p.API.LogError("Failed to get channel info", "error", err.Error())
		}
	}
	
	// Get all posts first, then paginate
	// TODO: Optimize this to paginate at database level in the future
	allPosts, err := p.getPostsWithHashtag(tag, channelID)
	if err != nil {
		p.API.LogError("Failed to get posts", "error", err.Error(), "tag", tag, "channel_id", channelID)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if allPosts == nil {
		allPosts = []HashtagPost{} // Return empty array instead of null
	}

	totalCount := len(allPosts)
	startIndex := (pageNum - 1) * perPageNum
	endIndex := startIndex + perPageNum

	// Ensure we don't exceed array bounds
	if startIndex >= totalCount {
		startIndex = totalCount
	}
	if endIndex > totalCount {
		endIndex = totalCount
	}

	var paginatedPosts []HashtagPost
	if startIndex < endIndex {
		paginatedPosts = allPosts[startIndex:endIndex]
	} else {
		paginatedPosts = []HashtagPost{}
	}

	hasMore := endIndex < totalCount
	
	response := PaginatedHashtagResponse{
		Posts:      paginatedPosts,
		TotalCount: totalCount,
		Page:       pageNum,
		PerPage:    perPageNum,
		HasMore:    hasMore,
	}

	p.API.LogDebug("Returning paginated posts", "total", totalCount, "page", pageNum, "per_page", perPageNum, "returned", len(paginatedPosts), "has_more", hasMore)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
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
