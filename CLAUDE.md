# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Google Apps Script (GAS) Executor project that provides a secure API for remote JavaScript execution within the Google ecosystem. The system includes API key management, webhook endpoints, and comprehensive logging.

## Development Commands

### Local Development with clasp
```bash
# Pull latest changes from GAS
npm run pull

# Push local changes to GAS
npm run push

# Watch files and auto-push changes
npm run watch

# View execution logs
npm run logs

# Deploy new version
npm run deploy

# Open in GAS editor
npm run open
```

## Architecture

### Core Components

1. **Webhook Handler** (`doPost` in コード.js)
   - Accepts POST requests at: `/macros/s/{SCRIPT_ID}/exec`
   - Validates API keys before execution
   - Executes arbitrary JavaScript in GAS environment
   - Returns JSON responses with success/error status

2. **API Key System**
   - Keys stored in Script Properties (secure Google storage)
   - UUID-based generation
   - CRUD operations via UI menu or programmatically

3. **Logging System**
   - All executions logged to "Log" sheet
   - Includes: title, script, result, status, timestamp, API key identifier
   - Conditional formatting for success/failure visualization

### Request/Response Format

**Request:**
```json
{
  "apiKey": "valid-uuid-key",
  "title": "Script Title",
  "script": "JavaScript code here"
}
```

**Success Response:**
```json
{
  "success": true,
  "result": "execution result"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "error message"
}
```

## Google Services Integration

The project has OAuth scopes for:
- External HTTP requests
- YouTube (read/write)
- Google Drive
- Google Docs

Advanced services enabled:
- Drive API v3
- Docs API v1
- YouTube Data API v3
- YouTube Analytics API v2

## Client AI Agent Instructions

When using this GAS Executor as an AI agent for automating Google services:

### Coding Standards
- **Always include return statement**: Every script must end with a return statement
- **No function declarations**: Write code directly without wrapping in functions
- **Return informative results**: Include as much detail as possible in return values

### Example Scripts

**Send Email:**
```javascript
const recipient = "email@example.com";
const subject = "Test Subject";
const body = "Email body";
GmailApp.sendEmail(recipient, subject, body);
return `Email sent to ${recipient}`;
```

**Search Recent Emails:**
```javascript
const threads = GmailApp.getInboxThreads(0, 5);
const emails = threads.map(thread => {
  const lastMessage = thread.getMessages().pop();
  return {
    subject: lastMessage.getSubject(),
    from: lastMessage.getFrom(),
    date: lastMessage.getDate().toString(),
    body: lastMessage.getPlainBody().slice(0, 150)
  };
});
return JSON.stringify(emails);
```

**Create Spreadsheet:**
```javascript
const spreadsheet = SpreadsheetApp.create("New Sheet");
const sheet = spreadsheet.getActiveSheet();
const data = [["Name", "Value"], ["Item1", "100"], ["Item2", "200"]];
sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
return `Sheet created: ${spreadsheet.getUrl()}`;
```

### Error Handling
- Scripts that fail will be automatically logged with error details
- API returns structured error responses for debugging
- All executions are tracked in the Log sheet

## Security Notes

- API keys are required for all webhook requests
- Keys are stored securely in Google Script Properties
- Anonymous access is allowed but controlled via API keys
- All script executions are logged with timestamp and identifier