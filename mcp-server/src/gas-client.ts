/**
 * GAS Executor Client - HTTP client for Google Apps Script Executor API
 */

import type { ExecuteScriptRequest, GASResponse, GASExecutorConfig } from './types.js';

export type { GASResponse };

export class GASClient {
  private endpoint: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: GASExecutorConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Execute a script via the GAS Executor API
   */
  async execute(title: string, script: string): Promise<GASResponse> {
    const request: ExecuteScriptRequest = {
      title,
      script,
      apiKey: this.apiKey
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json() as GASResponse;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: `Request timeout after ${this.timeout}ms`,
          statusCode: 408,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ========== Pre-built Script Helpers ==========

  /**
   * Send an email via Gmail
   */
  async sendEmail(to: string, subject: string, body: string, htmlBody = false): Promise<GASResponse> {
    const script = htmlBody
      ? `GmailApp.sendEmail("${to}", "${subject}", "", { htmlBody: \`${body}\` }); return "Email sent to ${to}";`
      : `GmailApp.sendEmail("${to}", "${subject}", \`${body}\`); return "Email sent to ${to}";`;

    return this.execute(`Send email to ${to}`, script);
  }

  /**
   * Search Gmail
   */
  async searchGmail(query: string, maxResults = 10): Promise<GASResponse> {
    const script = `
      const threads = GmailApp.search("${query}", 0, ${maxResults});
      const emails = threads.map(thread => {
        const lastMessage = thread.getMessages().pop();
        return {
          id: thread.getId(),
          subject: lastMessage.getSubject(),
          from: lastMessage.getFrom(),
          date: lastMessage.getDate().toISOString(),
          snippet: lastMessage.getPlainBody().slice(0, 200),
          isUnread: thread.isUnread()
        };
      });
      return JSON.stringify(emails);
    `;
    return this.execute(`Search Gmail: ${query}`, script);
  }

  /**
   * Get recent inbox emails
   */
  async getInbox(maxResults = 10): Promise<GASResponse> {
    const script = `
      const threads = GmailApp.getInboxThreads(0, ${maxResults});
      const emails = threads.map(thread => {
        const lastMessage = thread.getMessages().pop();
        return {
          id: thread.getId(),
          subject: lastMessage.getSubject(),
          from: lastMessage.getFrom(),
          date: lastMessage.getDate().toISOString(),
          snippet: lastMessage.getPlainBody().slice(0, 200),
          isUnread: thread.isUnread()
        };
      });
      return JSON.stringify(emails);
    `;
    return this.execute('Get inbox emails', script);
  }

  /**
   * Read data from a spreadsheet
   */
  async readSpreadsheet(spreadsheetId: string, range: string): Promise<GASResponse> {
    const script = `
      const ss = SpreadsheetApp.openById("${spreadsheetId}");
      const sheet = ss.getRange("${range}");
      const values = sheet.getValues();
      return JSON.stringify(values);
    `;
    return this.execute(`Read spreadsheet ${spreadsheetId}`, script);
  }

  /**
   * Write data to a spreadsheet
   */
  async writeSpreadsheet(spreadsheetId: string, range: string, values: unknown[][]): Promise<GASResponse> {
    const valuesJson = JSON.stringify(values);
    const script = `
      const ss = SpreadsheetApp.openById("${spreadsheetId}");
      const data = ${valuesJson};
      const sheet = ss.getRange("${range}");
      sheet.setValues(data);
      return "Data written to ${range}";
    `;
    return this.execute(`Write to spreadsheet ${spreadsheetId}`, script);
  }

  /**
   * Create a new spreadsheet
   */
  async createSpreadsheet(name: string): Promise<GASResponse> {
    const script = `
      const ss = SpreadsheetApp.create("${name}");
      return JSON.stringify({
        id: ss.getId(),
        name: ss.getName(),
        url: ss.getUrl()
      });
    `;
    return this.execute(`Create spreadsheet: ${name}`, script);
  }

  /**
   * List files in Google Drive
   */
  async listDriveFiles(folderId?: string, query?: string, maxResults = 100): Promise<GASResponse> {
    let script: string;

    if (folderId) {
      script = `
        const folder = DriveApp.getFolderById("${folderId}");
        const files = folder.getFiles();
        const result = [];
        let count = 0;
        while (files.hasNext() && count < ${maxResults}) {
          const file = files.next();
          result.push({
            id: file.getId(),
            name: file.getName(),
            mimeType: file.getMimeType(),
            size: file.getSize(),
            lastUpdated: file.getLastUpdated().toISOString(),
            url: file.getUrl()
          });
          count++;
        }
        return JSON.stringify(result);
      `;
    } else if (query) {
      script = `
        const files = DriveApp.searchFiles("${query}");
        const result = [];
        let count = 0;
        while (files.hasNext() && count < ${maxResults}) {
          const file = files.next();
          result.push({
            id: file.getId(),
            name: file.getName(),
            mimeType: file.getMimeType(),
            size: file.getSize(),
            lastUpdated: file.getLastUpdated().toISOString(),
            url: file.getUrl()
          });
          count++;
        }
        return JSON.stringify(result);
      `;
    } else {
      script = `
        const files = DriveApp.getFiles();
        const result = [];
        let count = 0;
        while (files.hasNext() && count < ${maxResults}) {
          const file = files.next();
          result.push({
            id: file.getId(),
            name: file.getName(),
            mimeType: file.getMimeType(),
            size: file.getSize(),
            lastUpdated: file.getLastUpdated().toISOString(),
            url: file.getUrl()
          });
          count++;
        }
        return JSON.stringify(result);
      `;
    }

    return this.execute('List Drive files', script);
  }

  /**
   * Get file info from Google Drive
   */
  async getDriveFile(fileId: string): Promise<GASResponse> {
    const script = `
      const file = DriveApp.getFileById("${fileId}");
      return JSON.stringify({
        id: file.getId(),
        name: file.getName(),
        mimeType: file.getMimeType(),
        size: file.getSize(),
        description: file.getDescription(),
        lastUpdated: file.getLastUpdated().toISOString(),
        dateCreated: file.getDateCreated().toISOString(),
        owner: file.getOwner().getEmail(),
        url: file.getUrl(),
        downloadUrl: file.getDownloadUrl()
      });
    `;
    return this.execute(`Get Drive file: ${fileId}`, script);
  }

  /**
   * Create a folder in Google Drive
   */
  async createDriveFolder(name: string, parentId?: string): Promise<GASResponse> {
    const script = parentId
      ? `
        const parent = DriveApp.getFolderById("${parentId}");
        const folder = parent.createFolder("${name}");
        return JSON.stringify({
          id: folder.getId(),
          name: folder.getName(),
          url: folder.getUrl()
        });
      `
      : `
        const folder = DriveApp.createFolder("${name}");
        return JSON.stringify({
          id: folder.getId(),
          name: folder.getName(),
          url: folder.getUrl()
        });
      `;
    return this.execute(`Create folder: ${name}`, script);
  }

  /**
   * Get calendar events
   */
  async getCalendarEvents(
    calendarId = 'primary',
    startDate?: string,
    endDate?: string,
    maxResults = 50
  ): Promise<GASResponse> {
    const start = startDate || new Date().toISOString();
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const script = `
      const calendar = CalendarApp.getCalendarById("${calendarId}") || CalendarApp.getDefaultCalendar();
      const startDate = new Date("${start}");
      const endDate = new Date("${end}");
      const events = calendar.getEvents(startDate, endDate);
      const result = events.slice(0, ${maxResults}).map(event => ({
        id: event.getId(),
        title: event.getTitle(),
        description: event.getDescription(),
        startTime: event.getStartTime().toISOString(),
        endTime: event.getEndTime().toISOString(),
        location: event.getLocation(),
        isAllDay: event.isAllDayEvent()
      }));
      return JSON.stringify(result);
    `;
    return this.execute('Get calendar events', script);
  }

  /**
   * Create a calendar event
   */
  async createCalendarEvent(
    title: string,
    startTime: string,
    endTime: string,
    description?: string,
    calendarId = 'primary'
  ): Promise<GASResponse> {
    const script = `
      const calendar = CalendarApp.getCalendarById("${calendarId}") || CalendarApp.getDefaultCalendar();
      const startDate = new Date("${startTime}");
      const endDate = new Date("${endTime}");
      const event = calendar.createEvent("${title}", startDate, endDate, {
        description: "${description || ''}"
      });
      return JSON.stringify({
        id: event.getId(),
        title: event.getTitle(),
        startTime: event.getStartTime().toISOString(),
        endTime: event.getEndTime().toISOString(),
        url: event.getGuestList().length > 0 ? "" : "Event created"
      });
    `;
    return this.execute(`Create event: ${title}`, script);
  }

  /**
   * Create a Google Doc
   */
  async createDoc(name: string, content?: string): Promise<GASResponse> {
    const script = content
      ? `
        const doc = DocumentApp.create("${name}");
        doc.getBody().appendParagraph(\`${content}\`);
        return JSON.stringify({
          id: doc.getId(),
          name: doc.getName(),
          url: doc.getUrl()
        });
      `
      : `
        const doc = DocumentApp.create("${name}");
        return JSON.stringify({
          id: doc.getId(),
          name: doc.getName(),
          url: doc.getUrl()
        });
      `;
    return this.execute(`Create doc: ${name}`, script);
  }

  /**
   * Get Google Doc content
   */
  async getDocContent(documentId: string): Promise<GASResponse> {
    const script = `
      const doc = DocumentApp.openById("${documentId}");
      const body = doc.getBody();
      return JSON.stringify({
        id: doc.getId(),
        name: doc.getName(),
        url: doc.getUrl(),
        content: body.getText()
      });
    `;
    return this.execute(`Get doc: ${documentId}`, script);
  }

  /**
   * Fetch URL (HTTP request from GAS)
   */
  async fetchUrl(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    payload?: object,
    headers?: Record<string, string>
  ): Promise<GASResponse> {
    const options = {
      method,
      ...(payload && { payload: JSON.stringify(payload), contentType: 'application/json' }),
      ...(headers && { headers })
    };

    const script = `
      const response = UrlFetchApp.fetch("${url}", ${JSON.stringify(options)});
      return JSON.stringify({
        statusCode: response.getResponseCode(),
        headers: response.getAllHeaders(),
        body: response.getContentText()
      });
    `;
    return this.execute(`Fetch URL: ${url}`, script);
  }
}
