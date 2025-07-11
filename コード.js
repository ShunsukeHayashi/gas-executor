// GAS Executor - APIキー管理とスクリプト実行システム


// WebhookのPOSTリクエストを処理する関数
function doPost(e) {
 try {
   if (!e.postData) throw new Error("No post data received");
  
   const data = JSON.parse(e.postData.contents);
   const script = data.script;
   const title = data.title;
   const apiKey = data.apiKey;
  
   // APIキーの検証
   const {valid, identifier} = isValidApiKey_(apiKey);
   if (!apiKey || !valid) {
     logToSheet_(title, script, "APIキーが無効です", false, identifier);
     return ContentService.createTextOutput(JSON.stringify({
       "success": false,
       "error": "APIキーが無効です"
     })).setMimeType(ContentService.MimeType.JSON);
   }
  
   // スクリプトの実行
   if (script && title) {
     try {
       const scriptFunction = new Function(script);
       const result = scriptFunction();
      
       // 成功ログの記録とレスポンスの返却
       logToSheet_(title, script, result, true, identifier);
       return ContentService.createTextOutput(JSON.stringify({
         "success": true,
         "result": result
       })).setMimeType(ContentService.MimeType.JSON);
     } catch (scriptError) {
       // スクリプト実行エラーの記録とレスポンスの返却
       logToSheet_(title, script, scriptError.message, false, identifier);
       return ContentService.createTextOutput(JSON.stringify({
         "success": false,
         "error": "実行エラーが発生しました: " + scriptError.message
       })).setMimeType(ContentService.MimeType.JSON);
     }
   } else {
     // 必要なパラメータが不足している場合
     return ContentService.createTextOutput(JSON.stringify({
       "success": false,
       "error": "スクリプトが提供されていません"
     })).setMimeType(ContentService.MimeType.JSON);
   }
 } catch (error) {
   // 全体的なエラー処理
   return ContentService.createTextOutput(JSON.stringify({
     "success": false,
     "error": "エラーが発生しました: " + error.message
   })).setMimeType(ContentService.MimeType.JSON);
 }
}


// ログをスプレッドシートに記録する関数
function logToSheet_(title, script, result, success, identifier) {
 const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
 let sheet = spreadsheet.getSheetByName("Log");
  // Logシートが存在しない場合は作成
 if (!sheet) {
   sheet = spreadsheet.insertSheet("Log");
   sheet.appendRow(["タイトル", "スクリプト", "結果", "成否", "実行時間", "識別子"]);
 }
  // 成功/失敗のステータス設定
 let status = "fail";
 if (success) status = "success";
  // ログの挿入
 sheet.insertRowBefore(2);
 sheet.getRange("A2:F2").setValues([[title, script, JSON.stringify(result), status, new Date(), identifier]]);
}


// スクリプトプロパティの取得
const scriptProperties_ = PropertiesService.getScriptProperties();


// APIキーの検証
function isValidApiKey_(apiKey) {
 const keys = scriptProperties_.getKeys();
 for (let i = 0; i < keys.length; i++) {
   const key = keys[i];
   const value = JSON.parse(scriptProperties_.getProperty(key));
   if (value.apiKey === apiKey) return {"valid": true, "identifier": value.identifier};
 }
 return {"valid": false, "identifier": null};
}


// 新しいAPIキーの作成
function createApiKey_(identifier) {
 const apiKey = Utilities.getUuid();
 const createdAt = new Date().toISOString();
  scriptProperties_.setProperty(identifier, JSON.stringify({
   "apiKey": apiKey,
   "identifier": identifier,
   "createdAt": createdAt
 }));
  return apiKey;
}


// APIキーの削除
function deleteApiKey_(identifier) {
 scriptProperties_.deleteProperty(identifier);
}


// 全APIキーの取得
function getApiKeys_() {
 const keys = scriptProperties_.getKeys();
 return keys.map(key => {
   const value = JSON.parse(scriptProperties_.getProperty(key));
   return {
     "apiKey": value.apiKey,
     "identifier": value.identifier,
     "createdAt": new Date(Date.parse(value.createdAt))
   };
 });
}


// UI経由でAPIキーを作成
function createApiKeyFromUi() {
 const ui = SpreadsheetApp.getUi();
 const identifier = ui.prompt("作成するAPIキーの識別子を入力して下さい:").getResponseText();
 const apiKey = createApiKey_(identifier);
 ui.alert("New API Key: " + apiKey);
}


// UI経由でAPIキーを削除
function deleteApiKeyFromUi() {
 const ui = SpreadsheetApp.getUi();
 const identifier = ui.prompt("削除するAPIキーの識別子を入力して下さい:").getResponseText();
 deleteApiKey_(identifier);
}


// UI経由で全APIキーを削除
function deleteAllApiKeysFromUi() {
 const keys = scriptProperties_.getKeys();
 keys.forEach(key => scriptProperties_.deleteProperty(key));
}


// UI経由でAPIキー一覧を表示
function listApiKeysFromUi() {
 const apiKeys = getApiKeys_();
 const keyList = apiKeys.map(key =>
   "APIキー: " + key.apiKey + ", 識別子: " + key.identifier + ", Created At: " + key.createdAt
 ).join("\n");
  SpreadsheetApp.getUi().alert(keyList);
}


// UI経由で全ログエントリをクリア
function clearAllLogEntriesFromUi() {
 try {
   const ui = SpreadsheetApp.getUi();
   const response = ui.alert("全てのLogを初期化", "本当に全てのログを消去しますか?", ui.ButtonSet.YES_NO);
  
   if (response && response === ui.Button.YES) {
     clearAllLogEntries_();
     ui.alert("全てのログを削除しました.");
   }
 } catch (error) {
   console.log(error);
   logToSheet_("e", error, "", "", "");
 }
}


// 全ログエントリのクリア
function clearAllLogEntries_() {
 const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
 const sheet = spreadsheet.getSheetByName("Log");
  if (sheet) {
   sheet.clear();
   sheet.appendRow(["タイトル", "スクリプト", "結果", "成否", "実行時間", "識別子"]);
  
   const lastRow = sheet.getLastRow();
   const headerRange = sheet.getRange(lastRow, 1, 1, 6);
   headerRange.setBackground("blue").setFontColor("white");
  
   conditionalFormatting();
 }
}


// 条件付き書式の設定
function conditionalFormatting() {
 var sheetName = "Log";
 var rangeToFormat = "A:F";
 var ss = SpreadsheetApp.getActiveSpreadsheet();
 var sheet = ss.getSheetByName(sheetName);
 var rules = sheet.getConditionalFormatRules();
  // 既存の条件付き書式をフィルタリング
 rules = rules.filter(function(rule) {
   var ranges = rule.getRanges().map(function(range) {
     return range.getA1Notation();
   });
   return !ranges.includes("D:D");
 });
  // 成功時の条件付き書式（緑色）
 rules.push(
   SpreadsheetApp.newConditionalFormatRule()
     .whenFormulaSatisfied('=INDIRECT("D"&ROW())="success"')
     .setBackground("#eeffee")
     .setRanges([sheet.getRange(rangeToFormat)])
     .build()
 );
  // 失敗時の条件付き書式（赤色）
 rules.push(
   SpreadsheetApp.newConditionalFormatRule()
     .whenFormulaSatisfied('=INDIRECT("D"&ROW())="fail"')
     .setBackground("#ffeeee")
     .setRanges([sheet.getRange(rangeToFormat)])
     .build()
 );
  sheet.setConditionalFormatRules(rules);
}


// スプレッドシートが開かれたときの処理
function onOpen() {
 const ui = SpreadsheetApp.getUi();
 ui.createMenu("GAS Interpreterメニュー")
   .addItem("APIキーを作成", "createApiKeyFromUi")
   .addItem("APIキーを削除", "deleteApiKeyFromUi")
   .addItem("全てのAPIキーを削除", "deleteAllApiKeysFromUi")
   .addItem("APIキーを表示", "listApiKeysFromUi")
   .addSeparator()
   .addItem("Geminiでスクリプト生成", "generateScriptWithGeminiFromUi")
   .addSeparator()
   .addItem("全てのLogを初期化", "clearAllLogEntriesFromUi")
   .addToUi();
}

