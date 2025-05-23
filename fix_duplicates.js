// Script to fix duplicate variable declarations
const fs = require('fs');
const path = require('path');

// Read the script.js file
const scriptPath = path.join(process.cwd(), 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Split the content into lines for easier processing
const lines = scriptContent.split('\n');

// Find the line numbers for the duplicate declarations
// Line 3635 (0-based would be 3634)
// Line 3749 (0-based would be 3748)

// Function to check if a line contains a variable declaration
function isVariableDeclaration(line) {
  return line.trim().startsWith('const useMarketSized =');
}

// Function to replace a variable declaration with a comment
function replaceWithComment(lines, startLine, endLine) {
  for (let i = startLine; i <= endLine; i++) {
    if (isVariableDeclaration(lines[i])) {
      lines[i] = '    // Using useMarketSized from the top of the function';
      break;
    }
  }
  return lines;
}

// Fix the first duplicate (around line 3635)
let fixedLines = replaceWithComment(lines, 3630, 3640);

// Fix the second duplicate (around line 3749)
fixedLines = replaceWithComment(fixedLines, 3745, 3755);

// Join the lines back into a single string
const fixedContent = fixedLines.join('\n');

// Write the fixed content back to the file
fs.writeFileSync(scriptPath, fixedContent);

console.log('Fixed duplicate variable declarations!');
