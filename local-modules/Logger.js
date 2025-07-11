/**
 * Logger - Handles logging to Google Sheets
 */
class Logger {
  constructor() {
    this.spreadsheet = null;
    this.sheet = null;
  }

  /**
   * Initializes the logger with the active spreadsheet
   */
  init() {
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    this.sheet = this.spreadsheet.getSheetByName(CONFIG.SHEETS.LOG);
    
    if (!this.sheet) {
      this.createLogSheet();
    }
  }

  /**
   * Creates a new log sheet with proper formatting
   */
  createLogSheet() {
    this.sheet = this.spreadsheet.insertSheet(CONFIG.SHEETS.LOG);
    this.sheet.appendRow(CONFIG.LOG_COLUMNS);
    
    // Format header
    const headerRange = this.sheet.getRange(1, 1, 1, CONFIG.LOG_COLUMNS.length);
    headerRange.setBackground(CONFIG.COLORS.HEADER_BG)
               .setFontColor(CONFIG.COLORS.HEADER_TEXT)
               .setFontWeight('bold');
    
    // Set column widths
    this.sheet.setColumnWidth(1, 150); // Title
    this.sheet.setColumnWidth(2, 300); // Script
    this.sheet.setColumnWidth(3, 300); // Result
    this.sheet.setColumnWidth(4, 80);  // Status
    this.sheet.setColumnWidth(5, 150); // Timestamp
    this.sheet.setColumnWidth(6, 150); // Identifier
    
    this.applyConditionalFormatting();
  }

  /**
   * Logs an execution entry
   * @param {Object} logEntry - The log entry object
   * @param {string} logEntry.title - Script title
   * @param {string} logEntry.script - Script content
   * @param {*} logEntry.result - Execution result
   * @param {boolean} logEntry.success - Success status
   * @param {string} logEntry.identifier - API key identifier
   */
  log(logEntry) {
    if (!this.sheet) {
      this.init();
    }

    const { title, script, result, success, identifier } = logEntry;
    const status = success ? CONFIG.STATUS.SUCCESS : CONFIG.STATUS.FAIL;
    const resultString = typeof result === 'object' ? JSON.stringify(result) : String(result);
    
    // Truncate long values
    const truncatedScript = script.length > 1000 ? script.substring(0, 997) + '...' : script;
    const truncatedResult = resultString.length > 1000 ? resultString.substring(0, 997) + '...' : resultString;
    
    // Insert new row at the top (after header)
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
    
    // Manage log size
    this.trimLogs();
  }

  /**
   * Applies conditional formatting to the log sheet
   */
  applyConditionalFormatting() {
    const range = this.sheet.getRange(`A:F`);
    const rules = this.sheet.getConditionalFormatRules();
    
    // Clear existing rules
    this.sheet.clearConditionalFormatRules();
    
    // Success rule (green background)
    const successRule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=INDIRECT("D"&ROW())="${CONFIG.STATUS.SUCCESS}"`)
      .setBackground(CONFIG.COLORS.SUCCESS_BG)
      .setRanges([range])
      .build();
    
    // Failure rule (red background)
    const failRule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=INDIRECT("D"&ROW())="${CONFIG.STATUS.FAIL}"`)
      .setBackground(CONFIG.COLORS.FAIL_BG)
      .setRanges([range])
      .build();
    
    this.sheet.setConditionalFormatRules([successRule, failRule]);
  }

  /**
   * Clears all log entries
   */
  clearAll() {
    if (!this.sheet) {
      this.init();
    }
    
    this.sheet.clear();
    this.createLogSheet();
  }

  /**
   * Trims logs to maintain maximum entries
   */
  trimLogs() {
    const lastRow = this.sheet.getLastRow();
    if (lastRow > CONFIG.LIMITS.MAX_LOG_ENTRIES + 1) { // +1 for header
      const rowsToDelete = lastRow - CONFIG.LIMITS.MAX_LOG_ENTRIES - 1;
      this.sheet.deleteRows(CONFIG.LIMITS.MAX_LOG_ENTRIES + 2, rowsToDelete);
    }
  }

  /**
   * Gets log statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    if (!this.sheet) {
      this.init();
    }
    
    const dataRange = this.sheet.getDataRange();
    const values = dataRange.getValues();
    
    let successCount = 0;
    let failCount = 0;
    
    // Skip header row
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

// Create singleton instance
const logger = new Logger();