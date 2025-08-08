PLUGIN_ID=com.ecf.hashtags
PLUGIN_VERSION=1.0.0

.PHONY: all clean server webapp dist

all: dist

server/dist/plugin-%: 
	@mkdir -p server/dist
	cd server && GOOS=$(word 1,$(subst -, ,$*)) GOARCH=$(word 2,$(subst -, ,$*)) \
	  go build -o dist/plugin-$(*) .

webapp/dist/main.js:
	cd webapp && npm ci && npm run build

dist: server/dist/plugin-linux-amd64 server/dist/plugin-darwin-amd64 server/dist/plugin-darwin-arm64 webapp/dist/main.js
	@mkdir -p dist
	tar -czf dist/$(PLUGIN_ID)-$(PLUGIN_VERSION).tar.gz \
	  plugin.json webapp/dist/main.js \
	  server/dist/plugin-linux-amd64 server/dist/plugin-darwin-amd64 server/dist/plugin-darwin-arm64
	@echo "Built dist/$(PLUGIN_ID)-$(PLUGIN_VERSION).tar.gz"

clean:
	rm -rf server/dist webapp/dist dist

install:
	@echo "Installing plugin dependencies..."
	cd server && go mod tidy
	cd webapp && npm install
