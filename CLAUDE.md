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

## L-Step Integration

### lstep-tags.js

PPAL用L-Stepタグ管理スクリプト。34件のタグをスプレッドシートに生成。

**タグカテゴリ:**
| カテゴリ | 件数 | 例 |
|---------|------|-----|
| セグメント | 3 | `Seg:Tech_Interest`, `Seg:Biz_Result` |
| ステータス | 9 | `Status:Purchased_Main`, `Status:Churned` |
| 商品 | 3 | `Product:PPAL_Monthly`, `Product:VIP_Coaching` |
| 進捗 | 8 | `Progress:Week1_Complete`, `Progress:All_Complete` |
| エンゲージメント | 4 | `Eng:High_Activity`, `Engagement:Review_Posted` |
| その他 | 7 | `Upsell:VIP_Candidate`, `Source:5Days` |

**実行:**
```javascript
// GAS内で実行
pushLStepTags();  // スプレッドシート作成・タグ一覧出力
```

## MCP Server

### mcp-server/

Claude Code / MCP対応のローカルサーバー。GAS Executorをツールとして公開。

**コマンド:**
```bash
cd mcp-server && npm run build     # TypeScriptビルド
cd mcp-server && npm run dev       # 開発モード（tsx）
cd mcp-server && npm run start     # 本番起動
cd mcp-server && npm run dev:chatgpt   # ChatGPT互換サーバー
cd mcp-server && npm run start:chatgpt # ChatGPT互換本番
```

**MCP設定例 (.mcp.json):**
```json
{
  "mcpServers": {
    "gas-executor": {
      "command": "node",
      "args": ["/path/to/gas-executor/mcp-server/dist/index.js"],
      "env": {
        "GAS_API_KEY": "your-api-key",
        "GAS_WEBHOOK_URL": "https://script.google.com/macros/s/.../exec"
      }
    }
  }
}
```

## ChatGPT Actions Integration

### chatgpt-actions-schema.yaml

ChatGPT Custom GPT Actions用OpenAPIスキーマ。

**利用可能API:**
- `GmailApp` - メール送信・検索・ラベル管理
- `SpreadsheetApp` - スプレッドシート読み書き
- `DriveApp` - ファイル一覧・フォルダ作成
- `CalendarApp` - イベント取得・作成
- `DocumentApp` - ドキュメント作成・編集
- `UrlFetchApp` - HTTP リクエスト

**GPT設定手順:**
1. ChatGPT → My GPTs → Create
2. Actions → Import from URL or paste schema
3. `chatgpt-actions-schema.yaml` の内容を貼り付け
4. Authentication: API Key (Header: `x-api-key`)