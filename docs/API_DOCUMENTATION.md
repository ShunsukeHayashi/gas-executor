# GAS Executor API Documentation

## Overview

The GAS Executor API provides a secure webhook endpoint for executing JavaScript code within the Google Apps Script environment. This enables automated workflows and integration with Google services like Gmail, Drive, Calendar, and Sheets.

## Base URL

```
https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
```

Current deployment:
```
https://script.google.com/macros/s/AKfycbz0B_QiTTqmw55XQhPU4ElyQKCRQZTPjrHd3Vg9F0pIvyHFBOWlreUPwZvVVSJN8b0a/exec
```

## Authentication

All requests require an API key. API keys can be created through the Google Sheets interface.

### Creating an API Key

1. Open the associated Google Sheets
2. Navigate to **GAS Interpreter Menu** → **Create API Key**
3. Enter a unique identifier (e.g., "production", "development")
4. Store the generated UUID securely

## Endpoints

### Execute Script

Execute custom JavaScript code with access to Google Apps Script services.

**Endpoint:** `POST /exec`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "apiKey": "string (required) - Your API key UUID",
  "title": "string (required) - Short description of the script",
  "script": "string (required) - JavaScript code to execute"
}
```

**Response:**

Success (200 OK):
```json
{
  "success": true,
  "result": "any - The return value from your script",
  "timestamp": "string - ISO 8601 timestamp",
  "executionTime": "number - Milliseconds taken to execute"
}
```

Error (400/500):
```json
{
  "success": false,
  "error": "string - Error description",
  "statusCode": "number - HTTP status code",
  "timestamp": "string - ISO 8601 timestamp"
}
```

## Available Services

Your scripts have access to the following Google Apps Script services:

- **SpreadsheetApp** - Create and manipulate Google Sheets
- **GmailApp** - Send emails and manage Gmail
- **DriveApp** - Access and manage Google Drive files
- **CalendarApp** - Create and manage calendar events
- **DocumentApp** - Create and edit Google Docs
- **FormApp** - Create and manage Google Forms
- **UrlFetchApp** - Make HTTP requests
- **Utilities** - Various utility functions
- **Standard JavaScript objects**: Date, JSON, Math, Array, Object

## Code Examples

### Basic Example
```javascript
// Return current timestamp
return new Date().toISOString();
```

### Send Email
```javascript
const recipient = "user@example.com";
const subject = "Automated Report";
const body = "This is an automated email from GAS Executor.";
GmailApp.sendEmail(recipient, subject, body);
return `Email sent to ${recipient}`;
```

### Create Spreadsheet
```javascript
const ss = SpreadsheetApp.create("Sales Report " + new Date().toLocaleDateString());
const sheet = ss.getActiveSheet();
sheet.appendRow(["Date", "Product", "Quantity", "Revenue"]);
sheet.appendRow([new Date(), "Widget A", 10, 250.00]);
return ss.getUrl();
```

### Fetch External Data
```javascript
const response = UrlFetchApp.fetch("https://api.example.com/data");
const data = JSON.parse(response.getContentText());
return data;
```

### Search Gmail
```javascript
const threads = GmailApp.search("is:unread", 0, 10);
const emails = threads.map(thread => ({
  subject: thread.getFirstMessageSubject(),
  from: thread.getMessages()[0].getFrom(),
  date: thread.getLastMessageDate()
}));
return emails;
```

### Create Calendar Event
```javascript
const event = CalendarApp.getDefaultCalendar().createEvent(
  'Team Meeting',
  new Date('2024-01-15 10:00'),
  new Date('2024-01-15 11:00'),
  {
    description: 'Weekly team sync',
    location: 'Conference Room A'
  }
);
return `Event created: ${event.getTitle()}`;
```

## Error Handling

### Common Error Codes

- **400 Bad Request**: Invalid request format or missing required fields
- **401 Unauthorized**: Invalid or missing API key
- **422 Validation Error**: Request validation failed
- **429 Too Many Requests**: Rate limit exceeded (future implementation)
- **500 Internal Server Error**: Script execution error or service failure

### Error Types

1. **Syntax Error**: JavaScript syntax is invalid
2. **Reference Error**: Accessing undefined variables
3. **Type Error**: Type mismatch in operations
4. **Permission Error**: Insufficient permissions for requested operation

## Best Practices

### 1. Always Return Values
```javascript
// Good
const result = performOperation();
return result;

// Bad - no return value
performOperation();
```

### 2. Handle Errors Gracefully
```javascript
try {
  const data = SpreadsheetApp.openById(id).getDataRange().getValues();
  return data;
} catch (error) {
  return `Error accessing spreadsheet: ${error.message}`;
}
```

### 3. Use Descriptive Titles
```javascript
{
  "title": "Daily Sales Report Generator",  // Good
  "title": "Script 1"                       // Bad
}
```

### 4. Limit Execution Time
Keep scripts concise to avoid timeouts. Break large operations into smaller chunks.

### 5. Test in Small Steps
Test individual operations before combining them into complex workflows.

## Rate Limits

Currently, there are no enforced rate limits, but please use the API responsibly:
- Avoid excessive requests
- Implement retry logic with exponential backoff
- Cache results when possible

## Security Considerations

1. **API Key Security**: Never expose API keys in client-side code or public repositories
2. **Script Validation**: All scripts are executed with the permissions of the deployment user
3. **Data Privacy**: Ensure scripts don't expose sensitive data in responses
4. **Logging**: All executions are logged with timestamps and results

## Troubleshooting

### Script Doesn't Execute
- Verify API key is valid
- Check script syntax
- Ensure all required services are available

### Permission Errors
- The deployment user must have access to requested resources
- Some operations require specific OAuth scopes

### Timeout Issues
- Scripts have a maximum execution time
- Break long operations into smaller chunks
- Use batch operations where available

## Support

For issues or questions:
- Create an issue on [GitHub](https://github.com/ShunsukeHayashi/gas-executor)
- Check existing documentation and examples
- Review execution logs in Google Sheets