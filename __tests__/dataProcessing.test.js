/**
 * Data Processing Tests
 * 
 * This file contains tests for the data processing functions used in the Mortgage Market Analysis Tool.
 * It verifies functions like mapFieldNames, normalizeProductTerm, findMatchingSwapRate, and calculatePremiumOverSwap.
 */

const { generateMockEsisData } = require('../src/utils/mockEsisData');
const { generateMockSwapRateData } = require('../src/utils/mockSwapRateData');

// Import the functions to test
const { 
  mapFieldNames, 
  normalizeProductTerm, 
  findMatchingSwapRate, 
  calculatePremiumOverSwap 
} = require('../src/utils/dataProcessing');

describe('Data Processing Functions', () => {
  // Test mapFieldNames function
  describe('mapFieldNames', () => {
    test('should normalize field names correctly', () => {
      const input = { 'Provider': 'HSBC UK', 'Rate': 3.99 };
      const expected = { 'lender': 'HSBC UK', 'rate': 3.99 };
      expect(mapFieldNames(input)).toEqual(expected);
    });
    
    test('should handle missing fields gracefully', () => {
      const input = { 'Provider': 'HSBC UK' };
      const expected = { 'lender': 'HSBC UK' };
      expect(mapFieldNames(input)).toEqual(expected);
    });

    test('should handle fields not in the mapping', () => {
      const input = { 'Provider': 'HSBC UK', 'CustomField': 'value' };
      const expected = { 'lender': 'HSBC UK', 'customfield': 'value' };
      expect(mapFieldNames(input)).toEqual(expected);
    });

    test('should handle empty objects', () => {
      expect(mapFieldNames({})).toEqual({});
    });
  });
  
  // Test normalizeProductTerm function
  describe('normalizeProductTerm', () => {
    test('should convert TieInPeriod to product_term_in_months', () => {
      expect(normalizeProductTerm(24)).toBe(24);
      expect(normalizeProductTerm(60)).toBe(60);
    });
    
    test('should handle years format and convert to months', () => {
      expect(normalizeProductTerm('2 years')).toBe(24);
      expect(normalizeProductTerm('5 years')).toBe(60);
    });
    
    test('should handle edge cases', () => {
      expect(normalizeProductTerm('2-year fixed')).toBe(24);
      expect(normalizeProductTerm('5 year tracker')).toBe(60);
      expect(normalizeProductTerm('2yr')).toBe(24);
      expect(normalizeProductTerm('5yr')).toBe(60);
      expect(normalizeProductTerm(null)).toBe(null);
      expect(normalizeProductTerm(undefined)).toBe(null);
    });

    test('should return null for unrecognized terms', () => {
      expect(normalizeProductTerm('3 years')).toBe(null);
      expect(normalizeProductTerm('invalid')).toBe(null);
    });
  });
  
  // Test findMatchingSwapRate function
  describe('findMatchingSwapRate', () => {
    let swapRates;
    
    beforeEach(() => {
      // Generate sample swap rates for testing
      swapRates = [
        { Date: '2023-01-01', effective_at: '2023-01-01', product_term_in_months: 24, rate: 1.2 },
        { Date: '2023-01-01', effective_at: '2023-01-01', product_term_in_months: 60, rate: 1.5 },
        { Date: '2023-01-05', effective_at: '2023-01-05', product_term_in_months: 24, rate: 1.3 },
        { Date: '2023-01-05', effective_at: '2023-01-05', product_term_in_months: 60, rate: 1.6 },
        { Date: '2023-01-10', effective_at: '2023-01-10', product_term_in_months: 24, rate: 1.4 },
        { Date: '2023-01-10', effective_at: '2023-01-10', product_term_in_months: 60, rate: 1.7 }
      ];
    });
    
    test('should find exact match by date and term', () => {
      const esis = { DocumentDate: '2023-01-05', TieInPeriod: 24 };
      const result = findMatchingSwapRate(esis, swapRates);
      expect(result).toBeDefined();
      expect(result.Date).toBe('2023-01-05');
      expect(result.product_term_in_months).toBe(24);
      expect(result.rate).toBe(1.3);
    });
    
    test('should find closest date match when exact date not available', () => {
      // Assuming no swap rate for 2023-01-07 (between 2023-01-05 and 2023-01-10)
      const esis = { DocumentDate: '2023-01-07', TieInPeriod: 60 };
      const result = findMatchingSwapRate(esis, swapRates);
      expect(result).toBeDefined();
      expect(result.product_term_in_months).toBe(60);
      // Should return the closest available date
      expect(result.Date).toBe('2023-01-05');
      expect(result.rate).toBe(1.6);
    });
    
    test('should return null when no matching swap rate found', () => {
      const esis = { DocumentDate: '2022-01-01', TieInPeriod: 24 };
      const result = findMatchingSwapRate(esis, swapRates);
      expect(result).toBeNull();
    });

    test('should handle string term values', () => {
      const esis = { DocumentDate: '2023-01-05', TieInPeriod: '2 years' };
      const result = findMatchingSwapRate(esis, swapRates);
      expect(result).toBeDefined();
      expect(result.Date).toBe('2023-01-05');
      expect(result.product_term_in_months).toBe(24);
    });

    test('should handle invalid inputs', () => {
      expect(findMatchingSwapRate(null, swapRates)).toBeNull();
      expect(findMatchingSwapRate({}, swapRates)).toBeNull();
      expect(findMatchingSwapRate({ DocumentDate: '2023-01-05' }, swapRates)).toBeNull();
      expect(findMatchingSwapRate({ TieInPeriod: 24 }, swapRates)).toBeNull();
      expect(findMatchingSwapRate({ DocumentDate: '2023-01-05', TieInPeriod: 24 }, null)).toBeNull();
      expect(findMatchingSwapRate({ DocumentDate: '2023-01-05', TieInPeriod: 24 }, [])).toBeNull();
    });
  });
  
  // Test calculatePremiumOverSwap function
  describe('calculatePremiumOverSwap', () => {
    test('should calculate premium correctly', () => {
      const esis = { Rate: 3.99 };
      const swapRate = { rate: 1.5 };
      expect(calculatePremiumOverSwap(esis, swapRate)).toBeCloseTo(2.49);
    });
    
    test('should handle null or undefined inputs', () => {
      expect(calculatePremiumOverSwap({ Rate: 3.99 }, null)).toBeNull();
      expect(calculatePremiumOverSwap(null, { rate: 1.5 })).toBeNull();
      expect(calculatePremiumOverSwap(undefined, { rate: 1.5 })).toBeNull();
      expect(calculatePremiumOverSwap({ Rate: 3.99 }, undefined)).toBeNull();
    });
    
    test('should handle missing rate properties', () => {
      expect(calculatePremiumOverSwap({}, { rate: 1.5 })).toBeNull();
      expect(calculatePremiumOverSwap({ Rate: 3.99 }, {})).toBeNull();
    });

    test('should round to 2 decimal places', () => {
      const esis = { Rate: 3.999 };
      const swapRate = { rate: 1.501 };
      expect(calculatePremiumOverSwap(esis, swapRate)).toBe(2.5);
    });

    test('should handle negative premiums', () => {
      const esis = { Rate: 1.5 };
      const swapRate = { rate: 2.5 };
      expect(calculatePremiumOverSwap(esis, swapRate)).toBe(-1);
    });
  });

  // Integration test with mock data
  describe('Integration with mock data', () => {
    test('should process mock ESIS data with mock swap rates', () => {
      const mockEsis = generateMockEsisData(5);
      const startDate = new Date(2020, 0, 1);
      const endDate = new Date();
      const mockSwapRates = generateMockSwapRateData(startDate, endDate);
      
      mockEsis.forEach(esisRecord => {
        const mappedRecord = mapFieldNames(esisRecord);
        expect(mappedRecord).toBeDefined();
        expect(mappedRecord.lender).toBe(esisRecord.Provider);
        
        const normalizedTerm = normalizeProductTerm(esisRecord.TieInPeriod);
        expect(normalizedTerm).toBe(esisRecord.TieInPeriod);
        
        const matchingSwapRate = findMatchingSwapRate(esisRecord, mockSwapRates);
        // May be null if no match found, but if found should have correct properties
        if (matchingSwapRate) {
          expect(matchingSwapRate.product_term_in_months).toBe(esisRecord.TieInPeriod);
          
          const premium = calculatePremiumOverSwap(esisRecord, matchingSwapRate);
          expect(premium).toBeDefined();
          // Premium should be the difference between the rates
          expect(premium).toBeCloseTo(esisRecord.Rate - matchingSwapRate.rate, 1);
        }
      });
    });
  });
});
