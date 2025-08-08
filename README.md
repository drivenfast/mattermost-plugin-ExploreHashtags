# Mattermost Aggregate Hashtags Plugin

A Mattermost plugin that provides enhanced hashtag functionality with grouping and team-wide visibility features.

## Features

- View hashtags used in the current channel
- View hashtags across the entire team
- Group related hashtags by prefix (e.g., "project-frontend" and "project-backend" are grouped under "project")
- Filter out bot messages from hashtag counts
- Sort hashtags by usage count
- Click on hashtags to view all messages using that tag

## Installation

1. Download the latest release from the [releases page](https://github.com/drivenfast/mattermost-plugin-ExploreHashtags/releases)
2. Upload the plugin to your Mattermost instance:
   - Go to **System Console > Plugins > Plugin Management**
   - Upload the plugin file
   - Click "Enable" to activate the plugin

## Usage

### Viewing Hashtags

1. Click on the hashtag icon in the channel header to open the hashtag sidebar
2. Switch between "This Channel" and "Entire Team" views using the tabs
3. Expand/collapse hashtag groups by clicking on the group headers
4. Click on any hashtag to view all messages using that tag

### Hashtag Grouping

Hashtags are automatically grouped based on their prefix (text before the hyphen):
- `project-frontend` and `project-backend` → grouped under "project"
- `team-alpha` and `team-beta` → grouped under "team"
- Hashtags without hyphens are listed individually

## Development

### Prerequisites

- Go 1.16 or later
- Node.js 14 or later
- Make
- Mattermost Server 5.37 or later

### Building

1. Clone the repository:
   ```bash
   git clone https://github.com/drivenfast/mattermost-plugin-ExploreHashtags.git
   cd mattermost-plugin-aggregatehashtags
   ```

2. Build the plugin:
   ```bash
   make dist
   ```

The built plugin will be available in `dist/com.ecf.hashtags-1.0.0.tar.gz`.

### Development Workflow

1. Make changes to the server-side code in the `server/` directory
2. Make changes to the webapp code in the `webapp/` directory
3. Build and deploy:
   ```bash
   make clean && make dist
   ```
4. Upload the new version to your Mattermost instance

## Configuration

No additional configuration is required. The plugin works out of the box.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your fork
5. Create a Pull Request
