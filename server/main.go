package main

import (
	"github.com/mattermost/mattermost/server/public/plugin"
)

type Plugin struct {
	plugin.MattermostPlugin
}

// Main ServeHTTP implementation is in api.go

func main() {
	plugin.ClientMain(&Plugin{})
}