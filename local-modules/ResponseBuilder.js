/**
 * Response Builder - Creates standardized JSON responses
 */
class ResponseBuilder {
  /**
   * Creates a success response
   * @param {*} result - The result data
   * @param {Object} metadata - Additional metadata
   * @returns {TextOutput} Google Apps Script TextOutput
   */
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

  /**
   * Creates an error response
   * @param {string} error - The error message
   * @param {number} statusCode - HTTP status code (optional)
   * @param {Object} details - Additional error details
   * @returns {TextOutput} Google Apps Script TextOutput
   */
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

  /**
   * Creates a validation error response
   * @param {Array<string>} errors - Array of validation errors
   * @returns {TextOutput} Google Apps Script TextOutput
   */
  static validationError(errors) {
    return this.error('Validation failed', 422, {
      validationErrors: errors
    });
  }

  /**
   * Creates an unauthorized response
   * @returns {TextOutput} Google Apps Script TextOutput
   */
  static unauthorized() {
    return this.error(CONFIG.ERRORS.INVALID_API_KEY, 401);
  }

  /**
   * Creates a rate limit response
   * @param {number} retryAfter - Seconds until retry is allowed
   * @returns {TextOutput} Google Apps Script TextOutput
   */
  static rateLimitExceeded(retryAfter = 60) {
    return this.error('Rate limit exceeded', 429, {
      retryAfter: retryAfter
    });
  }

  /**
   * Creates a server error response
   * @param {string} message - Error message
   * @returns {TextOutput} Google Apps Script TextOutput
   */
  static serverError(message = 'Internal server error') {
    return this.error(message, 500);
  }
}