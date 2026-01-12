/**
 * GAS Executor MCP Server - Type Definitions
 * Based on OpenAPI schema from gas-executor
 */

import { z } from 'zod';

// ========== Request/Response Types ==========

/**
 * Request to execute a script via GAS Executor
 */
export interface ExecuteScriptRequest {
  /** Short title/identifier for the script execution */
  title: string;
  /** JavaScript code to execute in Google Apps Script environment */
  script: string;
  /** API key for authentication */
  apiKey: string;
}

/**
 * Successful script execution response
 */
export interface ExecuteScriptResponse {
  success: true;
  /** Return value from the executed script */
  result: unknown;
  /** ISO timestamp of execution */
  timestamp: string;
  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * Error response from script execution
 */
export interface ErrorResponse {
  success: false;
  /** Error message */
  error: string;
  /** HTTP status code */
  statusCode: number;
  /** ISO timestamp of the error */
  timestamp: string;
}

export type GASResponse = ExecuteScriptResponse | ErrorResponse;

// ========== Zod Schemas for Validation ==========

export const ExecuteScriptRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  script: z.string().min(1, 'Script is required').max(100000, 'Script too long'),
  apiKey: z.string().uuid('Invalid API key format')
});

export const ExecuteScriptResponseSchema = z.object({
  success: z.literal(true),
  result: z.unknown(),
  timestamp: z.string(),
  executionTime: z.number()
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  statusCode: z.number(),
  timestamp: z.string()
});

// ========== Tool Input Schemas (JSON Schema format for MCP) ==========

// Helper type for JSON Schema
type JSONSchema = {
  type: string;
  properties?: Record<string, object>;
  required?: string[];
};

function schema(def: JSONSchema): JSONSchema {
  return def;
}

export const GAS_TOOLS_SCHEMA: Record<string, JSONSchema> = {
  // Core execution tool
  gas_execute: schema({
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Short title/identifier for the script execution (for logging)'
      },
      script: {
        type: 'string',
        description: 'JavaScript code to execute. Must include a return statement. Has access to Google Apps Script APIs: SpreadsheetApp, GmailApp, DriveApp, CalendarApp, DocumentApp, UrlFetchApp, etc.'
      }
    },
    required: ['title', 'script']
  }),

  // Gmail tools
  gas_gmail_send: schema({
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient email address' },
      subject: { type: 'string', description: 'Email subject' },
      body: { type: 'string', description: 'Email body (plain text or HTML)' },
      htmlBody: { type: 'boolean', description: 'If true, body is treated as HTML' }
    },
    required: ['to', 'subject', 'body']
  }),

  gas_gmail_search: schema({
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Gmail search query (e.g., "from:example@gmail.com", "is:unread")' },
      maxResults: { type: 'number', description: 'Maximum number of threads to return (default: 10)' }
    },
    required: ['query']
  }),

  gas_gmail_get_inbox: schema({
    type: 'object',
    properties: {
      maxResults: { type: 'number', description: 'Number of recent threads to fetch (default: 10)' }
    }
  }),

  // Google Sheets tools
  gas_sheets_read: schema({
    type: 'object',
    properties: {
      spreadsheetId: { type: 'string', description: 'Spreadsheet ID (from URL)' },
      range: { type: 'string', description: 'A1 notation range (e.g., "Sheet1!A1:D10")' }
    },
    required: ['spreadsheetId', 'range']
  }),

  gas_sheets_write: schema({
    type: 'object',
    properties: {
      spreadsheetId: { type: 'string', description: 'Spreadsheet ID (from URL)' },
      range: { type: 'string', description: 'A1 notation range (e.g., "Sheet1!A1")' },
      values: {
        type: 'array',
        items: { type: 'array', items: {} },
        description: 'Two-dimensional array of values to write'
      }
    },
    required: ['spreadsheetId', 'range', 'values']
  }),

  gas_sheets_create: schema({
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name for the new spreadsheet' }
    },
    required: ['name']
  }),

  // Google Drive tools
  gas_drive_list: schema({
    type: 'object',
    properties: {
      folderId: { type: 'string', description: 'Folder ID to list files from (optional, defaults to root)' },
      query: { type: 'string', description: 'Search query for files' },
      maxResults: { type: 'number', description: 'Maximum number of files to return (default: 100)' }
    }
  }),

  gas_drive_get_file: schema({
    type: 'object',
    properties: {
      fileId: { type: 'string', description: 'File ID to retrieve' }
    },
    required: ['fileId']
  }),

  gas_drive_create_folder: schema({
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name for the new folder' },
      parentId: { type: 'string', description: 'Parent folder ID (optional)' }
    },
    required: ['name']
  }),

  // Google Calendar tools
  gas_calendar_get_events: schema({
    type: 'object',
    properties: {
      calendarId: { type: 'string', description: 'Calendar ID (default: primary)' },
      startDate: { type: 'string', description: 'Start date (ISO format)' },
      endDate: { type: 'string', description: 'End date (ISO format)' },
      maxResults: { type: 'number', description: 'Maximum events to return (default: 50)' }
    }
  }),

  gas_calendar_create_event: schema({
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Event title' },
      startTime: { type: 'string', description: 'Start time (ISO format)' },
      endTime: { type: 'string', description: 'End time (ISO format)' },
      description: { type: 'string', description: 'Event description' },
      calendarId: { type: 'string', description: 'Calendar ID (default: primary)' }
    },
    required: ['title', 'startTime', 'endTime']
  }),

  // Google Docs tools
  gas_docs_create: schema({
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Document name' },
      content: { type: 'string', description: 'Initial content (optional)' }
    },
    required: ['name']
  }),

  gas_docs_get_content: schema({
    type: 'object',
    properties: {
      documentId: { type: 'string', description: 'Document ID' }
    },
    required: ['documentId']
  }),

  // Utility tools
  gas_fetch_url: schema({
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL to fetch' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'HTTP method (default: GET)' },
      payload: { type: 'object', description: 'Request payload for POST/PUT' },
      headers: { type: 'object', description: 'Custom headers' }
    },
    required: ['url']
  })
};

// ========== Configuration ==========

export interface GASExecutorConfig {
  /** GAS Web App URL endpoint */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

export const DEFAULT_CONFIG: Partial<GASExecutorConfig> = {
  timeout: 30000
};
