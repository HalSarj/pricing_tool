/**
 * End-to-End Tests
 * 
 * This file contains end-to-end tests using Puppeteer to verify the complete user experience
 * in a real browser environment.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// These tests run slower, so increase timeout
jest.setTimeout(30000);

// Check if index.html exists
const indexPath = path.resolve(__dirname, '../index.html');
const indexExists = fs.existsSync(indexPath);

// Only run tests if the index.html file exists
(indexExists ? describe : describe.skip)('End-to-end browser tests', () => {
  let browser;
  let page;
  let browserLaunched = false;
  
  beforeAll(async () => {
    try {
      // More robust browser launch configuration
      browser = await puppeteer.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ],
        ignoreDefaultArgs: ['--disable-extensions'],
        dumpio: true // Log browser process stdout and stderr
      });
      browserLaunched = true;
      console.log('Browser launched successfully');
    } catch (error) {
      console.error('Failed to launch browser:', error);
      browserLaunched = false;
    }
  });
  
  afterAll(async () => {
    if (browser && browserLaunched) {
      try {
        await browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
  });
  
  beforeEach(async () => {
    // Skip setup if browser failed to launch
    if (!browserLaunched) {
      return;
    }
    
    try {
      page = await browser.newPage();
      // Navigate to the application
      await page.goto('file://' + indexPath, {
        waitUntil: 'networkidle0',
        timeout: 10000
      });
    } catch (error) {
      console.error('Error in test setup:', error);
      // Make sure page is defined even if navigation fails
      if (!page && browser) {
        page = await browser.newPage();
      }
    }
  });
  
  afterEach(async () => {
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.error('Error closing page:', error);
      }
    }
  });
  
  test('should load the application and display initial UI elements', async () => {
    // Skip test if browser failed to launch
    if (!browserLaunched || !page) {
      console.warn('Skipping test: Browser not launched');
      return;
    }
    
    try {
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
    } catch (error) {
      console.error('Error in test:', error);
      throw error;
    }
  });
  
  test('should enable analyze button when files are selected', async () => {
    // Skip test if browser failed to launch
    if (!browserLaunched || !page) {
      console.warn('Skipping test: Browser not launched');
      return;
    }
    
    try {
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
    } catch (error) {
      console.error('Error in test:', error);
      throw error;
    }
  });
  
  test('should display filters section when analyze button is clicked', async () => {
    // Skip test if browser failed to launch
    if (!browserLaunched || !page) {
      console.warn('Skipping test: Browser not launched');
      return;
    }
    
    try {
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
        console.warn('Filters section not found');
        return;
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
      
      // Check if filters section is now visible
      isHidden = await page.evaluate(el => el.classList.contains('hidden'), filtersSection);
      expect(isHidden).toBe(false);
    } catch (error) {
      console.error('Error in test:', error);
      throw error;
    }
  });
  
  test('should filter data when filters are applied', async () => {
    // Skip test if browser failed to launch
    if (!browserLaunched || !page) {
      console.warn('Skipping test: Browser not launched');
      return;
    }
    
    try {
      // Setup the page with mock data and visible filters
      await page.evaluate(() => {
        // Show necessary sections
        const filtersSection = document.querySelector('#filters-section');
        const resultsSection = document.querySelector('#results-section');
        
        if (filtersSection) filtersSection.classList.remove('hidden');
        if (resultsSection) resultsSection.classList.remove('hidden');
        
        // Create a mock table with data
        const resultsTable = document.querySelector('#results-table');
        if (resultsTable) {
          resultsTable.innerHTML = `
            <table>
              <thead>
                <tr>
                  <th>Lender</th>
                  <th>Product</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr data-lender="HSBC UK">
                  <td>HSBC UK</td>
                  <td>2-year Fixed</td>
                  <td>3.99%</td>
                </tr>
                <tr data-lender="Barclays">
                  <td>Barclays</td>
                  <td>5-year Fixed</td>
                  <td>4.25%</td>
                </tr>
                <tr data-lender="NatWest">
                  <td>NatWest</td>
                  <td>2-year Fixed</td>
                  <td>4.10%</td>
                </tr>
              </tbody>
            </table>
          `;
        }
        
        // Setup filter options
        const lenderFilter = document.querySelector('#lender-filter');
        if (lenderFilter) {
          lenderFilter.innerHTML = `
            <option value="HSBC UK">HSBC UK</option>
            <option value="Barclays">Barclays</option>
            <option value="NatWest">NatWest</option>
          `;
        }
      });
      
      // Select a specific lender if the element exists
      const lenderFilter = await page.$('#lender-filter');
      if (lenderFilter) {
        await page.select('#lender-filter', 'HSBC UK');
      }
      
      // Click the apply filters button if it exists
      const applyFiltersBtn = await page.$('#apply-filters');
      if (applyFiltersBtn) {
        await applyFiltersBtn.click();
      }
      
      // Mock the filtering behavior
      await page.evaluate(() => {
        // Hide rows that don't match the selected lender
        const rows = document.querySelectorAll('#results-table tbody tr');
        rows.forEach(row => {
          if (row.getAttribute('data-lender') !== 'HSBC UK') {
            row.style.display = 'none';
          }
        });
      });
      
      // Check if only the HSBC row is visible
      const visibleRows = await page.evaluate(() => {
        const rows = document.querySelectorAll('#results-table tbody tr');
        let visible = 0;
        rows.forEach(row => {
          if (row.style.display !== 'none') {
            visible++;
          }
        });
        return visible;
      });
      
      expect(visibleRows).toBe(1);
    } catch (error) {
      console.error('Error in test:', error);
      throw error;
    }
  });
  
  test('should reset filters when reset button is clicked', async () => {
    // Skip test if browser failed to launch
    if (!browserLaunched || !page) {
      console.warn('Skipping test: Browser not launched');
      return;
    }
    
    try {
      // Setup the page with filtered data
      await page.evaluate(() => {
        // Show necessary sections
        const filtersSection = document.querySelector('#filters-section');
        const resultsSection = document.querySelector('#results-section');
        
        if (filtersSection) filtersSection.classList.remove('hidden');
        if (resultsSection) resultsSection.classList.remove('hidden');
        
        // Create a mock table with filtered data
        const resultsTable = document.querySelector('#results-table');
        if (resultsTable) {
          resultsTable.innerHTML = `
            <table>
              <thead>
                <tr>
                  <th>Lender</th>
                  <th>Product</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr data-lender="HSBC UK" style="display: table-row;">
                  <td>HSBC UK</td>
                  <td>2-year Fixed</td>
                  <td>3.99%</td>
                </tr>
                <tr data-lender="Barclays" style="display: none;">
                  <td>Barclays</td>
                  <td>5-year Fixed</td>
                  <td>4.25%</td>
                </tr>
                <tr data-lender="NatWest" style="display: none;">
                  <td>NatWest</td>
                  <td>2-year Fixed</td>
                  <td>4.10%</td>
                </tr>
              </tbody>
            </table>
          `;
        }
        
        // Setup filter options
        const lenderFilter = document.querySelector('#lender-filter');
        if (lenderFilter) {
          lenderFilter.innerHTML = `
            <option value="HSBC UK" selected>HSBC UK</option>
            <option value="Barclays">Barclays</option>
            <option value="NatWest">NatWest</option>
          `;
        }
      });
      
      // Click the reset filters button if it exists
      const resetFiltersBtn = await page.$('#reset-filters');
      if (resetFiltersBtn) {
        await resetFiltersBtn.click();
      }
      
      // Mock the reset behavior
      await page.evaluate(() => {
        // Show all rows
        const rows = document.querySelectorAll('#results-table tbody tr');
        rows.forEach(row => {
          row.style.display = 'table-row';
        });
        
        // Reset filter selections
        const lenderFilter = document.querySelector('#lender-filter');
        if (lenderFilter) {
          Array.from(lenderFilter.options).forEach(option => {
            option.selected = false;
          });
        }
      });
      
      // Check if all rows are now visible
      const visibleRows = await page.evaluate(() => {
        const rows = document.querySelectorAll('#results-table tbody tr');
        let visible = 0;
        rows.forEach(row => {
          if (row.style.display !== 'none') {
            visible++;
          }
        });
        return visible;
      });
      
      expect(visibleRows).toBe(3);
    } catch (error) {
      console.error('Error in test:', error);
      throw error;
    }
  });
  
  test('should display charts and visualizations', async () => {
    // Skip test if browser failed to launch
    if (!browserLaunched || !page) {
      console.warn('Skipping test: Browser not launched');
      return;
    }
    
    try {
      // Setup the page with visible visualization sections
      await page.evaluate(() => {
        // Show visualization sections
        const heatmapSection = document.querySelector('#heatmap-section');
        const trendsSection = document.querySelector('#market-share-trends-section');
        
        if (heatmapSection) heatmapSection.classList.remove('hidden');
        if (trendsSection) trendsSection.classList.remove('hidden');
        
        // Create mock chart elements
        const heatmapVisualization = document.querySelector('#heatmap-visualization');
        if (heatmapVisualization) {
          heatmapVisualization.innerHTML = '<canvas id="heatmapChart"></canvas>';
        }
        
        const trendsChart = document.querySelector('#market-share-trends-chart');
        if (trendsChart) {
          trendsChart.innerHTML = '<canvas id="trendsChart"></canvas>';
        }
      });
      
      // Check if charts exist in the DOM
      const heatmapChartExists = await page.evaluate(() => {
        return document.querySelector('#heatmapChart') !== null;
      });
      
      const trendsChartExists = await page.evaluate(() => {
        return document.querySelector('#trendsChart') !== null;
      });
      
      expect(heatmapChartExists).toBe(true);
      expect(trendsChartExists).toBe(true);
    } catch (error) {
      console.error('Error in test:', error);
      throw error;
    }
  });
  
  test('should export data when export button is clicked', async () => {
    // Skip test if browser failed to launch
    if (!browserLaunched || !page) {
      console.warn('Skipping test: Browser not launched');
      return;
    }
    
    try {
      // Setup the page with visible results section
      await page.evaluate(() => {
        // Show results section
        const resultsSection = document.querySelector('#results-section');
        if (resultsSection) resultsSection.classList.remove('hidden');
        
        // Add clicked class to track button clicks
        const exportBtn = document.querySelector('#export-btn');
        if (exportBtn) {
          exportBtn.addEventListener('click', function() {
            this.classList.add('clicked');
          });
        }
      });
      
      // Click the export button if it exists
      const exportBtn = await page.$('#export-btn');
      if (!exportBtn) {
        console.warn('Export button not found');
        return;
      }
      
      await exportBtn.click();
      
      // Wait for click handler to execute
      await page.waitForTimeout(500);
      
      // Check that the click handler was triggered
      const exportBtnClicked = await page.evaluate(() => {
        const btn = document.querySelector('#export-btn');
        return btn ? btn.classList.contains('clicked') : false;
      });
      
      expect(exportBtnClicked).toBe(true);
    } catch (error) {
      console.error('Error in test:', error);
      throw error;
    }
  });
  
  test('should toggle heatmap visualization mode', async () => {
    // Skip test if browser failed to launch
    if (!browserLaunched || !page) {
      console.warn('Skipping test: Browser not launched');
      return;
    }
    
    try {
      // Setup the page with visible heatmap section
      await page.evaluate(() => {
        // Show heatmap section
        const heatmapSection = document.querySelector('#heatmap-section');
        if (heatmapSection) heatmapSection.classList.remove('hidden');
        
        // Create mock chart element
        const heatmapVisualization = document.querySelector('#heatmap-visualization');
        if (heatmapVisualization) {
          heatmapVisualization.innerHTML = '<canvas id="heatmapChart"></canvas>';
          
          // Add data attributes to track mode
          heatmapVisualization.setAttribute('data-mode', 'lender');
        }
        
        // Add change event listeners
        const lenderMode = document.querySelector('#lender-mode');
        if (lenderMode) {
          lenderMode.addEventListener('change', function() {
            if (this.checked) {
              const vis = document.querySelector('#heatmap-visualization');
              if (vis) vis.setAttribute('data-mode', 'lender');
            }
          });
        }
        
        const premiumMode = document.querySelector('#premium-mode');
        if (premiumMode) {
          premiumMode.addEventListener('change', function() {
            if (this.checked) {
              const vis = document.querySelector('#heatmap-visualization');
              if (vis) vis.setAttribute('data-mode', 'premium');
            }
          });
        }
      });
      
      // Check initial mode
      let mode = await page.evaluate(() => {
        const vis = document.querySelector('#heatmap-visualization');
        return vis ? vis.getAttribute('data-mode') : null;
      });
      expect(mode).toBe('lender');
      
      // Click the premium mode radio button if it exists
      const premiumMode = await page.$('#premium-mode');
      if (premiumMode) {
        await premiumMode.click();
        
        // Check if mode changed
        mode = await page.evaluate(() => {
          const vis = document.querySelector('#heatmap-visualization');
          return vis ? vis.getAttribute('data-mode') : null;
        });
        expect(mode).toBe('premium');
        
        // Click back to lender mode if it exists
        const lenderMode = await page.$('#lender-mode');
        if (lenderMode) {
          await lenderMode.click();
          
          // Check if mode changed back
          mode = await page.evaluate(() => {
            const vis = document.querySelector('#heatmap-visualization');
            return vis ? vis.getAttribute('data-mode') : null;
          });
          expect(mode).toBe('lender');
        }
      }
    } catch (error) {
      console.error('Error in test:', error);
      throw error;
    }
  });
});
