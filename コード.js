/**
 * GAS Executor - Refactored Version
 * This file combines all modules for Google Apps Script deployment
 */

// ===== Config.js =====
/**
 * Configuration constants for GAS Executor
 */
const CONFIG = {
  // Sheet names
  SHEETS: {
    LOG: 'Log'
  },
  
  // Log sheet columns
  LOG_COLUMNS: ['タイトル', 'スクリプト', '結果', '成否', '実行時間', '識別子'],
  
  // Status values
  STATUS: {
    SUCCESS: 'success',
    FAIL: 'fail'
  },
  
  // Error messages
  ERRORS: {
    NO_POST_DATA: 'No post data received',
    INVALID_API_KEY: 'APIキーが無効です',
    SCRIPT_EXECUTION_ERROR: '実行エラーが発生しました',
    MISSING_SCRIPT: 'スクリプトが提供されていません',
    GENERAL_ERROR: 'エラーが発生しました'
  },
  
  // UI messages
  UI: {
    API_KEY_PROMPT: '作成するAPIキーの識別子を入力して下さい:',
    DELETE_KEY_PROMPT: '削除するAPIキーの識別子を入力して下さい:',
    CLEAR_LOGS_TITLE: '全てのLogを初期化',
    CLEAR_LOGS_CONFIRM: '本当に全てのログを消去しますか?',
    LOGS_CLEARED: '全てのログを削除しました.',
    MENU_TITLE: 'GAS Interpreterメニュー',
    NEW_API_KEY: 'New API Key: '
  },
  
  // Colors
  COLORS: {
    HEADER_BG: 'blue',
    HEADER_TEXT: 'white',
    SUCCESS_BG: '#eeffee',
    FAIL_BG: '#ffeeee'
  },
  
  // Limits
  LIMITS: {
    MAX_SCRIPT_LENGTH: 100000,
    MAX_LOG_ENTRIES: 10000
  }
};

// ===== ResponseBuilder.js =====
/**
 * Response Builder - Creates standardized JSON responses
 */
class ResponseBuilder {
  static success(result, metadata = {}) {
    const response = {
      success: true,
      result: result,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  }

  static error(error, statusCode = 400, details = {}) {
    const response = {
      success: false,
      error: error,
      statusCode: statusCode,
      timestamp: new Date().toISOString(),
      ...details
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  }

  static validationError(errors) {
    return this.error('Validation failed', 422, {
      validationErrors: errors
    });
  }

  static unauthorized() {
    return this.error(CONFIG.ERRORS.INVALID_API_KEY, 401);
  }

  static rateLimitExceeded(retryAfter = 60) {
    return this.error('Rate limit exceeded', 429, {
      retryAfter: retryAfter
    });
  }

  static serverError(message = 'Internal server error') {
    return this.error(message, 500);
  }
}

// ===== ApiKeyManager.js =====
/**
 * API Key Manager - Handles all API key operations
 */
class ApiKeyManager {
  constructor() {
    this.scriptProperties = PropertiesService.getScriptProperties();
  }

  validate(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, identifier: null };
    }

    const keys = this.scriptProperties.getKeys();
    for (const key of keys) {
      try {
        const value = JSON.parse(this.scriptProperties.getProperty(key));
        if (value.apiKey === apiKey) {
          return { valid: true, identifier: value.identifier };
        }
      } catch (e) {
        console.error(`Error parsing key data for ${key}:`, e);
      }
    }
    return { valid: false, identifier: null };
  }

  create(identifier) {
    if (!identifier || typeof identifier !== 'string') {
      throw new Error('Identifier is required and must be a string');
    }

    if (this.scriptProperties.getProperty(identifier)) {
      throw new Error(`Identifier '${identifier}' already exists`);
    }

    const apiKey = Utilities.getUuid();
    const keyData = {
      apiKey: apiKey,
      identifier: identifier,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      usageCount: 0
    };

    this.scriptProperties.setProperty(identifier, JSON.stringify(keyData));
    return apiKey;
  }

  delete(identifier) {
    if (this.scriptProperties.getProperty(identifier)) {
      this.scriptProperties.deleteProperty(identifier);
      return true;
    }
    return false;
  }

  deleteAll() {
    const keys = this.scriptProperties.getKeys();
    keys.forEach(key => this.scriptProperties.deleteProperty(key));
    return keys.length;
  }

  getAll() {
    const keys = this.scriptProperties.getKeys();
    return keys.map(key => {
      try {
        const value = JSON.parse(this.scriptProperties.getProperty(key));
        return {
          apiKey: value.apiKey,
          identifier: value.identifier,
          createdAt: new Date(value.createdAt),
          lastUsed: value.lastUsed ? new Date(value.lastUsed) : null,
          usageCount: value.usageCount || 0
        };
      } catch (e) {
        console.error(`Error parsing key data for ${key}:`, e);
        return null;
      }
    }).filter(key => key !== null);
  }

  updateUsage(identifier) {
    const keyData = this.scriptProperties.getProperty(identifier);
    if (keyData) {
      try {
        const data = JSON.parse(keyData);
        data.lastUsed = new Date().toISOString();
        data.usageCount = (data.usageCount || 0) + 1;
        this.scriptProperties.setProperty(identifier, JSON.stringify(data));
      } catch (e) {
        console.error(`Error updating usage for ${identifier}:`, e);
      }
    }
  }
}

// ===== Logger.js =====
/**
 * Logger - Handles logging to Google Sheets
 */
class Logger {
  constructor() {
    this.spreadsheet = null;
    this.sheet = null;
  }

  init() {
    try {
      this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      this.sheet = this.spreadsheet.getSheetByName(CONFIG.SHEETS.LOG);
      
      if (!this.sheet) {
        this.createLogSheet();
      }
    } catch (e) {
      // No spreadsheet context available
      console.error('Logger init failed:', e);
      throw e;
    }
  }

  createLogSheet() {
    this.sheet = this.spreadsheet.insertSheet(CONFIG.SHEETS.LOG);
    this.sheet.appendRow(CONFIG.LOG_COLUMNS);
    
    const headerRange = this.sheet.getRange(1, 1, 1, CONFIG.LOG_COLUMNS.length);
    headerRange.setBackground(CONFIG.COLORS.HEADER_BG)
               .setFontColor(CONFIG.COLORS.HEADER_TEXT)
               .setFontWeight('bold');
    
    this.sheet.setColumnWidth(1, 150);
    this.sheet.setColumnWidth(2, 300);
    this.sheet.setColumnWidth(3, 300);
    this.sheet.setColumnWidth(4, 80);
    this.sheet.setColumnWidth(5, 150);
    this.sheet.setColumnWidth(6, 150);
    
    this.applyConditionalFormatting();
  }

  log(logEntry) {
    try {
      if (!this.sheet) {
        this.init();
      }

      const { title, script, result, success, identifier } = logEntry;
    const status = success ? CONFIG.STATUS.SUCCESS : CONFIG.STATUS.FAIL;
    const resultString = typeof result === 'object' ? JSON.stringify(result) : String(result);
    
    const truncatedScript = script.length > 1000 ? script.substring(0, 997) + '...' : script;
    const truncatedResult = resultString.length > 1000 ? resultString.substring(0, 997) + '...' : resultString;
    
    this.sheet.insertRowBefore(2);
    const newRow = this.sheet.getRange(2, 1, 1, 6);
    newRow.setValues([[
      title || 'Untitled',
      truncatedScript,
      truncatedResult,
      status,
      new Date(),
      identifier || 'Unknown'
    ]]);
    
      this.trimLogs();
    } catch (e) {
      // If logging fails (e.g., no spreadsheet context), fail silently
      console.error('Logging failed:', e);
    }
  }

  applyConditionalFormatting() {
    const range = this.sheet.getRange(`A:F`);
    const rules = this.sheet.getConditionalFormatRules();
    
    this.sheet.clearConditionalFormatRules();
    
    const successRule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=INDIRECT("D"&ROW())="${CONFIG.STATUS.SUCCESS}"`)
      .setBackground(CONFIG.COLORS.SUCCESS_BG)
      .setRanges([range])
      .build();
    
    const failRule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=INDIRECT("D"&ROW())="${CONFIG.STATUS.FAIL}"`)
      .setBackground(CONFIG.COLORS.FAIL_BG)
      .setRanges([range])
      .build();
    
    this.sheet.setConditionalFormatRules([successRule, failRule]);
  }

  clearAll() {
    if (!this.sheet) {
      this.init();
    }
    
    this.sheet.clear();
    this.createLogSheet();
  }

  trimLogs() {
    const lastRow = this.sheet.getLastRow();
    if (lastRow > CONFIG.LIMITS.MAX_LOG_ENTRIES + 1) {
      const rowsToDelete = lastRow - CONFIG.LIMITS.MAX_LOG_ENTRIES - 1;
      this.sheet.deleteRows(CONFIG.LIMITS.MAX_LOG_ENTRIES + 2, rowsToDelete);
    }
  }

  getStats() {
    if (!this.sheet) {
      this.init();
    }
    
    const dataRange = this.sheet.getDataRange();
    const values = dataRange.getValues();
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][3] === CONFIG.STATUS.SUCCESS) {
        successCount++;
      } else if (values[i][3] === CONFIG.STATUS.FAIL) {
        failCount++;
      }
    }
    
    return {
      total: values.length - 1,
      success: successCount,
      fail: failCount,
      successRate: values.length > 1 ? (successCount / (values.length - 1) * 100).toFixed(2) + '%' : '0%'
    };
  }
}

// ===== ScriptExecutor.js =====
/**
 * Script Executor - Handles safe execution of user scripts
 */
class ScriptExecutor {
  execute(script, context = {}) {
    const startTime = new Date().getTime();
    
    try {
      this.validateScript(script);
      
      const scriptFunction = new Function('context', `
        ${Object.keys(context).map(key => `const ${key} = context['${key}'];`).join('\n')}
        ${script}
      `);
      
      const result = scriptFunction(context);
      
      return {
        success: true,
        result: result,
        error: null,
        executionTime: new Date().getTime() - startTime
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        error: this.formatError(error),
        executionTime: new Date().getTime() - startTime
      };
    }
  }

  validateScript(script) {
    if (!script || typeof script !== 'string') {
      throw new Error('Script must be a non-empty string');
    }

    if (script.length > CONFIG.LIMITS.MAX_SCRIPT_LENGTH) {
      throw new Error(`Script exceeds maximum length of ${CONFIG.LIMITS.MAX_SCRIPT_LENGTH} characters`);
    }
  }

  formatError(error) {
    if (error instanceof SyntaxError) {
      return `Syntax Error: ${error.message}`;
    } else if (error instanceof ReferenceError) {
      return `Reference Error: ${error.message}`;
    } else if (error instanceof TypeError) {
      return `Type Error: ${error.message}`;
    } else {
      return `${error.name || 'Error'}: ${error.message}`;
    }
  }

  createContext() {
    return {
      SpreadsheetApp: SpreadsheetApp,
      GmailApp: GmailApp,
      DriveApp: DriveApp,
      CalendarApp: CalendarApp,
      DocumentApp: DocumentApp,
      FormApp: FormApp,
      UrlFetchApp: UrlFetchApp,
      Utilities: Utilities,
      console: console,
      Date: Date,
      JSON: JSON,
      Math: Math,
      Array: Array,
      Object: Object
    };
  }
}

// Create singleton instances
const apiKeyManager = new ApiKeyManager();
const logger = new Logger();
const scriptExecutor = new ScriptExecutor();

// ===== Main.js =====
/**
 * Handles POST requests to the webhook endpoint
 */
function doPost(e) {
  try {
    const request = parseRequest(e);
    if (!request.success) {
      return ResponseBuilder.error(request.error);
    }

    const { script, title, apiKey } = request.data;

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

    apiKeyManager.updateUsage(validation.identifier);

    const context = scriptExecutor.createContext();
    const execution = scriptExecutor.execute(script, context);

    logger.log({
      title: title,
      script: script,
      result: execution.success ? execution.result : execution.error,
      success: execution.success,
      identifier: validation.identifier
    });

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

function parseRequest(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return { success: false, error: CONFIG.ERRORS.NO_POST_DATA };
    }

    const data = JSON.parse(e.postData.contents);
    
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
    
  logger.init();
}

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

function showApiKeysList() {
  const ui = SpreadsheetApp.getUi();
  const keys = apiKeyManager.getAll();
  
  if (keys.length === 0) {
    ui.alert('APIキー一覧', 'APIキーが登録されていません。', ui.ButtonSet.OK);
    return;
  }
  
  const keyList = keys.map(key => 
    `識別子: ${key.identifier}\nAPIキー: ${key.apiKey}\n作成日: ${key.createdAt}\n使用回数: ${key.usageCount}\n最終使用: ${key.lastUsed || 'Never'}`
  ).join('\n\n');
  
  ui.alert('APIキー一覧', keyList, ui.ButtonSet.OK);
}

function showLogStats() {
  const ui = SpreadsheetApp.getUi();
  const stats = logger.getStats();
  
  const message = `総ログ数: ${stats.total}\n成功: ${stats.success}\n失敗: ${stats.fail}\n成功率: ${stats.successRate}`;
  ui.alert('ログ統計', message, ui.ButtonSet.OK);
}

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

function showHelp() {
  const ui = SpreadsheetApp.getUi();
  const helpText = `GAS Executor ヘルプ\n\n` +
    `このシステムは、APIキー認証を使用してJavaScriptコードを安全に実行します。\n\n` +
    `使用方法:\n` +
    `1. メニューからAPIキーを作成\n` +
    `2. POSTリクエストで以下のJSONを送信:\n` +
    `   {\n` +
    `     "apiKey": "your-api-key",\n` +
    `     "title": "スクリプトのタイトル",\n` +
    `     "script": "実行するJavaScriptコード"\n` +
    `   }\n\n` +
    `詳細はドキュメントを参照してください。`;
    
  ui.alert('ヘルプ', helpText, ui.ButtonSet.OK);
}