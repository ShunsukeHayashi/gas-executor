#!/usr/bin/env node
/**
 * GAS Executor MCP Server
 *
 * A Model Context Protocol server for executing JavaScript in Google Apps Script.
 * Provides tools for automating Google Workspace: Gmail, Drive, Sheets, Docs, Calendar.
 *
 * @version 1.0.0
 * @author Shunsuke Hayashi
 * @license MIT
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { GASClient } from './gas-client.js';

// ========== Environment Configuration ==========
const GAS_ENDPOINT = process.env.GAS_ENDPOINT || '';
const GAS_API_KEY = process.env.GAS_API_KEY || '';

if (!GAS_ENDPOINT || !GAS_API_KEY) {
  console.error('Error: GAS_ENDPOINT and GAS_API_KEY environment variables are required');
  console.error('Set them in your environment or MCP server configuration:');
  console.error('  GAS_ENDPOINT=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec');
  console.error('  GAS_API_KEY=your-uuid-api-key');
  process.exit(1);
}

// ========== Initialize GAS Client ==========
const gasClient = new GASClient({
  endpoint: GAS_ENDPOINT,
  apiKey: GAS_API_KEY,
  timeout: parseInt(process.env.GAS_TIMEOUT || '30000', 10)
});

// ========== Tool Definitions ==========
const tools: Tool[] = [
  // Core execution tool
  {
    name: 'gas_execute',
    description: 'Execute custom JavaScript code in Google Apps Script environment. Has access to all GAS APIs: SpreadsheetApp, GmailApp, DriveApp, CalendarApp, DocumentApp, UrlFetchApp, etc. Script must include a return statement.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title/identifier for the script execution (for logging)' },
        script: { type: 'string', description: 'JavaScript code to execute. Must include a return statement.' }
      },
      required: ['title', 'script']
    }
  },

  // Gmail tools
  {
    name: 'gas_gmail_send',
    description: 'Send an email via Gmail. Supports plain text or HTML body.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body (plain text or HTML)' },
        htmlBody: { type: 'boolean', description: 'If true, body is treated as HTML' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'gas_gmail_search',
    description: 'Search Gmail using Gmail search syntax (e.g., "from:example@gmail.com", "is:unread", "subject:meeting").',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Gmail search query' },
        maxResults: { type: 'number', description: 'Maximum number of threads to return (default: 10)' }
      },
      required: ['query']
    }
  },
  {
    name: 'gas_gmail_get_inbox',
    description: 'Get recent emails from Gmail inbox.',
    inputSchema: {
      type: 'object',
      properties: {
        maxResults: { type: 'number', description: 'Number of recent threads to fetch (default: 10)' }
      }
    }
  },

  // Google Sheets tools
  {
    name: 'gas_sheets_read',
    description: 'Read data from a Google Spreadsheet. Returns a 2D array of cell values.',
    inputSchema: {
      type: 'object',
      properties: {
        spreadsheetId: { type: 'string', description: 'Spreadsheet ID (from URL)' },
        range: { type: 'string', description: 'A1 notation range (e.g., "Sheet1!A1:D10")' }
      },
      required: ['spreadsheetId', 'range']
    }
  },
  {
    name: 'gas_sheets_write',
    description: 'Write data to a Google Spreadsheet. Accepts a 2D array of values.',
    inputSchema: {
      type: 'object',
      properties: {
        spreadsheetId: { type: 'string', description: 'Spreadsheet ID (from URL)' },
        range: { type: 'string', description: 'A1 notation range (e.g., "Sheet1!A1")' },
        values: { type: 'array', description: 'Two-dimensional array of values to write' }
      },
      required: ['spreadsheetId', 'range', 'values']
    }
  },
  {
    name: 'gas_sheets_create',
    description: 'Create a new Google Spreadsheet.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the new spreadsheet' }
      },
      required: ['name']
    }
  },

  // Google Drive tools
  {
    name: 'gas_drive_list',
    description: 'List files in Google Drive. Can filter by folder ID or search query.',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'Folder ID to list files from (optional)' },
        query: { type: 'string', description: 'Search query for files' },
        maxResults: { type: 'number', description: 'Maximum number of files to return (default: 100)' }
      }
    }
  },
  {
    name: 'gas_drive_get_file',
    description: 'Get detailed information about a file in Google Drive.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'File ID to retrieve' }
      },
      required: ['fileId']
    }
  },
  {
    name: 'gas_drive_create_folder',
    description: 'Create a new folder in Google Drive.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the new folder' },
        parentId: { type: 'string', description: 'Parent folder ID (optional)' }
      },
      required: ['name']
    }
  },

  // Google Calendar tools
  {
    name: 'gas_calendar_get_events',
    description: 'Get calendar events within a date range.',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: 'Calendar ID (default: primary)' },
        startDate: { type: 'string', description: 'Start date (ISO format)' },
        endDate: { type: 'string', description: 'End date (ISO format)' },
        maxResults: { type: 'number', description: 'Maximum events to return (default: 50)' }
      }
    }
  },
  {
    name: 'gas_calendar_create_event',
    description: 'Create a new calendar event.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        startTime: { type: 'string', description: 'Start time (ISO format)' },
        endTime: { type: 'string', description: 'End time (ISO format)' },
        description: { type: 'string', description: 'Event description' },
        calendarId: { type: 'string', description: 'Calendar ID (default: primary)' }
      },
      required: ['title', 'startTime', 'endTime']
    }
  },

  // Google Docs tools
  {
    name: 'gas_docs_create',
    description: 'Create a new Google Document.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Document name' },
        content: { type: 'string', description: 'Initial content (optional)' }
      },
      required: ['name']
    }
  },
  {
    name: 'gas_docs_get_content',
    description: 'Get the content of a Google Document.',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Document ID' }
      },
      required: ['documentId']
    }
  },

  // Utility tools
  {
    name: 'gas_fetch_url',
    description: 'Make an HTTP request from Google Apps Script. Useful for accessing APIs that require server-side requests.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
        method: { type: 'string', description: 'HTTP method (default: GET)' },
        payload: { type: 'object', description: 'Request payload for POST/PUT' },
        headers: { type: 'object', description: 'Custom headers' }
      },
      required: ['url']
    }
  }
];

// ========== Tool Handler ==========
interface ToolArgs {
  // gas_execute
  title?: string;
  script?: string;

  // gmail
  to?: string;
  subject?: string;
  body?: string;
  htmlBody?: boolean;
  query?: string;
  maxResults?: number;

  // sheets
  spreadsheetId?: string;
  range?: string;
  values?: unknown[][];
  name?: string;

  // drive
  folderId?: string;
  fileId?: string;
  parentId?: string;

  // calendar
  calendarId?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  description?: string;

  // docs
  documentId?: string;
  content?: string;

  // fetch
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload?: object;
  headers?: Record<string, string>;
}

async function handleTool(name: string, args: ToolArgs): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    let result;

    switch (name) {
      // Core execution
      case 'gas_execute':
        if (!args.title || !args.script) {
          throw new Error('title and script are required');
        }
        result = await gasClient.execute(args.title, args.script);
        break;

      // Gmail
      case 'gas_gmail_send':
        if (!args.to || !args.subject || !args.body) {
          throw new Error('to, subject, and body are required');
        }
        result = await gasClient.sendEmail(args.to, args.subject, args.body, args.htmlBody);
        break;

      case 'gas_gmail_search':
        if (!args.query) {
          throw new Error('query is required');
        }
        result = await gasClient.searchGmail(args.query, args.maxResults);
        break;

      case 'gas_gmail_get_inbox':
        result = await gasClient.getInbox(args.maxResults);
        break;

      // Sheets
      case 'gas_sheets_read':
        if (!args.spreadsheetId || !args.range) {
          throw new Error('spreadsheetId and range are required');
        }
        result = await gasClient.readSpreadsheet(args.spreadsheetId, args.range);
        break;

      case 'gas_sheets_write':
        if (!args.spreadsheetId || !args.range || !args.values) {
          throw new Error('spreadsheetId, range, and values are required');
        }
        result = await gasClient.writeSpreadsheet(args.spreadsheetId, args.range, args.values);
        break;

      case 'gas_sheets_create':
        if (!args.name) {
          throw new Error('name is required');
        }
        result = await gasClient.createSpreadsheet(args.name);
        break;

      // Drive
      case 'gas_drive_list':
        result = await gasClient.listDriveFiles(args.folderId, args.query, args.maxResults);
        break;

      case 'gas_drive_get_file':
        if (!args.fileId) {
          throw new Error('fileId is required');
        }
        result = await gasClient.getDriveFile(args.fileId);
        break;

      case 'gas_drive_create_folder':
        if (!args.name) {
          throw new Error('name is required');
        }
        result = await gasClient.createDriveFolder(args.name, args.parentId);
        break;

      // Calendar
      case 'gas_calendar_get_events':
        result = await gasClient.getCalendarEvents(
          args.calendarId,
          args.startDate,
          args.endDate,
          args.maxResults
        );
        break;

      case 'gas_calendar_create_event':
        if (!args.title || !args.startTime || !args.endTime) {
          throw new Error('title, startTime, and endTime are required');
        }
        result = await gasClient.createCalendarEvent(
          args.title,
          args.startTime,
          args.endTime,
          args.description,
          args.calendarId
        );
        break;

      // Docs
      case 'gas_docs_create':
        if (!args.name) {
          throw new Error('name is required');
        }
        result = await gasClient.createDoc(args.name, args.content);
        break;

      case 'gas_docs_get_content':
        if (!args.documentId) {
          throw new Error('documentId is required');
        }
        result = await gasClient.getDocContent(args.documentId);
        break;

      // Fetch
      case 'gas_fetch_url':
        if (!args.url) {
          throw new Error('url is required');
        }
        result = await gasClient.fetchUrl(args.url, args.method, args.payload, args.headers);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Format the response
    if (result.success) {
      const output = typeof result.result === 'string'
        ? result.result
        : JSON.stringify(result.result, null, 2);

      return {
        content: [{
          type: 'text',
          text: `Success (${result.executionTime}ms):\n${output}`
        }]
      };
    } else {
      return {
        content: [{
          type: 'text',
          text: `Error (${result.statusCode}): ${result.error}`
        }]
      };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

// ========== Server Setup ==========
const server = new Server(
  {
    name: 'gas-executor-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleTool(name, (args || {}) as ToolArgs);
});

// ========== Main ==========
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GAS Executor MCP Server running on stdio');
  console.error(`Endpoint: ${GAS_ENDPOINT.substring(0, 50)}...`);
  console.error(`Tools available: ${tools.length}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
