# Contributing to Mattermost Aggregate Hashtags Plugin

👍 First off, thanks for taking the time to contribute!

## Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the build process (`make clean && make dist`)
5. Test your changes thoroughly
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to your branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## Build Process

### Prerequisites

Make sure you have the following installed:
- Go 1.16 or later
- Node.js 14 or later
- Make

### Building

1. Install server dependencies:
   ```bash
   cd server
   go mod download
   ```

2. Install webapp dependencies:
   ```bash
   cd webapp
   npm install
   ```

3. Build the plugin:
   ```bash
   make clean && make dist
   ```

### Testing

1. Build the plugin
2. Upload to your Mattermost instance
3. Test both channel and team-wide hashtag views
4. Verify hashtag grouping functionality
5. Test with and without bot messages
6. Check both desktop and mobile views

## Code Style

### Go
- Follow the standard Go formatting guidelines
- Use meaningful variable and function names
- Add comments for complex logic
- Handle errors appropriately

### TypeScript/React
- Follow the ESLint configuration
- Use functional components with hooks
- Keep components focused and single-responsibility
- Document props with TypeScript interfaces

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the version number in plugin.json
3. The PR will be merged once you have the sign-off of at least one other developer
4. Make sure the build passes and there are no lint errors

## Release Process

1. Update the version in plugin.json
2. Create a new tag matching the version
3. Push the tag
4. Create a new release on GitHub
5. Upload the built plugin to the release

## Questions?

Feel free to open an issue if you have any questions or need clarification!
