/**
 * Mock Data Generation Tests
 * 
 * This file contains tests for the mock data generation functions used in the Mortgage Market Analysis Tool.
 * It verifies that the generated mock data matches the required structure and contains realistic values.
 */

// Import mock data generators
const { generateMockEsisData } = require('../src/utils/mockEsisData');
const { generateMockSwapRateData } = require('../src/utils/mockSwapRateData');

describe('ESIS Mock Data Generation', () => {
  test('generateMockEsisData should create the requested number of records', () => {
    const count = 50;
    const mockData = generateMockEsisData(count);
    expect(mockData).toHaveLength(count);
  });

  test('generateMockEsisData should create data with the correct structure', () => {
    const mockData = generateMockEsisData(1);
    const record = mockData[0];
    
    // Check that all required fields are present
    expect(record).toHaveProperty('Provider');
    expect(record).toHaveProperty('BaseLender');
    expect(record).toHaveProperty('DocumentDate');
    expect(record).toHaveProperty('Timestamp');
    expect(record).toHaveProperty('Rate');
    expect(record).toHaveProperty('InitialRate');
    expect(record).toHaveProperty('Loan');
    expect(record).toHaveProperty('LTV');
    expect(record).toHaveProperty('ProductType');
    expect(record).toHaveProperty('PurchaseType');
    expect(record).toHaveProperty('TieInPeriod');
  });

  test('generateMockEsisData should create data with values in the correct ranges', () => {
    const mockData = generateMockEsisData(100);
    
    mockData.forEach(record => {
      // Check loan amount range (£100,000 to £1,000,000)
      expect(record.Loan).toBeGreaterThanOrEqual(100000);
      expect(record.Loan).toBeLessThanOrEqual(1000000);
      
      // Check LTV range (50% to 95%)
      expect(record.LTV).toBeGreaterThanOrEqual(50);
      expect(record.LTV).toBeLessThanOrEqual(95);
      
      // Check rate range (1% to 7%)
      expect(record.Rate).toBeGreaterThanOrEqual(1);
      expect(record.Rate).toBeLessThanOrEqual(7);
    });
  });

  test('generateMockEsisData should create data with correct date formats', () => {
    const mockData = generateMockEsisData(10);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
    
    mockData.forEach(record => {
      expect(record.DocumentDate).toMatch(dateRegex);
      expect(record.Timestamp).toMatch(dateRegex);
    });
  });

  test('generateMockEsisData should use valid lender names', () => {
    const validLenders = [
      "Nationwide Building Society", 
      "Barclays Bank UK PLC", 
      "HSBC UK", 
      "NatWest", 
      "Santander UK", 
      "Halifax", 
      "Lloyds Bank"
    ];
    
    const mockData = generateMockEsisData(50);
    
    mockData.forEach(record => {
      expect(validLenders).toContain(record.Provider);
      expect(record.BaseLender).toBe(record.Provider);
    });
  });
});

describe('Swap Rate Mock Data Generation', () => {
  test('generateMockSwapRateData should create data with the correct structure', () => {
    const startDate = '2023-01-01';
    const endDate = '2023-01-03';
    const mockData = generateMockSwapRateData(startDate, endDate);
    const record = mockData[0];
    
    // Check that all required fields are present
    expect(record).toHaveProperty('Date');
    expect(record).toHaveProperty('effective_at');
    expect(record).toHaveProperty('product_term_in_months');
    expect(record).toHaveProperty('rate');
  });

  test('generateMockSwapRateData should create data with rates in the correct range', () => {
    const startDate = '2023-01-01';
    const endDate = '2023-01-05';
    const mockData = generateMockSwapRateData(startDate, endDate);
    
    mockData.forEach(record => {
      // Check rate range (0.5% to 4%)
      expect(record.rate).toBeGreaterThanOrEqual(0.5);
      expect(record.rate).toBeLessThanOrEqual(4);
    });
  });

  test('generateMockSwapRateData should create data with correct date formats', () => {
    const startDate = '2023-01-01';
    const endDate = '2023-01-05';
    const mockData = generateMockSwapRateData(startDate, endDate);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
    
    mockData.forEach(record => {
      expect(record.Date).toMatch(dateRegex);
      expect(record.effective_at).toMatch(dateRegex);
    });
  });

  test('generateMockSwapRateData should generate data for all days in the date range', () => {
    const startDate = '2023-01-01';
    const endDate = '2023-01-05';
    // 5 days × 2 product terms = 10 records
    const expectedRecordCount = 10;
    
    const mockData = generateMockSwapRateData(startDate, endDate);
    expect(mockData).toHaveLength(expectedRecordCount);
    
    // Check that each date in the range has entries
    const uniqueDates = [...new Set(mockData.map(record => record.Date))];
    expect(uniqueDates).toHaveLength(5); // 5 unique dates
  });

  test('generateMockSwapRateData should include both 24 and 60 month product terms for each date', () => {
    const startDate = '2023-01-01';
    const endDate = '2023-01-03';
    const mockData = generateMockSwapRateData(startDate, endDate);
    
    // Get unique dates
    const uniqueDates = [...new Set(mockData.map(record => record.Date))];
    
    // For each date, check that both product terms exist
    uniqueDates.forEach(date => {
      const recordsForDate = mockData.filter(record => record.Date === date);
      const productTerms = recordsForDate.map(record => record.product_term_in_months);
      
      expect(productTerms).toContain(24);
      expect(productTerms).toContain(60);
    });
  });
});
