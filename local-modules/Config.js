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