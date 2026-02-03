# ChatGPT Custom GPT Integration Guide

This guide explains how to integrate GAS Executor with ChatGPT Custom GPTs to enable natural language automation of Google services.

## Prerequisites

- Deployed GAS Executor Web App
- Valid API key from GAS Executor
- ChatGPT Plus subscription (for Custom GPT creation)

## Step 1: Prepare the OpenAPI Schema

Copy the following OpenAPI schema and update the deployment ID:

```yaml
openapi: 3.1.0
info:
  title: GAS Executor API
  description: Execute JavaScript in Google Apps Script environment
  version: 1.0.0
servers:
  - url: https://script.google.com
paths:
  /macros/s/{YOUR_DEPLOYMENT_ID}/exec:
    post:
      summary: Execute Custom Script
      description: Execute JavaScript code with Google services access
      operationId: executeScript
      x-openai-isConsequential: false
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExecuteScriptRequest'
      responses:
        "200":
          description: Successful execution
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExecuteScriptResponse'
components:
  schemas:
    ExecuteScriptRequest:
      type: object
      required:
        - title
        - script
        - apiKey
      properties:
        title:
          type: string
          description: Script description
        script:
          type: string
          description: JavaScript code to execute
        apiKey:
          type: string
          description: Your API key
    ExecuteScriptResponse:
      type: object
      properties:
        success:
          type: boolean
        result:
          type: string
        timestamp:
          type: string
        executionTime:
          type: number
```

## Step 2: Create Custom GPT

1. Go to [ChatGPT](https://chat.openai.com)
2. Click on "Explore GPTs" → "Create a GPT"
3. Choose "Configure" tab

### Basic Configuration

**Name:** Google Workspace Assistant (or your preference)

**Description:** 
```
Automate Google Workspace tasks using natural language. I can send emails, create documents, manage spreadsheets, and more through Google Apps Script.
```

**Instructions:**
```
You are a Google Apps Script automation assistant that helps users execute tasks in their Google Workspace environment.

When users ask you to perform tasks, you should:
1. Understand their intent
2. Write appropriate Google Apps Script code
3. Execute it using the executeScript action
4. Return the results in a user-friendly format

Available services:
- GmailApp: Send emails, search messages
- SpreadsheetApp: Create and manipulate spreadsheets
- DriveApp: Manage files and folders
- CalendarApp: Create and manage events
- DocumentApp: Create and edit documents
- FormApp: Create forms
- UrlFetchApp: Make HTTP requests

Important guidelines:
- Always include a return statement in scripts
- Handle errors gracefully
- Keep scripts concise and focused
- Explain what the script will do before executing
- Format results clearly for the user

Example tasks you can help with:
- Send emails with custom content
- Create and populate spreadsheets
- Search and organize files in Drive
- Schedule calendar events
- Generate reports from data
- Automate repetitive tasks
```

### Add Actions

1. Click "Create new action"
2. Choose "Import from URL" or paste the schema directly
3. Set Authentication to "None" (API key is included in request body)
4. Save the action

### Configure Conversation Starters

Add these examples:
- "Send an email to team@example.com about the meeting"
- "Create a spreadsheet with this month's sales data"
- "Find all PDFs in my Drive from last week"
- "Schedule a recurring meeting every Monday at 10 AM"

## Step 3: Configure API Key

In your Custom GPT instructions, you can either:

### Option A: Embed API Key (Private GPTs)
Add to instructions:
```
Use API key: YOUR_API_KEY_HERE
```

### Option B: Request from User (Shared GPTs)
Add to instructions:
```
Before executing scripts, ask the user for their API key if not provided.
Store it for the session and use it for all subsequent requests.
```

## Step 4: Test Your Integration

Test with simple commands:

1. **"What time is it?"**
   - Should execute: `return new Date().toString()`

2. **"Send a test email to myself"**
   - Should ask for email address
   - Execute email sending script

3. **"Create a simple spreadsheet"**
   - Should create and return spreadsheet URL

## Advanced Configuration

### Custom System Prompt

For specialized use cases, enhance the instructions:

```
You are an expert Google Apps Script developer specializing in [specific domain].

Additional capabilities:
- Data analysis and visualization
- Automated reporting
- Integration with external APIs
- Complex workflow automation

When handling requests:
1. Assess complexity and break into steps if needed
2. Optimize for performance
3. Include progress updates for long operations
4. Provide alternative approaches when applicable
```

### Error Handling

Add to instructions:
```
If a script fails:
1. Explain the error in simple terms
2. Suggest corrections
3. Offer to retry with modifications
4. Provide alternative approaches

Common issues to watch for:
- Permission errors
- Invalid IDs or references
- API quotas and limits
- Syntax errors in generated code
```

## Use Case Examples

### Email Automation Assistant
```
Focus on email-related tasks:
- Bulk email sending with templates
- Email parsing and data extraction
- Automated responses
- Email organization and labeling
```

### Data Analysis Assistant
```
Specialize in spreadsheet operations:
- Data import and cleaning
- Statistical analysis
- Chart generation
- Report creation
```

### Project Management Assistant
```
Integrate multiple services:
- Create project folders in Drive
- Set up tracking spreadsheets
- Schedule calendar events
- Send status update emails
```

## Best Practices

1. **Security**: Never log or display sensitive data
2. **Performance**: Batch operations when possible
3. **User Experience**: Provide clear feedback and progress updates
4. **Error Recovery**: Always have fallback options
5. **Documentation**: Explain what each script does

## Troubleshooting

### Common Issues

**"Script execution failed"**
- Check API key validity
- Verify deployment URL
- Review script syntax

**"Permission denied"**
- Ensure OAuth scopes are configured
- Check resource access permissions

**"Timeout errors"**
- Break long operations into chunks
- Use batch methods
- Implement progress reporting

### Debug Mode

Add to instructions for debugging:
```
When in debug mode (user requests):
1. Show the exact script being executed
2. Display raw API responses
3. Include execution timing
4. Log intermediate steps
```

## Examples of Natural Language Commands

### Email Tasks
- "Send a follow-up email to the team about yesterday's meeting"
- "Find all unread emails from this week and summarize them"
- "Create a draft email with the quarterly report attached"

### Spreadsheet Tasks
- "Create a budget tracker with categories for this month"
- "Add these sales figures to the existing report"
- "Calculate the average of column B and add it to a new sheet"

### Calendar Tasks
- "Schedule a 30-minute meeting with John next Tuesday"
- "Find all meetings this week and export to a spreadsheet"
- "Create a recurring event for team standup"

### Drive Tasks
- "Organize all PDFs into a new folder called 'Archives'"
- "Share the latest presentation with the marketing team"
- "Find all files modified in the last 24 hours"

## Conclusion

With this integration, ChatGPT becomes a powerful interface for Google Workspace automation. Users can accomplish complex tasks using natural language, making automation accessible to non-programmers.