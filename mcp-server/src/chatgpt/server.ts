#!/usr/bin/env node
/**
 * GAS Executor MCP Server for ChatGPT
 *
 * HTTP-based MCP server with HTML UI widget support for ChatGPT Apps/Connectors.
 *
 * @version 1.0.0
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { GASClient, GASResponse } from '../gas-client.js';

// ========== Environment Configuration ==========
const GAS_ENDPOINT = process.env.GAS_ENDPOINT || '';
const GAS_API_KEY = process.env.GAS_API_KEY || '';
const PORT = parseInt(process.env.PORT || '3001', 10);

if (!GAS_ENDPOINT || !GAS_API_KEY) {
  console.error('Error: GAS_ENDPOINT and GAS_API_KEY environment variables are required');
  process.exit(1);
}

// ========== Initialize GAS Client ==========
const gasClient = new GASClient({
  endpoint: GAS_ENDPOINT,
  apiKey: GAS_API_KEY,
  timeout: 30000
});

// ========== HTML UI Widget Templates ==========
const WIDGET_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; background: #f5f5f5; }
  .container { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .icon { font-size: 24px; }
  .title { font-size: 18px; font-weight: 600; color: #333; }
  .result { background: #f0f7ff; border-radius: 8px; padding: 16px; margin-top: 12px; }
  .result pre { white-space: pre-wrap; word-break: break-word; font-size: 13px; color: #1a1a1a; }
  .success { border-left: 4px solid #22c55e; }
  .error { border-left: 4px solid #ef4444; background: #fff5f5; }
  .meta { font-size: 12px; color: #666; margin-top: 8px; }
  .emails { display: flex; flex-direction: column; gap: 12px; }
  .email-card { background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; }
  .email-subject { font-weight: 600; color: #333; margin-bottom: 4px; }
  .email-from { font-size: 13px; color: #666; }
  .email-snippet { font-size: 13px; color: #888; margin-top: 8px; }
`;

const WIDGET_SCRIPT = `
  const props = window.openai?.toolOutput || {};
  const meta = window.openai?.toolResponseMetadata || {};

  const container = document.getElementById('app');

  if (props.success) {
    container.innerHTML = \`
      <div class="container">
        <div class="header">
          <span class="icon">\${props.icon || '✅'}</span>
          <span class="title">\${props.title || 'Result'}</span>
        </div>
        <div class="result success">
          <pre>\${typeof props.result === 'string' ? props.result : JSON.stringify(props.result, null, 2)}</pre>
        </div>
        <div class="meta">Executed in \${props.executionTime || 0}ms</div>
      </div>
    \`;
  } else {
    container.innerHTML = \`
      <div class="container">
        <div class="header">
          <span class="icon">❌</span>
          <span class="title">Error</span>
        </div>
        <div class="result error">
          <pre>\${props.error || 'Unknown error'}</pre>
        </div>
      </div>
    \`;
  }
`;

const EMAIL_WIDGET_SCRIPT = `
  const props = window.openai?.toolOutput || {};
  const container = document.getElementById('app');

  if (props.success && Array.isArray(props.emails)) {
    const emailsHtml = props.emails.map(e => \`
      <div class="email-card">
        <div class="email-subject">\${e.subject || '(No Subject)'}</div>
        <div class="email-from">\${e.from || 'Unknown'}</div>
        <div class="email-snippet">\${e.snippet || ''}</div>
      </div>
    \`).join('');

    container.innerHTML = \`
      <div class="container">
        <div class="header">
          <span class="icon">📧</span>
          <span class="title">Inbox (\${props.emails.length} emails)</span>
        </div>
        <div class="emails">\${emailsHtml}</div>
      </div>
    \`;
  } else {
    container.innerHTML = '<div class="container"><p>No emails found</p></div>';
  }
`;

function createWidget(script: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${WIDGET_CSS}</style></head>
<body><div id="app"></div><script type="module">${script}</script></body>
</html>`;
}

// ========== Tool Definitions with UI Meta ==========
const tools: Tool[] = [
  {
    name: 'gas_execute',
    description: 'Execute custom JavaScript code in Google Apps Script environment. Has access to GmailApp, SpreadsheetApp, DriveApp, CalendarApp, DocumentApp, UrlFetchApp.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title for the script execution' },
        script: { type: 'string', description: 'JavaScript code to execute. Must include a return statement.' }
      },
      required: ['title', 'script']
    }
  },
  {
    name: 'gas_gmail_get_inbox',
    description: 'Get recent emails from Gmail inbox with a visual display.',
    inputSchema: {
      type: 'object',
      properties: {
        maxResults: { type: 'number', description: 'Number of emails to fetch (default: 10)' }
      }
    }
  },
  {
    name: 'gas_gmail_send',
    description: 'Send an email via Gmail.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'gas_sheets_read',
    description: 'Read data from a Google Spreadsheet.',
    inputSchema: {
      type: 'object',
      properties: {
        spreadsheetId: { type: 'string', description: 'Spreadsheet ID from URL' },
        range: { type: 'string', description: 'A1 notation range (e.g., Sheet1!A1:D10)' }
      },
      required: ['spreadsheetId', 'range']
    }
  },
  {
    name: 'gas_calendar_get_events',
    description: 'Get calendar events within a date range.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (ISO format)' },
        endDate: { type: 'string', description: 'End date (ISO format)' }
      }
    }
  }
];

// ========== MCP Resources (UI Widgets) ==========
const resources = [
  {
    uri: 'ui://widget/result.html',
    name: 'Result Widget',
    mimeType: 'text/html+skybridge' as const,
    description: 'Generic result display widget'
  },
  {
    uri: 'ui://widget/inbox.html',
    name: 'Inbox Widget',
    mimeType: 'text/html+skybridge' as const,
    description: 'Email inbox display widget'
  }
];

// ========== Server Setup ==========
const server = new Server(
  { name: 'gas-executor-chatgpt', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Add UI meta to tools for ChatGPT
  const toolsWithMeta = tools.map(tool => ({
    ...tool,
    _meta: {
      'openai/outputTemplate': tool.name === 'gas_gmail_get_inbox'
        ? 'ui://widget/inbox.html'
        : 'ui://widget/result.html'
    }
  }));
  return { tools: toolsWithMeta };
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources };
});

// Read resource (return HTML widget)
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  let html: string;
  if (uri === 'ui://widget/inbox.html') {
    html = createWidget(EMAIL_WIDGET_SCRIPT);
  } else {
    html = createWidget(WIDGET_SCRIPT);
  }

  return {
    contents: [{
      uri,
      mimeType: 'text/html+skybridge',
      text: html
    }]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    let structuredContent: Record<string, unknown> = {};

    switch (name) {
      case 'gas_execute':
        result = await gasClient.execute(args?.title as string, args?.script as string);
        structuredContent = {
          success: result.success,
          result: result.success ? result.result : undefined,
          error: !result.success ? (result as { error: string }).error : undefined,
          executionTime: result.success ? (result as { executionTime: number }).executionTime : 0,
          icon: '⚡',
          title: args?.title || 'Script Execution'
        };
        break;

      case 'gas_gmail_get_inbox':
        result = await gasClient.getInbox(args?.maxResults as number);
        structuredContent = {
          success: result.success,
          emails: result.success ? result.result : [],
          error: !result.success ? (result as { error: string }).error : undefined
        };
        break;

      case 'gas_gmail_send':
        result = await gasClient.sendEmail(
          args?.to as string,
          args?.subject as string,
          args?.body as string
        );
        structuredContent = {
          success: result.success,
          result: result.success ? 'Email sent successfully' : undefined,
          error: !result.success ? (result as { error: string }).error : undefined,
          icon: '📤',
          title: 'Email Sent'
        };
        break;

      case 'gas_sheets_read':
        result = await gasClient.readSpreadsheet(
          args?.spreadsheetId as string,
          args?.range as string
        );
        structuredContent = {
          success: result.success,
          result: result.success ? result.result : undefined,
          error: !result.success ? (result as { error: string }).error : undefined,
          icon: '📊',
          title: 'Spreadsheet Data'
        };
        break;

      case 'gas_calendar_get_events':
        result = await gasClient.getCalendarEvents(
          undefined,
          args?.startDate as string,
          args?.endDate as string
        );
        structuredContent = {
          success: result.success,
          result: result.success ? result.result : undefined,
          error: !result.success ? (result as { error: string }).error : undefined,
          icon: '📅',
          title: 'Calendar Events'
        };
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Return with ChatGPT-compatible structure
    return {
      structuredContent,
      content: [{
        type: 'text',
        text: result.success
          ? `Successfully executed ${name}`
          : `Error: ${(result as { error: string }).error}`
      }],
      _meta: {
        timestamp: new Date().toISOString(),
        toolName: name
      }
    };

  } catch (error) {
    return {
      structuredContent: {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
});

// ========== Express App ==========
const app = express();

// Enhanced CORS for ChatGPT
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Accept',
    'Mcp-Session-Id',
    'Last-Event-Id',
    'Origin'
  ],
  exposedHeaders: ['Mcp-Session-Id'],
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'gas-executor-chatgpt' });
});

// MCP endpoint
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID()
});

// Request logging middleware
app.use('/mcp', (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${timestamp}] ${req.method} /mcp`);
  console.log(`Origin: ${req.headers.origin || 'none'}`);
  console.log(`Accept: ${req.headers.accept || 'none'}`);
  console.log(`Session-Id: ${req.headers['mcp-session-id'] || 'none'}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  console.log('='.repeat(60));
  next();
});

app.all('/mcp', async (req, res) => {
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP Error:', error);
    // Return proper JSON-RPC error
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: error instanceof Error ? error.message : String(error)
      },
      id: null
    });
  }
});

// ========== Main ==========
async function main() {
  await server.connect(transport);

  app.listen(PORT, () => {
    console.log(`GAS Executor MCP Server (ChatGPT) running on http://localhost:${PORT}`);
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
    console.log(`Tools available: ${tools.length}`);
    console.log(`UI Widgets: ${resources.length}`);
  });
}

main().catch(console.error);
