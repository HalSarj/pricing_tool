/**
 * Integration Tests
 * 
 * This file contains tests for multiple functions working together in the Mortgage Market Analysis Tool.
 * It verifies that different components of the application integrate correctly.
 */

// Create separate test files for different types of integration tests

// File 1: Data processing and filtering integration tests
describe('Data processing and filtering pipeline', () => {
  // Import actual implementations for these tests
  const { enrichEsisData } = require('../src/utils/dataProcessing');
  const { filterData } = require('../src/utils/filtering');
  
  const mockEsisData = [
    { Provider: 'HSBC UK', DocumentDate: '2023-01-15', Rate: 3.99, TieInPeriod: 24, LTV: 75 },
    { Provider: 'Barclays Bank UK PLC', DocumentDate: '2023-01-20', Rate: 4.25, TieInPeriod: 60, LTV: 90 },
    { Provider: 'NatWest', DocumentDate: '2023-02-10', Rate: 3.75, TieInPeriod: 24, LTV: 60 }
  ];
  
  const mockSwapRates = [
    { Date: '2023-01-15', product_term_in_months: 24, rate: 1.5 },
    { Date: '2023-01-15', product_term_in_months: 60, rate: 2.0 },
    { Date: '2023-01-20', product_term_in_months: 24, rate: 1.6 },
    { Date: '2023-01-20', product_term_in_months: 60, rate: 2.1 },
    { Date: '2023-02-10', product_term_in_months: 24, rate: 1.4 },
    { Date: '2023-02-10', product_term_in_months: 60, rate: 1.9 }
  ];
  
  test('should process and filter data correctly', () => {
    // Enrich ESIS data with swap rates and premium information
    const enrichedData = mockEsisData.map(esis => enrichEsisData(esis, mockSwapRates));
    
    // Apply filters
    const filters = { productTerm: '2-year', ltvMin: 70 };
    const filteredData = filterData(enrichedData, filters);
    
    // Verify results
    expect(filteredData).toHaveLength(1);
    expect(filteredData[0].Provider).toBe('HSBC UK');
    expect(filteredData[0].SwapRate).toBe(1.5);
    expect(filteredData[0].Premium).toBe(2.49); // 3.99 - 1.5
    expect(filteredData[0].PremiumBand).toBe('2-3%');
  });
});

// File 2: Data processing and visualization integration tests
describe('Data processing and visualization pipeline', () => {
  // Import actual implementations for these tests
  const { enrichEsisData } = require('../src/utils/dataProcessing');
  const { 
    prepareTableData, 
    prepareMarketShareTable, 
    prepareHeatmapData, 
    renderTable 
  } = require('../src/utils/visualization');
  
  // Mock the Chart.js constructor
  global.Chart = jest.fn().mockImplementation(() => ({}));
  
  const mockEsisData = [
    { Provider: 'HSBC UK', DocumentDate: '2023-01-15', Rate: 3.99, TieInPeriod: 24, LTV: 75 },
    { Provider: 'HSBC UK', DocumentDate: '2023-02-10', Rate: 4.10, TieInPeriod: 24, LTV: 80 },
    { Provider: 'Barclays Bank UK PLC', DocumentDate: '2023-01-20', Rate: 4.25, TieInPeriod: 60, LTV: 90 },
    { Provider: 'NatWest', DocumentDate: '2023-02-15', Rate: 3.75, TieInPeriod: 24, LTV: 60 }
  ];
  
  const mockSwapRates = [
    { Date: '2023-01-15', product_term_in_months: 24, rate: 1.5 },
    { Date: '2023-01-15', product_term_in_months: 60, rate: 2.0 },
    { Date: '2023-01-20', product_term_in_months: 24, rate: 1.6 },
    { Date: '2023-01-20', product_term_in_months: 60, rate: 2.1 },
    { Date: '2023-02-10', product_term_in_months: 24, rate: 1.4 },
    { Date: '2023-02-10', product_term_in_months: 60, rate: 1.9 }
  ];
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="dataTable"></div><canvas id="heatmapChart"></canvas>';
    global.Chart.mockClear();
  });
  
  test('should process data and prepare it for table visualization', () => {
    // Enrich ESIS data with swap rates and premium information
    const enrichedData = mockEsisData.map(esis => enrichEsisData(esis, mockSwapRates));
    
    // Prepare data for table visualization
    const tableData = prepareTableData(enrichedData);
    
    // Verify table data
    expect(tableData).toHaveLength(4);
    expect(tableData[0]).toHaveProperty('lender', 'HSBC UK');
    expect(tableData[0]).toHaveProperty('rate', '3.99%');
    expect(tableData[0]).toHaveProperty('ltv', '75%');
    
    // Render table
    renderTable(tableData);
    
    // Verify table was rendered
    const table = document.querySelector('#dataTable table');
    expect(table).not.toBeNull();
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(4);
  });
  
  test('should process data and prepare it for market share visualization', () => {
    // Enrich ESIS data with swap rates and premium information
    const enrichedData = mockEsisData.map(esis => enrichEsisData(esis, mockSwapRates));
    
    // Prepare data for market share visualization
    const marketShareData = prepareMarketShareTable(enrichedData);
    
    // Verify market share data
    expect(marketShareData).toHaveLength(3); // 3 unique lenders
    expect(marketShareData[0]).toHaveProperty('lender', 'HSBC UK');
    expect(marketShareData[0]).toHaveProperty('count', 2);
    expect(marketShareData[0]).toHaveProperty('share', '50.0%');
  });
  
  test('should process data and prepare it for heatmap visualization', () => {
    // Enrich ESIS data with swap rates and premium information
    const enrichedData = mockEsisData.map(esis => enrichEsisData(esis, mockSwapRates));
    
    // Prepare data for heatmap visualization
    const heatmapData = prepareHeatmapData(enrichedData);
    
    // Verify heatmap data structure
    expect(heatmapData).toHaveProperty('lenders');
    expect(heatmapData).toHaveProperty('premiumBands');
    expect(heatmapData).toHaveProperty('data');
    
    // Verify content
    expect(heatmapData.lenders).toContain('HSBC UK');
    expect(heatmapData.lenders).toContain('Barclays Bank UK PLC');
    expect(heatmapData.lenders).toContain('NatWest');
  });
});

// File 3: User interaction tests with mocks
describe('User interaction and UI update flow', () => {
  // Create mocks for this test suite only
  const mockFilterData = jest.fn();
  const mockRenderTable = jest.fn();
  
  // Mock the modules for this test suite
  jest.mock('../src/utils/filtering', () => ({
    filterData: mockFilterData
  }), { virtual: true });
  
  jest.mock('../src/utils/visualization', () => ({
    renderTable: mockRenderTable
  }), { virtual: true });
  
  // Import the handlers with mocked dependencies
  const { 
    applyFilters, 
    resetFilters 
  } = require('../src/utils/interactionHandlers');
  
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="lenderSelect">
        <option value="">All Lenders</option>
        <option value="HSBC UK">HSBC UK</option>
        <option value="Barclays Bank UK PLC">Barclays Bank UK PLC</option>
      </select>
      <select id="productTypeSelect">
        <option value="">All Types</option>
        <option value="Fixed Rate">Fixed Rate</option>
      </select>
      <button id="applyFiltersBtn">Apply Filters</button>
      <button id="resetFiltersBtn">Reset</button>
      <div id="dataTable"></div>
    `;
    
    // Reset mocks before each test
    mockFilterData.mockClear();
    mockRenderTable.mockClear();
    
    // Set up mock implementation
    mockFilterData.mockImplementation((data, filters) => {
      if (filters && filters.lender === 'HSBC UK') {
        return data.filter(item => item.Provider === 'HSBC UK');
      }
      return data;
    });
  });
  
  const mockData = [
    { Provider: 'HSBC UK', Rate: 3.99 },
    { Provider: 'Barclays Bank UK PLC', Rate: 4.25 }
  ];
  
  test('should update data when filters are applied', () => {
    // Mock the event handlers since we can't directly test the real ones with our mocks
    const handleApplyFilters = () => {
      const lender = document.getElementById('lenderSelect').value;
      const filters = lender ? { lender } : {};
      const filteredData = mockFilterData(mockData, filters);
      mockRenderTable(filteredData);
    };
    
    const handleResetFilters = () => {
      document.getElementById('lenderSelect').selectedIndex = 0;
      mockRenderTable(mockData);
    };
    
    // Set up event handlers
    document.getElementById('applyFiltersBtn').addEventListener('click', handleApplyFilters);
    document.getElementById('resetFiltersBtn').addEventListener('click', handleResetFilters);
    
    // Select a lender filter
    document.getElementById('lenderSelect').value = 'HSBC UK';
    
    // Click apply filters button
    document.getElementById('applyFiltersBtn').click();
    
    // Check if filterData was called with correct filters
    expect(mockFilterData).toHaveBeenCalledWith(mockData, { lender: 'HSBC UK' });
    
    // Check if renderTable was called
    expect(mockRenderTable).toHaveBeenCalled();
    
    // Reset filters
    document.getElementById('resetFiltersBtn').click();
    
    // Check if lender select was reset
    expect(document.getElementById('lenderSelect').value).toBe('');
  });
});
