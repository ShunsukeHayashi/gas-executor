/**
 * Script Executor - Handles safe execution of user scripts
 */
class ScriptExecutor {
  /**
   * Executes a script safely with error handling
   * @param {string} script - The JavaScript code to execute
   * @param {Object} context - Execution context (optional)
   * @returns {{success: boolean, result: *, error: string|null, executionTime: number}}
   */
  execute(script, context = {}) {
    const startTime = new Date().getTime();
    
    try {
      // Validate script
      this.validateScript(script);
      
      // Create a function from the script
      // Note: This is potentially dangerous and should be used with caution
      const scriptFunction = new Function('context', `
        // Inject context variables
        ${Object.keys(context).map(key => `const ${key} = context['${key}'];`).join('\n')}
        
        // User script
        ${script}
      `);
      
      // Execute the script
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

  /**
   * Validates a script before execution
   * @param {string} script - The script to validate
   * @throws {Error} If validation fails
   */
  validateScript(script) {
    if (!script || typeof script !== 'string') {
      throw new Error('Script must be a non-empty string');
    }

    if (script.length > CONFIG.LIMITS.MAX_SCRIPT_LENGTH) {
      throw new Error(`Script exceeds maximum length of ${CONFIG.LIMITS.MAX_SCRIPT_LENGTH} characters`);
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /\beval\s*\(/,           // eval()
      /\bFunction\s*\(/,       // Function constructor (except our own usage)
      /\bimport\s*\(/,         // Dynamic imports
      /\brequire\s*\(/,        // CommonJS require
      /\.__proto__/,           // Prototype pollution
      /\bconstructor\s*\[/,    // Constructor access
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(script)) {
        throw new Error(`Script contains potentially dangerous pattern: ${pattern}`);
      }
    }
  }

  /**
   * Formats an error for user-friendly display
   * @param {Error} error - The error to format
   * @returns {string} Formatted error message
   */
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

  /**
   * Creates a safe execution context with Google Apps Script services
   * @returns {Object} Context object with GAS services
   */
  createContext() {
    return {
      // Spreadsheet services
      SpreadsheetApp: SpreadsheetApp,
      
      // Gmail services
      GmailApp: GmailApp,
      
      // Drive services
      DriveApp: DriveApp,
      
      // Calendar services
      CalendarApp: CalendarApp,
      
      // Document services
      DocumentApp: DocumentApp,
      
      // Forms services
      FormApp: FormApp,
      
      // URL Fetch service
      UrlFetchApp: UrlFetchApp,
      
      // Utilities
      Utilities: Utilities,
      
      // Console for logging
      console: console,
      
      // Date object
      Date: Date,
      
      // JSON object
      JSON: JSON,
      
      // Math object
      Math: Math,
      
      // Array constructor
      Array: Array,
      
      // Object constructor
      Object: Object
    };
  }
}

// Create singleton instance
const scriptExecutor = new ScriptExecutor();