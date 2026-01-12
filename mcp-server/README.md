# GAS Executor MCP Server

Google Apps Script Executor を MCP (Model Context Protocol) サーバーとして実装。Claude や他の AI エージェントから Google Workspace を自動化できます。

## 機能

| カテゴリ | ツール数 | 説明 |
|----------|----------|------|
| **Core** | 1 | カスタム JavaScript 実行 |
| **Gmail** | 3 | メール送信、検索、受信トレイ取得 |
| **Sheets** | 3 | スプレッドシート読み書き、作成 |
| **Drive** | 3 | ファイル一覧、取得、フォルダ作成 |
| **Calendar** | 2 | イベント取得、作成 |
| **Docs** | 2 | ドキュメント作成、取得 |
| **Utility** | 1 | HTTP リクエスト (UrlFetchApp) |
| **合計** | **15 tools** | |

## インストール

```bash
cd gas-executor/mcp-server
npm install
npm run build
```

## 設定

### 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GAS_ENDPOINT` | Yes | GAS Web App URL (`https://script.google.com/macros/s/xxx/exec`) |
| `GAS_API_KEY` | Yes | GAS Executor の API キー (UUID) |
| `GAS_TIMEOUT` | No | リクエストタイムアウト (ms, デフォルト: 30000) |

### Claude Desktop 設定

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gas-executor": {
      "command": "node",
      "args": ["/path/to/gas-executor/mcp-server/dist/index.js"],
      "env": {
        "GAS_ENDPOINT": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
        "GAS_API_KEY": "your-uuid-api-key"
      }
    }
  }
}
```

### Claude Code 設定

`.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "gas-executor": {
      "command": "node",
      "args": ["./gas-executor/mcp-server/dist/index.js"],
      "env": {
        "GAS_ENDPOINT": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
        "GAS_API_KEY": "your-uuid-api-key"
      }
    }
  }
}
```

## ツール一覧

### Core

#### `gas_execute`

任意の JavaScript コードを GAS 環境で実行。

```typescript
// パラメータ
{
  title: string;   // 実行タイトル（ログ用）
  script: string;  // JavaScript コード（return 文必須）
}

// 例
{
  "title": "Get active user",
  "script": "return Session.getActiveUser().getEmail();"
}
```

### Gmail

#### `gas_gmail_send`

メール送信。

```typescript
{
  to: string;        // 宛先
  subject: string;   // 件名
  body: string;      // 本文
  htmlBody?: boolean; // HTML として送信
}
```

#### `gas_gmail_search`

Gmail 検索。

```typescript
{
  query: string;       // 検索クエリ (Gmail 構文)
  maxResults?: number; // 最大件数 (デフォルト: 10)
}
```

#### `gas_gmail_get_inbox`

受信トレイの最新メール取得。

```typescript
{
  maxResults?: number; // 最大件数 (デフォルト: 10)
}
```

### Sheets

#### `gas_sheets_read`

スプレッドシートからデータ読み取り。

```typescript
{
  spreadsheetId: string; // スプレッドシート ID
  range: string;         // A1 記法 (例: "Sheet1!A1:D10")
}
```

#### `gas_sheets_write`

スプレッドシートにデータ書き込み。

```typescript
{
  spreadsheetId: string;    // スプレッドシート ID
  range: string;            // A1 記法
  values: unknown[][];      // 2次元配列
}
```

#### `gas_sheets_create`

新規スプレッドシート作成。

```typescript
{
  name: string; // スプレッドシート名
}
```

### Drive

#### `gas_drive_list`

ファイル一覧取得。

```typescript
{
  folderId?: string;   // フォルダ ID
  query?: string;      // 検索クエリ
  maxResults?: number; // 最大件数 (デフォルト: 100)
}
```

#### `gas_drive_get_file`

ファイル詳細取得。

```typescript
{
  fileId: string; // ファイル ID
}
```

#### `gas_drive_create_folder`

フォルダ作成。

```typescript
{
  name: string;      // フォルダ名
  parentId?: string; // 親フォルダ ID
}
```

### Calendar

#### `gas_calendar_get_events`

カレンダーイベント取得。

```typescript
{
  calendarId?: string; // カレンダー ID (デフォルト: primary)
  startDate?: string;  // 開始日 (ISO)
  endDate?: string;    // 終了日 (ISO)
  maxResults?: number; // 最大件数 (デフォルト: 50)
}
```

#### `gas_calendar_create_event`

カレンダーイベント作成。

```typescript
{
  title: string;        // イベントタイトル
  startTime: string;    // 開始時刻 (ISO)
  endTime: string;      // 終了時刻 (ISO)
  description?: string; // 説明
  calendarId?: string;  // カレンダー ID
}
```

### Docs

#### `gas_docs_create`

新規ドキュメント作成。

```typescript
{
  name: string;     // ドキュメント名
  content?: string; // 初期コンテンツ
}
```

#### `gas_docs_get_content`

ドキュメント内容取得。

```typescript
{
  documentId: string; // ドキュメント ID
}
```

### Utility

#### `gas_fetch_url`

HTTP リクエスト実行。

```typescript
{
  url: string;                              // URL
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload?: object;                         // リクエストボディ
  headers?: Record<string, string>;         // カスタムヘッダー
}
```

## GAS Executor セットアップ

1. [gas-executor リポジトリ](https://github.com/ShunsukeHayashi/gas-executor) をクローン
2. `clasp push` で GAS にデプロイ
3. GAS エディタでウェブアプリとしてデプロイ
4. スプレッドシートのメニューから API キーを作成
5. エンドポイント URL と API キーを環境変数に設定

## 開発

```bash
# 開発モード
npm run dev

# ビルド
npm run build

# 実行
npm start
```

## ライセンス

MIT
