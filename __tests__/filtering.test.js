/**
 * Filtering Tests
 * 
 * This file contains tests for the data filtering logic used in the Mortgage Market Analysis Tool.
 * It verifies functions like filterData, filterByProductTerm, filterByDateRange, and filterByPremiumBand.
 */

const {
  filterData,
  filterByProductTerm,
  filterByDateRange,
  filterByPremiumBand
} = require('../src/utils/filtering');

describe('Filtering Functions', () => {
  // Test basic filtering function
  describe('filterData', () => {
    const testData = [
      { Provider: 'HSBC UK', LTV: 75, ProductType: 'Fixed Rate', TieInPeriod: 24 },
      { Provider: 'Barclays Bank UK PLC', LTV: 90, ProductType: 'Fixed Rate', TieInPeriod: 60 },
      { Provider: 'NatWest', LTV: 60, ProductType: 'Variable Rate', TieInPeriod: 24 },
      { Provider: 'Santander UK', LTV: 85, ProductType: 'Fixed Rate', TieInPeriod: 60 }
    ];
    
    test('should filter by lender', () => {
      const filters = { lender: 'HSBC UK' };
      expect(filterData(testData, filters)).toHaveLength(1);
      expect(filterData(testData, filters)[0].Provider).toBe('HSBC UK');
    });
    
    test('should filter by LTV range', () => {
      const filters = { ltvMin: 80, ltvMax: 95 };
      const result = filterData(testData, filters);
      expect(result).toHaveLength(2);
      expect(result.every(item => item.LTV >= 80 && item.LTV <= 95)).toBe(true);
    });
    
    test('should filter by product type', () => {
      const filters = { productType: 'Fixed Rate' };
      const result = filterData(testData, filters);
      expect(result).toHaveLength(3);
      expect(result.every(item => item.ProductType === 'Fixed Rate')).toBe(true);
    });
    
    test('should filter by product term', () => {
      const filters = { productTerm: '5-year' };
      const result = filterData(testData, filters);
      expect(result).toHaveLength(2);
      expect(result.every(item => item.TieInPeriod === 60)).toBe(true);
    });
    
    test('should apply multiple filters', () => {
      const filters = { 
        productType: 'Fixed Rate',
        productTerm: '5-year',
        ltvMin: 80
      };
      const result = filterData(testData, filters);
      expect(result).toHaveLength(2);
      expect(result[0].Provider).toBe('Barclays Bank UK PLC');
      expect(result[1].Provider).toBe('Santander UK');
    });
    
    test('should return empty array when no matches found', () => {
      const filters = { lender: 'Non-existent Bank' };
      expect(filterData(testData, filters)).toHaveLength(0);
    });
    
    test('should return all data when no filters applied', () => {
      expect(filterData(testData, {})).toEqual(testData);
      expect(filterData(testData)).toEqual(testData);
    });
    
    test('should handle null or undefined inputs', () => {
      expect(filterData(null, { lender: 'HSBC UK' })).toEqual([]);
      expect(filterData(undefined, { lender: 'HSBC UK' })).toEqual([]);
      expect(filterData([], { lender: 'HSBC UK' })).toEqual([]);
    });
  });
  
  // Test product term filtering
  describe('filterByProductTerm', () => {
    const testData = [
      { TieInPeriod: 24, Provider: 'HSBC UK' },
      { TieInPeriod: 60, Provider: 'Barclays Bank UK PLC' },
      { TieInPeriod: 24, Provider: 'NatWest' },
      { TieInPeriod: 60, Provider: 'Santander UK' }
    ];
    
    test('should filter by 2-year term', () => {
      const result = filterByProductTerm(testData, '2-year');
      expect(result).toHaveLength(2);
      expect(result.every(item => item.TieInPeriod === 24)).toBe(true);
    });
    
    test('should filter by 5-year term', () => {
      const result = filterByProductTerm(testData, '5-year');
      expect(result).toHaveLength(2);
      expect(result.every(item => item.TieInPeriod === 60)).toBe(true);
    });
    
    test('should handle alternative term formats', () => {
      expect(filterByProductTerm(testData, '2 years')).toHaveLength(2);
      expect(filterByProductTerm(testData, '5 years')).toHaveLength(2);
      expect(filterByProductTerm(testData, '2yr fixed')).toHaveLength(2);
      expect(filterByProductTerm(testData, '5yr tracker')).toHaveLength(2);
    });
    
    test('should return empty array for unrecognized terms', () => {
      expect(filterByProductTerm(testData, '3-year')).toHaveLength(0);
      expect(filterByProductTerm(testData, 'invalid')).toHaveLength(0);
    });
    
    test('should return all data when no term specified', () => {
      expect(filterByProductTerm(testData, null)).toEqual(testData);
      expect(filterByProductTerm(testData, '')).toEqual([]);
    });
    
    test('should handle null or undefined inputs', () => {
      expect(filterByProductTerm(null, '2-year')).toEqual([]);
      expect(filterByProductTerm(undefined, '2-year')).toEqual([]);
      expect(filterByProductTerm([], '2-year')).toEqual([]);
    });
  });
  
  // Test date range filtering
  describe('filterByDateRange', () => {
    const testData = [
      { DocumentDate: '2023-01-15', Provider: 'HSBC UK' },
      { DocumentDate: '2023-02-10', Provider: 'Barclays Bank UK PLC' },
      { DocumentDate: '2023-03-05', Provider: 'NatWest' },
      { DocumentDate: '2023-04-20', Provider: 'Santander UK' }
    ];
    
    test('should filter by date range', () => {
      const result = filterByDateRange(testData, '2023-02-01', '2023-03-31');
      expect(result).toHaveLength(2);
      expect(result[0].DocumentDate).toBe('2023-02-10');
      expect(result[1].DocumentDate).toBe('2023-03-05');
    });
    
    test('should filter by start date only', () => {
      const result = filterByDateRange(testData, '2023-03-01', null);
      expect(result).toHaveLength(2);
      expect(result[0].DocumentDate).toBe('2023-03-05');
      expect(result[1].DocumentDate).toBe('2023-04-20');
    });
    
    test('should filter by end date only', () => {
      const result = filterByDateRange(testData, null, '2023-02-15');
      expect(result).toHaveLength(2);
      expect(result[0].DocumentDate).toBe('2023-01-15');
      expect(result[1].DocumentDate).toBe('2023-02-10');
    });
    
    test('should return all data when no date range specified', () => {
      expect(filterByDateRange(testData, null, null)).toEqual(testData);
    });
    
    test('should handle records without DocumentDate', () => {
      const dataWithMissingDates = [
        { DocumentDate: '2023-01-15' },
        { Provider: 'Missing Date' },
        { DocumentDate: '2023-03-05' }
      ];
      
      const result = filterByDateRange(dataWithMissingDates, '2023-01-01', '2023-12-31');
      expect(result).toHaveLength(2);
      expect(result.every(item => item.DocumentDate)).toBe(true);
    });
    
    test('should handle null or undefined inputs', () => {
      expect(filterByDateRange(null, '2023-01-01', '2023-12-31')).toEqual([]);
      expect(filterByDateRange(undefined, '2023-01-01', '2023-12-31')).toEqual([]);
      expect(filterByDateRange([], '2023-01-01', '2023-12-31')).toEqual([]);
    });
  });
  
  // Test premium band filtering
  describe('filterByPremiumBand', () => {
    const testData = [
      { PremiumBand: '0-1%' },
      { PremiumBand: '1-2%' },
      { PremiumBand: '2-3%' },
      { PremiumBand: '4%+' }
    ];
    
    test('should filter by single premium band', () => {
      const result = filterByPremiumBand(testData, ['1-2%']);
      expect(result).toHaveLength(1);
      expect(result[0].PremiumBand).toBe('1-2%');
    });
    
    test('should filter by multiple premium bands', () => {
      const result = filterByPremiumBand(testData, ['0-1%', '4%+']);
      expect(result).toHaveLength(2);
      expect(result[0].PremiumBand).toBe('0-1%');
      expect(result[1].PremiumBand).toBe('4%+');
    });
    
    test('should return all data when no premium bands specified', () => {
      expect(filterByPremiumBand(testData, [])).toEqual(testData);
    });
    
    test('should return empty array when no matches found', () => {
      expect(filterByPremiumBand(testData, ['invalid-band'])).toHaveLength(0);
    });
    
    test('should handle null or undefined inputs', () => {
      expect(filterByPremiumBand(null, ['0-1%'])).toEqual([]);
      expect(filterByPremiumBand(undefined, ['0-1%'])).toEqual([]);
      expect(filterByPremiumBand([], ['0-1%'])).toEqual([]);
      expect(filterByPremiumBand(testData, null)).toEqual(testData);
      expect(filterByPremiumBand(testData, undefined)).toEqual(testData);
    });
  });
});
