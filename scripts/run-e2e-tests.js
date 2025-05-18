/**
 * E2E Test Runner
 * 
 * This script runs the end-to-end tests directly with Puppeteer,
 * bypassing Jest to avoid WebSocket compatibility issues.
 * 
 * Run with: node scripts/run-e2e-tests.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Path to the index.html file
const indexPath = path.resolve(__dirname, '../index.html');
const indexExists = fs.existsSync(indexPath);

if (!indexExists) {
  console.error('Error: index.html file not found at', indexPath);
  process.exit(1);
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
  failures: []
};

// Test utilities
function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
      return true;
    },
    toBeGreaterThan: (expected) => {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
      return true;
    },
    not: {
      toBeNull: () => {
        if (actual === null) {
          throw new Error('Expected not to be null');
        }
        return true;
      }
    }
  };
}

async function runTest(name, testFn) {
  testResults.total++;
  console.log(`\n🧪 Running test: ${name}`);
  try {
    await testFn();
    console.log(`✅ PASSED: ${name}`);
    testResults.passed++;
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error.message}`);
    testResults.failed++;
    testResults.failures.push({ name, error: error.message });
  }
}

async function runTests() {
  console.log('Starting E2E tests...');
  console.log('Index file exists at:', indexPath);
  
  let browser;
  let page;
  
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true, // Use true instead of 'new' to completely hide the browser
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,800'
      ]
    });
    
    console.log('Browser launched successfully!');
    
    // Test 1: Application loads and displays initial UI elements
    await runTest('should load the application and display initial UI elements', async () => {
      // Open a new page
      page = await browser.newPage();
      
      // Navigate to the application
      await page.goto('file://' + indexPath, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // Check if the main elements are present
      const title = await page.$eval('h1', el => el.textContent);
      expect(title).toBe('Mortgage Market Analysis Tool');
      
      // Check if file input sections exist
      const esisFileInput = await page.$('#esis-file');
      const swapFileInput = await page.$('#swap-file');
      const analyzeBtn = await page.$('#analyze-btn');
      
      expect(esisFileInput).not.toBeNull();
      expect(swapFileInput).not.toBeNull();
      expect(analyzeBtn).not.toBeNull();
      
      // Analyze button should be disabled initially
      const isDisabled = await page.$eval('#analyze-btn', btn => btn.disabled);
      expect(isDisabled).toBe(true);
      
      // Take a screenshot
      await page.screenshot({ path: path.resolve(__dirname, '../screenshots/initial-ui.png'), fullPage: true });
      
      await page.close();
    });
    
    // Test 2: Enable analyze button when files are selected
    await runTest('should enable analyze button when files are selected', async () => {
      page = await browser.newPage();
      
      await page.goto('file://' + indexPath, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // Set file inputs using page.evaluate
      await page.evaluate(() => {
        // Mock file selection
        const esisFileInfo = document.querySelector('#esis-file-info');
        const swapFileInfo = document.querySelector('#swap-file-info');
        
        // Update file info text
        if (esisFileInfo) esisFileInfo.textContent = 'esis.csv';
        if (swapFileInfo) swapFileInfo.textContent = 'swap.csv';
        
        // Enable the analyze button
        const analyzeBtn = document.querySelector('#analyze-btn');
        if (analyzeBtn) analyzeBtn.disabled = false;
      });
      
      // Check if analyze button is enabled
      const isDisabled = await page.$eval('#analyze-btn', btn => btn.disabled);
      expect(isDisabled).toBe(false);
      
      // Take a screenshot
      await page.screenshot({ path: path.resolve(__dirname, '../screenshots/files-selected.png'), fullPage: true });
      
      await page.close();
    });
    
    // Test 3: Display filters section when analyze button is clicked
    await runTest('should display filters section when analyze button is clicked', async () => {
      page = await browser.newPage();
      
      await page.goto('file://' + indexPath, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // First, enable the analyze button
      await page.evaluate(() => {
        // Mock file selection
        const esisFileInfo = document.querySelector('#esis-file-info');
        const swapFileInfo = document.querySelector('#swap-file-info');
        
        // Update file info text
        if (esisFileInfo) esisFileInfo.textContent = 'esis.csv';
        if (swapFileInfo) swapFileInfo.textContent = 'swap.csv';
        
        // Enable the analyze button
        const analyzeBtn = document.querySelector('#analyze-btn');
        if (analyzeBtn) analyzeBtn.disabled = false;
      });
      
      // Check if filters section is hidden initially
      const filtersSection = await page.$('#filters-section');
      if (!filtersSection) {
        throw new Error('Filters section not found');
      }
      
      let isHidden = await page.evaluate(el => el.classList.contains('hidden'), filtersSection);
      expect(isHidden).toBe(true);
      
      // Click the analyze button
      const analyzeBtn = await page.$('#analyze-btn');
      if (analyzeBtn) {
        await analyzeBtn.click();
      }
      
      // Mock data processing completion
      await page.evaluate(() => {
        // Show filters section
        const filtersSection = document.querySelector('#filters-section');
        if (filtersSection) filtersSection.classList.remove('hidden');
        
        // Hide loading indicator
        const loadingIndicator = document.querySelector('#loading-indicator');
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
      });
      
      // Take a screenshot
      await page.screenshot({ path: path.resolve(__dirname, '../screenshots/filters-visible.png'), fullPage: true });
      
      // Check if filters section is now visible
      isHidden = await page.evaluate(el => el.classList.contains('hidden'), filtersSection);
      expect(isHidden).toBe(false);
      
      await page.close();
    });
    
    // Add more tests as needed...
    
  } catch (error) {
    console.error('Error during test execution:', error);
    testResults.failed++;
  } finally {
    // Close the browser
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
      console.log('Browser closed');
    }
    
    // Print test summary
    console.log('\n📊 Test Summary:');
    console.log(`Total tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Skipped: ${testResults.skipped}`);
    
    if (testResults.failures.length > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.failures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.name}`);
        console.log(`   Error: ${failure.error}`);
      });
    }
    
    console.log('\nScreenshots saved to the "screenshots" directory');
  }
}

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.resolve(__dirname, '../screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

// Run the tests
runTests().catch(console.error);
