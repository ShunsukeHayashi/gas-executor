# GAS Executor - Local Development

This project is a Google Apps Script application for API key management and script execution.

## Development Setup

### Prerequisites
- Node.js and npm installed
- Google account with access to the Apps Script project
- clasp CLI tool (already installed globally)

### Initial Setup
```bash
# Install dependencies
npm install

# Project has already been cloned with:
# clasp clone 11rmlSwoAwNaimK7mEWOhAMrWA1ctivqQVDWFEhTe0bbsRBFyRDe7mJXW
```

### Development Workflow

#### Pull Latest Changes
```bash
npm run pull
# or
clasp pull
```

#### Push Changes to Google Apps Script
```bash
npm run push
# or
clasp push
```

#### Watch for Changes and Auto-push
```bash
npm run watch
# or
clasp push --watch
```

#### Open in Google Apps Script Editor
```bash
npm run open
# or
clasp open
```

#### View Logs
```bash
npm run logs
# or
clasp logs
```

#### Deploy New Version
```bash
npm run deploy
# or
clasp deploy --description "Your deployment description"
```

#### View Version History
```bash
npm run versions
# or
clasp versions
```

## Project Structure
- `appsscript.json` - Google Apps Script manifest file
- `コード.js` - Main script file (Code.js)
- `.claspignore` - Files to ignore when pushing to GAS
- `.clasp.json` - Clasp configuration (auto-generated)

## Features
- API Key Management System
- Script Execution via Webhook
- Logging to Google Sheets
- Google Services Integration (Drive, Docs, YouTube)

## Important Notes
- Always pull before making changes to avoid conflicts
- Test locally when possible before pushing
- Use meaningful deployment descriptions
- Keep API keys secure and never commit them to version control