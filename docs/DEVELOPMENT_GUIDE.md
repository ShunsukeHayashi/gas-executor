# Development Guide

This guide covers the development workflow, architecture, and best practices for contributing to GAS Executor.

## Table of Contents
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Architecture Overview](#architecture-overview)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Development Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Google account with Apps Script enabled
- Git

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ShunsukeHayashi/gas-executor.git
   cd gas-executor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure clasp**
   ```bash
   clasp login
   ```

4. **Set up environment**
   ```bash
   # Copy the example environment file if available
   cp .env.example .env
   
   # Edit with your configuration
   ```

## Project Structure

```
gas-executor/
├── コード.js              # Main compiled file for GAS deployment
├── local-modules/         # Modular source code (local development)
│   ├── Config.js         # Configuration constants
│   ├── ApiKeyManager.js  # API key management
│   ├── Logger.js         # Logging functionality
│   ├── ScriptExecutor.js # Script execution engine
│   ├── ResponseBuilder.js # Response formatting
│   └── Main.js           # Entry points and handlers
├── docs/                 # Documentation
├── appsscript.json       # GAS manifest
├── package.json          # Node dependencies
├── .claspignore         # Files to ignore during push
└── .gitignore           # Git ignore rules
```

### File Purposes

- **コード.js**: Combined file that gets deployed to Google Apps Script
- **local-modules/**: Separated modules for better development experience
- **appsscript.json**: Configures GAS runtime, permissions, and deployment settings

## Development Workflow

### 1. Feature Development

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes in local-modules/
# The modules are automatically combined into コード.js

# Test locally if possible
npm test  # If tests are configured
```

### 2. Code Style

Follow these conventions:
- Use ES6+ features supported by V8 runtime
- Maintain consistent indentation (2 spaces)
- Add JSDoc comments for all public functions
- Use meaningful variable names
- Keep functions small and focused

Example:
```javascript
/**
 * Validates and executes a user script
 * @param {string} script - JavaScript code to execute
 * @param {Object} context - Execution context
 * @returns {{success: boolean, result: any, error: string?}}
 */
function executeScript(script, context) {
  // Implementation
}
```

### 3. Module Development

When creating new modules:

1. Create file in `local-modules/`
2. Follow the class-based pattern:
   ```javascript
   class YourModule {
     constructor() {
       // Initialize
     }
     
     yourMethod() {
       // Implementation
     }
   }
   
   // Export singleton if needed
   const yourModule = new YourModule();
   ```

3. Add to コード.js in the appropriate section

### 4. Configuration Management

Add new configuration to `Config.js`:
```javascript
const CONFIG = {
  YOUR_SECTION: {
    YOUR_KEY: 'value'
  }
};
```

## Architecture Overview

### Core Components

1. **API Layer**
   - `doPost(e)`: Webhook entry point
   - Request parsing and validation
   - Response formatting

2. **Security Layer**
   - `ApiKeyManager`: CRUD operations for API keys
   - Authentication and authorization
   - Usage tracking

3. **Execution Layer**
   - `ScriptExecutor`: Safe script execution
   - Context injection
   - Error handling

4. **Logging Layer**
   - `Logger`: Spreadsheet-based logging
   - Automatic rotation
   - Performance metrics

### Data Flow

```
HTTP Request → doPost() → Validation → Authentication → 
Execution → Logging → Response
```

### State Management

- **API Keys**: Stored in Script Properties
- **Logs**: Stored in Google Sheets
- **Configuration**: Hard-coded in CONFIG object

## Testing

### Manual Testing

1. **Local Script Testing**
   ```bash
   # Push to GAS
   npm run push
   
   # Open in editor
   npm run open
   
   # Run test functions
   ```

2. **API Testing**
   ```bash
   # Using curl
   curl -X POST https://script.google.com/macros/s/YOUR_ID/exec \
     -H "Content-Type: application/json" \
     -d '{"apiKey":"YOUR_KEY","title":"Test","script":"return 1+1;"}'
   ```

3. **Integration Testing**
   - Test with ChatGPT Custom GPT
   - Test with external applications
   - Verify error handling

### Test Scenarios

1. **Valid requests**
   - Simple calculations
   - Google service interactions
   - Complex workflows

2. **Error cases**
   - Invalid API key
   - Malformed requests
   - Script errors
   - Permission errors

3. **Edge cases**
   - Large scripts
   - Long execution times
   - Concurrent requests

## Deployment

### Development Deployment

```bash
# Push changes
npm run push

# Deploy new version
npm run deploy
```

### Production Deployment

1. **Pre-deployment checklist**
   - [ ] All tests pass
   - [ ] Code reviewed
   - [ ] Documentation updated
   - [ ] Migration guide prepared (if breaking changes)

2. **Deployment steps**
   ```bash
   # Tag the release
   git tag -a v1.0.0 -m "Release version 1.0.0"
   
   # Push to GAS
   npm run push
   
   # Deploy via UI or CLI
   clasp deploy --description "Version 1.0.0"
   ```

3. **Post-deployment**
   - Test the deployment URL
   - Update documentation with new URL
   - Monitor logs for errors
   - Notify users of changes

### Rollback Procedure

```bash
# List versions
clasp versions

# Deploy previous version
clasp deploy --versionNumber NUMBER --description "Rollback to stable"
```

## Contributing

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Functions have JSDoc comments
- [ ] No hardcoded secrets
- [ ] Error handling is comprehensive
- [ ] Changes are backward compatible
- [ ] Documentation is updated

### Pull Request Process

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Update documentation
5. Submit PR with:
   - Clear description
   - Test evidence
   - Breaking changes noted

### Common Patterns

**Error Handling**
```javascript
try {
  // Operation
} catch (error) {
  console.error('Operation failed:', error);
  return ResponseBuilder.error(error.message);
}
```

**Logging**
```javascript
logger.log({
  title: 'Operation Name',
  script: scriptContent,
  result: result,
  success: true,
  identifier: apiKeyIdentifier
});
```

**Validation**
```javascript
if (!data.requiredField) {
  throw new Error('Required field missing');
}
```

## Performance Optimization

### Best Practices

1. **Batch Operations**
   ```javascript
   // Good
   sheet.getRange(1, 1, rows.length, cols.length).setValues(data);
   
   // Bad
   for (let i = 0; i < rows.length; i++) {
     sheet.getRange(i + 1, 1).setValue(rows[i]);
   }
   ```

2. **Cache Expensive Operations**
   ```javascript
   // Cache spreadsheet reference
   if (!this.spreadsheet) {
     this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
   }
   ```

3. **Limit API Calls**
   - Use batch methods
   - Cache results
   - Implement request coalescing

### Monitoring

- Check execution time in responses
- Monitor log sheet size
- Track API key usage patterns
- Review error frequencies

## Troubleshooting

### Common Issues

**"Cannot read property of null"**
- Check if services are initialized
- Verify permissions
- Ensure resources exist

**"Exceeded maximum execution time"**
- Break into smaller operations
- Use time-based triggers for long tasks
- Implement progress tracking

**"Permission denied"**
- Check OAuth scopes in manifest
- Verify deployment settings
- Ensure user has access to resources

### Debug Techniques

1. **Add console logging**
   ```javascript
   console.log('Debug:', variable);
   ```

2. **Use try-catch blocks**
   ```javascript
   try {
     // Suspicious code
   } catch (e) {
     console.error('Detailed error:', e.stack);
   }
   ```

3. **Check execution transcript**
   ```bash
   clasp logs
   ```

## Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [clasp Documentation](https://github.com/google/clasp)
- [V8 Runtime Documentation](https://developers.google.com/apps-script/guides/v8-runtime)
- [Google Workspace APIs](https://developers.google.com/workspace)