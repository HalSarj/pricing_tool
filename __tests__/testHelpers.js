/**
 * Test helper functions for the Mortgage Market Analysis Tool test suite
 */

/**
 * Creates a minimal DOM structure for testing UI components
 * @param {Object} options - Configuration options
 * @param {boolean} options.includeTable - Whether to include table container
 * @param {boolean} options.includeFilters - Whether to include filter elements
 * @param {boolean} options.includeCharts - Whether to include chart canvases
 * @returns {void}
 */
function setupTestDOM(options = {}) {
  const {
    includeTable = true,
    includeFilters = false,
    includeCharts = false
  } = options;
  
  document.body.innerHTML = '';
  
  if (includeTable) {
    const tableDiv = document.createElement('div');
    tableDiv.id = 'dataTable';
    document.body.appendChild(tableDiv);
  }
  
  if (includeFilters) {
    // Create lender select
    const lenderSelect = document.createElement('select');
    lenderSelect.id = 'lenderSelect';
    lenderSelect.innerHTML = `
      <option value="">All Lenders</option>
      <option value="HSBC UK">HSBC UK</option>
      <option value="Barclays Bank UK PLC">Barclays Bank UK PLC</option>
      <option value="NatWest">NatWest</option>
    `;
    document.body.appendChild(lenderSelect);
    
    // Create product type select
    const productTypeSelect = document.createElement('select');
    productTypeSelect.id = 'productTypeSelect';
    productTypeSelect.innerHTML = `
      <option value="">All Product Types</option>
      <option value="Fixed Rate">Fixed Rate</option>
      <option value="Variable Rate">Variable Rate</option>
    `;
    document.body.appendChild(productTypeSelect);
    
    // Create product term select
    const productTermSelect = document.createElement('select');
    productTermSelect.id = 'productTermSelect';
    productTermSelect.innerHTML = `
      <option value="">All Terms</option>
      <option value="2">2 Year</option>
      <option value="5">5 Year</option>
    `;
    document.body.appendChild(productTermSelect);
    
    // Create date range inputs
    const startDateInput = document.createElement('input');
    startDateInput.id = 'startDateInput';
    startDateInput.type = 'date';
    document.body.appendChild(startDateInput);
    
    const endDateInput = document.createElement('input');
    endDateInput.id = 'endDateInput';
    endDateInput.type = 'date';
    document.body.appendChild(endDateInput);
    
    // Create filter button
    const filterButton = document.createElement('button');
    filterButton.id = 'filterButton';
    filterButton.textContent = 'Apply Filters';
    document.body.appendChild(filterButton);
    
    // Create reset button
    const resetButton = document.createElement('button');
    resetButton.id = 'resetButton';
    resetButton.textContent = 'Reset Filters';
    document.body.appendChild(resetButton);
  }
  
  if (includeCharts) {
    // Create premium band chart
    const premiumBandCanvas = document.createElement('canvas');
    premiumBandCanvas.id = 'premiumBandChart';
    document.body.appendChild(premiumBandCanvas);
    
    // Create market share chart
    const marketShareCanvas = document.createElement('canvas');
    marketShareCanvas.id = 'marketShareChart';
    document.body.appendChild(marketShareCanvas);
  }
}

/**
 * Creates test ESIS data for use in tests
 * @param {number} count - Number of records to generate
 * @param {Object} options - Options to customize the generated data
 * @returns {Array} Array of ESIS data objects
 */
function createTestEsisData(count = 10, options = {}) {
  const {
    lenders = ['HSBC UK', 'Barclays Bank UK PLC', 'NatWest', 'Santander UK'],
    productTypes = ['Fixed Rate', 'Variable Rate'],
    purchaseTypes = ['First Time Buyer', 'Home Mover', 'Remortgage'],
    startDate = new Date('2023-01-01'),
    endDate = new Date('2023-12-31'),
    loanMin = 100000,
    loanMax = 500000,
    rateMin = 1.5,
    rateMax = 6.5
  } = options;
  
  const result = [];
  
  for (let i = 0; i < count; i++) {
    // Generate random date between startDate and endDate
    const documentDate = new Date(
      startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
    );
    
    // Format date as YYYY-MM-DD
    const formattedDate = documentDate.toISOString().split('T')[0];
    
    // Generate random values
    const lender = lenders[Math.floor(Math.random() * lenders.length)];
    const productType = productTypes[Math.floor(Math.random() * productTypes.length)];
    const purchaseType = purchaseTypes[Math.floor(Math.random() * purchaseTypes.length)];
    const loan = Math.floor(loanMin + Math.random() * (loanMax - loanMin));
    const initialRate = (rateMin + Math.random() * (rateMax - rateMin)).toFixed(2);
    const tieInPeriod = Math.random() > 0.5 ? 24 : 60; // 2 or 5 years
    
    result.push({
      DocumentDate: formattedDate,
      BaseLender: lender,
      ProductType: productType,
      PurchaseType: purchaseType,
      Loan: loan,
      InitialRate: initialRate,
      TieInPeriod: tieInPeriod
    });
  }
  
  return result;
}

/**
 * Creates test swap rates data for use in tests
 * @param {Object} options - Options to customize the generated data
 * @returns {Array} Array of swap rate data objects
 */
function createTestSwapRates(options = {}) {
  const {
    includeTerms = [24, 60], // 2 and 5 year terms
    startDate = new Date('2023-01-01'),
    endDate = new Date('2023-12-31'),
    baseRate2Year = 1.0,
    baseRate5Year = 1.5,
    volatility = 0.5 // Amount of random variation
  } = options;
  
  const result = [];
  
  // Generate monthly rates for the date range
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const formattedDate = currentDate.toISOString().split('T')[0];
    
    // Add random variation to base rates
    const randomFactor = 1 + (Math.random() * volatility * 2 - volatility);
    
    // Add entries for each term
    if (includeTerms.includes(24)) {
      result.push({
        product_term_in_months: 24,
        rate: (baseRate2Year * randomFactor).toFixed(4),
        effective_at: formattedDate
      });
    }
    
    if (includeTerms.includes(60)) {
      result.push({
        product_term_in_months: 60,
        rate: (baseRate5Year * randomFactor).toFixed(4),
        effective_at: formattedDate
      });
    }
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return result;
}

/**
 * Mocks Chart.js for testing visualization functions
 */
function mockChartJS() {
  global.Chart = jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    destroy: jest.fn()
  }));
  
  // Mock static methods
  global.Chart.register = jest.fn();
}

/**
 * Mocks Tabulator for testing table rendering functions
 */
function mockTabulator() {
  global.Tabulator = jest.fn().mockImplementation(() => ({
    setData: jest.fn(),
    on: jest.fn(),
    redraw: jest.fn(),
    download: jest.fn()
  }));
}

/**
 * Simulates a user interaction with a form element
 * @param {string} selector - CSS selector for the element
 * @param {string|number} value - Value to set
 */
function setFormValue(selector, value) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  
  if (element.tagName === 'SELECT') {
    element.value = value;
    element.dispatchEvent(new Event('change'));
  } else if (element.tagName === 'INPUT') {
    element.value = value;
    element.dispatchEvent(new Event('input'));
  } else {
    throw new Error(`Unsupported element type: ${element.tagName}`);
  }
}

/**
 * Simulates a click on a button or other clickable element
 * @param {string} selector - CSS selector for the element
 */
function simulateClick(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  
  element.click();
  element.dispatchEvent(new Event('click'));
}

module.exports = {
  setupTestDOM,
  createTestEsisData,
  createTestSwapRates,
  mockChartJS,
  mockTabulator,
  setFormValue,
  simulateClick
};
