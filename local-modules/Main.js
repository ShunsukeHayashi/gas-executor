/**
 * GAS Executor - Main entry point
 * Refactored version with modular architecture
 */

/**
 * Handles POST requests to the webhook endpoint
 * @param {Object} e - The event object from Google Apps Script
 * @returns {TextOutput} JSON response
 */
function doPost(e) {
  try {
    // Parse request
    const request = parseRequest(e);
    if (!request.success) {
      return ResponseBuilder.error(request.error);
    }

    const { script, title, apiKey } = request.data;

    // Validate API key
    const validation = apiKeyManager.validate(apiKey);
    if (!validation.valid) {
      logger.log({
        title: title || 'Unauthorized',
        script: script || '',
        result: CONFIG.ERRORS.INVALID_API_KEY,
        success: false,
        identifier: 'Unknown'
      });
      return ResponseBuilder.unauthorized();
    }

    // Update API key usage
    apiKeyManager.updateUsage(validation.identifier);

    // Execute script
    const context = scriptExecutor.createContext();
    const execution = scriptExecutor.execute(script, context);

    // Log execution
    logger.log({
      title: title,
      script: script,
      result: execution.success ? execution.result : execution.error,
      success: execution.success,
      identifier: validation.identifier
    });

    // Return response
    if (execution.success) {
      return ResponseBuilder.success(execution.result, {
        executionTime: execution.executionTime
      });
    } else {
      return ResponseBuilder.error(
        `${CONFIG.ERRORS.SCRIPT_EXECUTION_ERROR}: ${execution.error}`,
        400,
        { executionTime: execution.executionTime }
      );
    }

  } catch (error) {
    console.error('Unexpected error in doPost:', error);
    return ResponseBuilder.serverError(
      `${CONFIG.ERRORS.GENERAL_ERROR}: ${error.message}`
    );
  }
}

/**
 * Parses and validates the incoming request
 * @param {Object} e - The event object
 * @returns {Object} Parsed request with success flag
 */
function parseRequest(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return { success: false, error: CONFIG.ERRORS.NO_POST_DATA };
    }

    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    const validationErrors = [];
    if (!data.script) validationErrors.push('Script is required');
    if (!data.title) validationErrors.push('Title is required');
    if (!data.apiKey) validationErrors.push('API key is required');
    
    if (validationErrors.length > 0) {
      return { 
        success: false, 
        error: validationErrors.join(', ') 
      };
    }

    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: `Invalid JSON: ${error.message}` 
    };
  }
}

/**
 * Initializes the menu when the spreadsheet is opened
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(CONFIG.UI.MENU_TITLE)
    .addItem('APIキーを作成', 'showCreateApiKeyDialog')
    .addItem('APIキーを削除', 'showDeleteApiKeyDialog')
    .addItem('APIキー一覧を表示', 'showApiKeysList')
    .addSeparator()
    .addItem('ログ統計を表示', 'showLogStats')
    .addItem('全てのログを初期化', 'showClearLogsDialog')
    .addSeparator()
    .addItem('ヘルプ', 'showHelp')
    .addToUi();
    
  // Initialize logger
  logger.init();
}

/**
 * Shows create API key dialog
 */
function showCreateApiKeyDialog() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'APIキーの作成',
    CONFIG.UI.API_KEY_PROMPT,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const identifier = response.getResponseText().trim();
    if (identifier) {
      try {
        const apiKey = apiKeyManager.create(identifier);
        ui.alert('成功', `${CONFIG.UI.NEW_API_KEY}${apiKey}`, ui.ButtonSet.OK);
      } catch (error) {
        ui.alert('エラー', error.message, ui.ButtonSet.OK);
      }
    }
  }
}

/**
 * Shows delete API key dialog
 */
function showDeleteApiKeyDialog() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'APIキーの削除',
    CONFIG.UI.DELETE_KEY_PROMPT,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const identifier = response.getResponseText().trim();
    if (identifier) {
      if (apiKeyManager.delete(identifier)) {
        ui.alert('成功', `APIキー '${identifier}' を削除しました。`, ui.ButtonSet.OK);
      } else {
        ui.alert('エラー', `APIキー '${identifier}' が見つかりません。`, ui.ButtonSet.OK);
      }
    }
  }
}

/**
 * Shows API keys list
 */
function showApiKeysList() {
  const ui = SpreadsheetApp.getUi();
  const keys = apiKeyManager.getAll();
  
  if (keys.length === 0) {
    ui.alert('APIキー一覧', 'APIキーが登録されていません。', ui.ButtonSet.OK);
    return;
  }
  
  const keyList = keys.map(key => 
    `識別子: ${key.identifier}\\nAPIキー: ${key.apiKey}\\n作成日: ${key.createdAt}\\n使用回数: ${key.usageCount}\\n最終使用: ${key.lastUsed || 'Never'}`
  ).join('\\n\\n');
  
  ui.alert('APIキー一覧', keyList, ui.ButtonSet.OK);
}

/**
 * Shows log statistics
 */
function showLogStats() {
  const ui = SpreadsheetApp.getUi();
  const stats = logger.getStats();
  
  const message = `総ログ数: ${stats.total}\\n成功: ${stats.success}\\n失敗: ${stats.fail}\\n成功率: ${stats.successRate}`;
  ui.alert('ログ統計', message, ui.ButtonSet.OK);
}

/**
 * Shows clear logs confirmation dialog
 */
function showClearLogsDialog() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    CONFIG.UI.CLEAR_LOGS_TITLE,
    CONFIG.UI.CLEAR_LOGS_CONFIRM,
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    logger.clearAll();
    ui.alert('完了', CONFIG.UI.LOGS_CLEARED, ui.ButtonSet.OK);
  }
}

/**
 * Shows help information
 */
function showHelp() {
  const ui = SpreadsheetApp.getUi();
  const helpText = `GAS Executor ヘルプ\\n\\n` +
    `このシステムは、APIキー認証を使用してJavaScriptコードを安全に実行します。\\n\\n` +
    `使用方法:\\n` +
    `1. メニューからAPIキーを作成\\n` +
    `2. POSTリクエストで以下のJSONを送信:\\n` +
    `   {\\n` +
    `     "apiKey": "your-api-key",\\n` +
    `     "title": "スクリプトのタイトル",\\n` +
    `     "script": "実行するJavaScriptコード"\\n` +
    `   }\\n\\n` +
    `詳細はドキュメントを参照してください。`;
    
  ui.alert('ヘルプ', helpText, ui.ButtonSet.OK);
}