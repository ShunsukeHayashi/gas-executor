# GAS Executor - APIキー管理とスクリプト実行システム

[English](README.md) | 日本語

Google Apps Script環境で安全にJavaScriptコードを実行するためのWebhook APIシステムです。

## 🚀 特徴

- **APIキー認証**: UUIDベースの安全なAPIキー管理
- **動的スクリプト実行**: POSTリクエストでJavaScriptコードを実行
- **Google サービス統合**: Gmail、Drive、Calendar、Sheets等へのアクセス
- **実行ログ**: Google Sheetsへの自動ログ記録
- **使用状況追跡**: APIキーの使用回数と最終使用日時を記録
- **エラーハンドリング**: 詳細なエラーメッセージとHTTPステータスコード

## 📋 前提条件

- Node.js と npm
- Google アカウント
- clasp CLI ツール（グローバルインストール済み）

## 🛠️ セットアップ

### 1. リポジトリのクローン
```bash
git clone https://github.com/ShunsukeHayashi/gas-executor.git
cd gas-executor
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. Google Apps Scriptへのデプロイ
```bash
# Google アカウントでログイン
clasp login

# コードをプッシュ
npm run push

# ブラウザでエディタを開く
npm run open
```

### 4. Web Appとしてデプロイ
1. Apps Script エディタで「デプロイ」→「新しいデプロイ」をクリック
2. 種類として「ウェブアプリ」を選択
3. 以下の設定を行う：
   - 実行ユーザー: 自分
   - アクセスできるユーザー: 全員（匿名ユーザーを含む）
4. 「デプロイ」をクリックしてURLを取得

### 5. APIキーの作成
1. Google Sheetsでスプレッドシートを開く
2. メニューから「GAS Interpreterメニュー」→「APIキーを作成」を選択
3. 識別子を入力（例: "my-app"）
4. 生成されたAPIキーを安全に保管

## 📡 API使用方法

### エンドポイント
```
POST https://script.google.com/macros/s/{SCRIPT_ID}/exec
```

### リクエスト形式
```json
{
  "apiKey": "your-api-key",
  "title": "スクリプトのタイトル",
  "script": "実行するJavaScriptコード"
}
```

### レスポンス形式

**成功時:**
```json
{
  "success": true,
  "result": "スクリプトの実行結果",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "executionTime": 123
}
```

**エラー時:**
```json
{
  "success": false,
  "error": "エラーメッセージ",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📝 使用例

### 基本的な例
```bash
curl -X POST https://script.google.com/macros/s/{SCRIPT_ID}/exec \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-api-key",
    "title": "現在時刻の取得",
    "script": "return new Date().toLocaleString(\"ja-JP\");"
  }'
```

### Gmail送信の例
```javascript
const recipient = "example@gmail.com";
const subject = "テストメール";
const body = "GAS Executorから送信されました";
GmailApp.sendEmail(recipient, subject, body);
return `メールを${recipient}に送信しました`;
```

### スプレッドシート作成の例
```javascript
const spreadsheet = SpreadsheetApp.create("新しいシート");
const sheet = spreadsheet.getActiveSheet();
const data = [["名前", "点数"], ["田中", "85"], ["山田", "92"]];
sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
return `シートを作成しました: ${spreadsheet.getUrl()}`;
```

## 🔧 開発コマンド

```bash
# 最新の変更を取得
npm run pull

# 変更をGASにプッシュ
npm run push

# ファイル変更を監視して自動プッシュ
npm run watch

# 実行ログを表示
npm run logs

# 新しいバージョンをデプロイ
npm run deploy

# バージョン履歴を表示
npm run versions
```

## 🏗️ アーキテクチャ

### モジュール構成
- **Config.js**: 設定定数
- **ApiKeyManager.js**: APIキーの管理
- **Logger.js**: ログ記録システム
- **ScriptExecutor.js**: スクリプト実行エンジン
- **ResponseBuilder.js**: レスポンス生成
- **Main.js**: エントリーポイントとUIハンドラー

### セキュリティ機能
- APIキー認証必須
- スクリプトサイズ制限（100KB）
- 実行時間の追跡
- 詳細なエラーログ

## 🤝 ChatGPT Custom GPT との統合

OpenAPIスキーマファイル（`openapi-schema.yaml`）を使用してChatGPT Custom GPTと統合できます。

### セットアップ手順
1. ChatGPTでCustom GPTを作成
2. Actions設定でOpenAPIスキーマをインポート
3. デプロイURLとAPIキーを設定
4. 自然言語でGASスクリプトを実行

## ⚠️ 注意事項

- APIキーは安全に管理し、公開リポジトリにコミットしないこと
- スクリプト実行は認証されたユーザーの権限で行われる
- 実行ログは最大10,000件まで保持される
- Google サービスのAPI制限に注意

## 📄 ライセンス

MIT License

## 🙏 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成して変更内容を議論してください。