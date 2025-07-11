/**
 * API Key Manager - Handles all API key operations
 */
class ApiKeyManager {
  constructor() {
    this.scriptProperties = PropertiesService.getScriptProperties();
  }

  /**
   * Validates an API key
   * @param {string} apiKey - The API key to validate
   * @returns {{valid: boolean, identifier: string|null}} Validation result
   */
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

  /**
   * Creates a new API key
   * @param {string} identifier - Unique identifier for the API key
   * @returns {string} The generated API key
   */
  create(identifier) {
    if (!identifier || typeof identifier !== 'string') {
      throw new Error('Identifier is required and must be a string');
    }

    // Check if identifier already exists
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

  /**
   * Deletes an API key by identifier
   * @param {string} identifier - The identifier of the key to delete
   * @returns {boolean} True if deleted, false if not found
   */
  delete(identifier) {
    if (this.scriptProperties.getProperty(identifier)) {
      this.scriptProperties.deleteProperty(identifier);
      return true;
    }
    return false;
  }

  /**
   * Deletes all API keys
   * @returns {number} Number of keys deleted
   */
  deleteAll() {
    const keys = this.scriptProperties.getKeys();
    keys.forEach(key => this.scriptProperties.deleteProperty(key));
    return keys.length;
  }

  /**
   * Gets all API keys
   * @returns {Array<Object>} Array of API key objects
   */
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

  /**
   * Updates usage statistics for an API key
   * @param {string} identifier - The identifier of the key
   */
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

// Create singleton instance
const apiKeyManager = new ApiKeyManager();