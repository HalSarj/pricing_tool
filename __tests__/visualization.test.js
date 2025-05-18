/**
 * Visualization Tests
 * 
 * This file contains tests for the UI rendering functions used in the Mortgage Market Analysis Tool.
 * It verifies functions like prepareTableData, prepareMarketShareTable, prepareHeatmapData, and prepareTrendsChartData.
 * It also tests DOM rendering functions like renderTable, populatePremiumBandSelect, renderHeatmap, and renderTabulatorTable.
 */

const {
  prepareTableData,
  prepareMarketShareTable,
  prepareHeatmapData,
  prepareTrendsChartData,
  renderTable,
  populatePremiumBandSelect,
  renderHeatmap,
  renderTabulatorTable
} = require('../src/utils/visualization');

describe('prepareTableData', () => {
  const testData = [
    { Provider: 'HSBC UK', Rate: 3.99, LTV: 75, PremiumBand: '2-3%' },
    { Provider: 'Barclays Bank UK PLC', Rate: 4.25, LTV: 90, PremiumBand: '3-4%' },
    { Provider: 'NatWest', Rate: 3.75, LTV: 60, PremiumBand: '1-2%' }
  ];
  
  test('should format data correctly for table display', () => {
    const result = prepareTableData(testData);
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('lender', 'HSBC UK');
    expect(result[0]).toHaveProperty('rate', '3.99%');
    expect(result[0]).toHaveProperty('ltv', '75%');
    expect(result[0]).toHaveProperty('premiumBand', '2-3%');
  });
  
  test('should handle empty data array', () => {
    expect(prepareTableData([])).toEqual([]);
  });
});

describe('prepareMarketShareTable', () => {
  const testData = [
    { Provider: 'HSBC UK' },
    { Provider: 'HSBC UK' },
    { Provider: 'Barclays Bank UK PLC' },
    { Provider: 'NatWest' }
  ];
  
  test('should calculate and format market share data correctly', () => {
    const result = prepareMarketShareTable(testData);
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('lender', 'HSBC UK');
    expect(result[0]).toHaveProperty('count', 2);
    expect(result[0]).toHaveProperty('share', '50.0%');
    
    expect(result[1]).toHaveProperty('lender', 'Barclays Bank UK PLC');
    expect(result[1]).toHaveProperty('count', 1);
    expect(result[1]).toHaveProperty('share', '25.0%');
  });
  
  test('should handle empty data array', () => {
    expect(prepareMarketShareTable([])).toEqual([]);
  });
});

describe('prepareHeatmapData', () => {
  const testData = [
    { Provider: 'HSBC UK', PremiumBand: '2-3%' },
    { Provider: 'HSBC UK', PremiumBand: '3-4%' },
    { Provider: 'Barclays Bank UK PLC', PremiumBand: '2-3%' },
    { Provider: 'NatWest', PremiumBand: '3-4%' }
  ];
  
  test('should prepare data correctly for heatmap', () => {
    const result = prepareHeatmapData(testData);
    
    // Check structure
    expect(result).toHaveProperty('lenders');
    expect(result).toHaveProperty('premiumBands');
    expect(result).toHaveProperty('data');
    
    // Check content
    expect(result.lenders).toContain('HSBC UK');
    expect(result.lenders).toContain('Barclays Bank UK PLC');
    expect(result.lenders).toContain('NatWest');
    
    expect(result.premiumBands).toContain('2-3%');
    expect(result.premiumBands).toContain('3-4%');
    
    // Check data points
    expect(result.data).toHaveLength(4);
    expect(result.data[0]).toHaveProperty('lender');
    expect(result.data[0]).toHaveProperty('premiumBand');
    expect(result.data[0]).toHaveProperty('count');
  });
  
  test('should handle empty data array', () => {
    const result = prepareHeatmapData([]);
    expect(result.lenders).toEqual([]);
    expect(result.premiumBands).toEqual([]);
    expect(result.data).toEqual([]);
  });
});

describe('prepareTrendsChartData', () => {
  const testData = [
    { Provider: 'HSBC UK', Rate: 3.99, DocumentDate: '2023-01-15' },
    { Provider: 'HSBC UK', Rate: 4.10, DocumentDate: '2023-02-10' },
    { Provider: 'Barclays Bank UK PLC', Rate: 4.25, DocumentDate: '2023-01-20' },
    { Provider: 'Barclays Bank UK PLC', Rate: 4.35, DocumentDate: '2023-02-15' }
  ];
  
  test('should prepare data correctly for trends chart', () => {
    const result = prepareTrendsChartData(testData);
    
    // Check structure
    expect(result).toHaveProperty('labels');
    expect(result).toHaveProperty('datasets');
    
    // Check content
    expect(result.labels).toContain('Jan 2023');
    expect(result.labels).toContain('Feb 2023');
    
    expect(result.datasets).toHaveLength(2);
    expect(result.datasets[0]).toHaveProperty('label', 'HSBC UK');
    expect(result.datasets[1]).toHaveProperty('label', 'Barclays Bank UK PLC');
    
    // Check data points
    expect(result.datasets[0].data).toHaveLength(2);
    expect(result.datasets[1].data).toHaveLength(2);
  });
  
  test('should handle empty data array', () => {
    const result = prepareTrendsChartData([]);
    expect(result.labels).toEqual([]);
    expect(result.datasets).toEqual([]);
  });
});

// DOM Rendering Tests

describe('renderTable', () => {
  beforeEach(() => {
    // Set up a clean DOM environment for each test
    document.body.innerHTML = '<div id="dataTable"></div>';
  });
  
  test('should render table with correct data', () => {
    const tableData = [
      { lender: 'HSBC UK', rate: '3.99%', ltv: '75%' },
      { lender: 'Barclays Bank UK PLC', rate: '4.25%', ltv: '90%' }
    ];
    
    renderTable(tableData);
    
    // Check if table was created
    const table = document.querySelector('#dataTable table');
    expect(table).not.toBeNull();
    
    // Check table headers
    const headers = table.querySelectorAll('th');
    expect(headers[0].textContent).toBe('Lender');
    expect(headers[1].textContent).toBe('Rate');
    expect(headers[2].textContent).toBe('Ltv');
    
    // Check table rows
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].cells[0].textContent).toBe('HSBC UK');
    expect(rows[0].cells[1].textContent).toBe('3.99%');
    expect(rows[0].cells[2].textContent).toBe('75%');
  });
  
  test('should handle empty data array', () => {
    renderTable([]);
    const table = document.querySelector('#dataTable table');
    expect(table).not.toBeNull();
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(0);
  });
});

describe('populatePremiumBandSelect', () => {
  beforeEach(() => {
    document.body.innerHTML = '<select id="premiumBandSelect"></select>';
  });
  
  test('should populate select with premium band options', () => {
    const premiumBands = ['0-1%', '1-2%', '2-3%', '3-4%', '4%+'];
    
    populatePremiumBandSelect(premiumBands);
    
    // Check select element
    const select = document.getElementById('premiumBandSelect');
    const options = select.querySelectorAll('option');
    
    // Should have 'All' option + premium bands
    expect(options).toHaveLength(premiumBands.length + 1);
    expect(options[0].value).toBe('all');
    expect(options[0].textContent).toBe('All Premium Bands');
    
    // Check premium band options
    for (let i = 0; i < premiumBands.length; i++) {
      expect(options[i + 1].value).toBe(premiumBands[i]);
      expect(options[i + 1].textContent).toBe(premiumBands[i]);
    }
  });
  
  test('should handle empty premium bands array', () => {
    populatePremiumBandSelect([]);
    const select = document.getElementById('premiumBandSelect');
    const options = select.querySelectorAll('option');
    
    // Should only have 'All' option
    expect(options).toHaveLength(1);
    expect(options[0].value).toBe('all');
  });
});

describe('renderHeatmap', () => {
  // Mock Chart.js
  global.Chart = jest.fn().mockImplementation(() => ({}));
  
  beforeEach(() => {
    document.body.innerHTML = '<canvas id="heatmapChart"></canvas>';
    global.Chart.mockClear();
  });
  
  test('should create Chart.js heatmap with correct data', () => {
    const heatmapData = {
      lenders: ['HSBC UK', 'Barclays Bank UK PLC'],
      premiumBands: ['0-1%', '1-2%'],
      data: [
        { lender: 'HSBC UK', premiumBand: '0-1%', count: 5 },
        { lender: 'HSBC UK', premiumBand: '1-2%', count: 3 },
        { lender: 'Barclays Bank UK PLC', premiumBand: '0-1%', count: 2 },
        { lender: 'Barclays Bank UK PLC', premiumBand: '1-2%', count: 8 }
      ]
    };
    
    renderHeatmap(heatmapData);
    
    // Check if Chart constructor was called
    expect(Chart).toHaveBeenCalledTimes(1);
    
    // Check chart configuration
    const chartConfig = Chart.mock.calls[0][1];
    expect(chartConfig.type).toBe('heatmap');
    expect(chartConfig.data).toBeDefined();
    expect(chartConfig.options).toBeDefined();
  });
});

describe('renderTabulatorTable', () => {
  // Mock Tabulator
  global.Tabulator = jest.fn().mockImplementation(() => ({
    setData: jest.fn()
  }));
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="dataTable"></div>';
    global.Tabulator.mockClear();
  });
  
  test('should create Tabulator table with correct data', () => {
    const tableData = [
      { lender: 'HSBC UK', rate: '3.99%', ltv: '75%' },
      { lender: 'Barclays Bank UK PLC', rate: '4.25%', ltv: '90%' }
    ];
    
    renderTabulatorTable(tableData);
    
    // Check if Tabulator constructor was called
    expect(Tabulator).toHaveBeenCalledTimes(1);
    
    // Check Tabulator configuration
    const tabulatorConfig = Tabulator.mock.calls[0][1];
    expect(tabulatorConfig.data).toEqual(tableData);
    expect(tabulatorConfig.columns).toBeDefined();
    expect(tabulatorConfig.layout).toBe('fitColumns');
  });
});
