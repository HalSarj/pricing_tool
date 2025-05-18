/**
 * Performance Tests
 * 
 * This file contains tests for the application performance with large datasets.
 * It verifies that the Mortgage Market Analysis Tool can handle 1000+ records efficiently.
 */

const { generateMockEsisData } = require('../src/utils/mockEsisData');
const { generateMockSwapRateData } = require('../src/utils/mockSwapRateData');
const { enrichEsisData } = require('../src/utils/dataProcessing');
const { filterData, filterByProductTerm, filterByDateRange, filterByPremiumBand } = require('../src/utils/filtering');
const { 
  prepareTableData, 
  prepareMarketShareTable, 
  prepareHeatmapData, 
  prepareTrendsChartData 
} = require('../src/utils/visualization');

describe('Data processing performance', () => {
  // Generate large test datasets
  const largeMockEsisData = generateMockEsisData(1000); // 1000 ESIS records
  const largeMockSwapRates = generateMockSwapRateData('2022-01-01', '2023-06-30'); // ~18 months of daily data
  
  test('should process 1000 ESIS records in under 500ms', () => {
    const startTime = performance.now();
    
    // Process all records
    const enrichedData = largeMockEsisData.map(esis => enrichEsisData(esis, largeMockSwapRates));
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    console.log(`Processed 1000 records in ${processingTime.toFixed(2)}ms`);
    expect(processingTime).toBeLessThan(500);
    expect(enrichedData).toHaveLength(1000);
  });
});

describe('Filtering performance', () => {
  // Generate and process large test dataset
  const largeMockEsisData = generateMockEsisData(1000);
  const largeMockSwapRates = generateMockSwapRateData('2022-01-01', '2023-06-30');
  let enrichedData;
  
  beforeAll(() => {
    // Process data once before all tests
    enrichedData = largeMockEsisData.map(esis => enrichEsisData(esis, largeMockSwapRates));
  });
  
  test('should filter 1000 records in under 50ms', () => {
    const filters = {
      lender: 'HSBC UK',
      productType: 'Fixed Rate',
      productTerm: '2-year',
      ltvMin: 70,
      ltvMax: 80
    };
    
    const startTime = performance.now();
    
    // Apply filters
    const filteredData = filterData(enrichedData, filters);
    
    const endTime = performance.now();
    const filteringTime = endTime - startTime;
    
    console.log(`Filtered 1000 records in ${filteringTime.toFixed(2)}ms`);
    expect(filteringTime).toBeLessThan(50);
  });
  
  test('should filter by product term in under 20ms', () => {
    const startTime = performance.now();
    
    // Filter by product term
    const filteredData = filterByProductTerm(enrichedData, '2-year');
    
    const endTime = performance.now();
    const filteringTime = endTime - startTime;
    
    console.log(`Filtered by product term in ${filteringTime.toFixed(2)}ms`);
    expect(filteringTime).toBeLessThan(20);
  });
  
  test('should filter by date range in under 20ms', () => {
    const startTime = performance.now();
    
    // Filter by date range
    const filteredData = filterByDateRange(enrichedData, '2022-06-01', '2022-12-31');
    
    const endTime = performance.now();
    const filteringTime = endTime - startTime;
    
    console.log(`Filtered by date range in ${filteringTime.toFixed(2)}ms`);
    expect(filteringTime).toBeLessThan(20);
  });
});

describe('Visualization preparation performance', () => {
  // Generate and process large test dataset
  const largeMockEsisData = generateMockEsisData(1000);
  const largeMockSwapRates = generateMockSwapRateData('2022-01-01', '2023-06-30');
  let enrichedData;
  
  beforeAll(() => {
    // Process data once before all tests
    enrichedData = largeMockEsisData.map(esis => enrichEsisData(esis, largeMockSwapRates));
  });
  
  test('should prepare table data in under 50ms', () => {
    const startTime = performance.now();
    
    // Prepare table data
    const tableData = prepareTableData(enrichedData);
    
    const endTime = performance.now();
    const preparationTime = endTime - startTime;
    
    console.log(`Prepared table data in ${preparationTime.toFixed(2)}ms`);
    expect(preparationTime).toBeLessThan(50);
    expect(tableData).toHaveLength(1000);
  });
  
  test('should prepare market share data in under 50ms', () => {
    const startTime = performance.now();
    
    // Prepare market share data
    const marketShareData = prepareMarketShareTable(enrichedData);
    
    const endTime = performance.now();
    const preparationTime = endTime - startTime;
    
    console.log(`Prepared market share data in ${preparationTime.toFixed(2)}ms`);
    expect(preparationTime).toBeLessThan(50);
  });
  
  test('should prepare heatmap data in under 100ms', () => {
    const startTime = performance.now();
    
    // Prepare heatmap data
    const heatmapData = prepareHeatmapData(enrichedData);
    
    const endTime = performance.now();
    const preparationTime = endTime - startTime;
    
    console.log(`Prepared heatmap data in ${preparationTime.toFixed(2)}ms`);
    expect(preparationTime).toBeLessThan(100);
  });
  
  test('should prepare trends chart data in under 100ms', () => {
    const startTime = performance.now();
    
    // Prepare trends chart data
    const trendsData = prepareTrendsChartData(enrichedData);
    
    const endTime = performance.now();
    const preparationTime = endTime - startTime;
    
    console.log(`Prepared trends chart data in ${preparationTime.toFixed(2)}ms`);
    expect(preparationTime).toBeLessThan(100);
  });
});
