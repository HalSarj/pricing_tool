/**
 * Simple Puppeteer test script
 * 
 * This script tests if Puppeteer can launch a browser and navigate to the application.
 * Run with: node scripts/test-puppeteer.js
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

async function runTest() {
  console.log('Starting Puppeteer test...');
  console.log('Index file exists at:', indexPath);
  
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true, // Use true instead of 'new' to completely hide the browser
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,800'
      ],
      ignoreDefaultArgs: ['--disable-extensions'],
      dumpio: true // Log browser process stdout and stderr
    });
    
    console.log('Browser launched successfully!');
    
    // Open a new page
    const page = await browser.newPage();
    console.log('New page opened');
    
    // Navigate to the application
    console.log('Navigating to:', 'file://' + indexPath);
    await page.goto('file://' + indexPath, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('Navigation complete');
    
    // Take a screenshot
    const screenshotPath = path.resolve(__dirname, '../screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);
    
    // Check page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Wait for user to see the browser
    console.log('Test complete. Browser will close in 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Close the browser
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
      console.log('Browser closed');
    }
  }
}

runTest().catch(console.error);
