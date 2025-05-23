// Create a temporary file with the fixes
const fs = require('fs');
const path = require('path');

// Read the script.js file
const scriptPath = path.join(process.cwd(), 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Add the shouldUseMarketSized helper function if it doesn't exist
let updatedContent = scriptContent;
if (!updatedContent.includes('function shouldUseMarketSized()')) {
  const helperFunction = `
/**
 * Helper function to check if market sizing should be applied
 * This centralizes the logic for determining whether to use market-sized data
 * @returns {boolean} - Whether to use market-sized data
 */
function shouldUseMarketSized() {
    return state.marketSizing && 
           state.marketSizing.enabled && 
           state.marketSizing.viewEnabled;
}
`;
  
  // Find a good place to insert the helper function - after the invalidateFilterCache function
  const insertPosition = updatedContent.indexOf('function invalidateFilterCache()');
  if (insertPosition !== -1) {
    const endOfFunction = updatedContent.indexOf('}', insertPosition);
    if (endOfFunction !== -1) {
      const nextEndOfLine = updatedContent.indexOf('\n', endOfFunction);
      if (nextEndOfLine !== -1) {
        updatedContent = updatedContent.slice(0, nextEndOfLine + 1) + helperFunction + updatedContent.slice(nextEndOfLine + 1);
      }
    }
  }
}

// Replace all instances of the market sizing check with the helper function
const marketSizingPattern = /const useMarketSized = state\.marketSizing && \s*state\.marketSizing\.enabled && \s*state\.marketSizing\.viewEnabled;/g;
updatedContent = updatedContent.replace(marketSizingPattern, 'const useMarketSized = shouldUseMarketSized();');

// Write the updated content back to the file
fs.writeFileSync(scriptPath, updatedContent);

console.log('Market sizing fixes applied successfully!');
