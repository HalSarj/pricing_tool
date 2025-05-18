/**
 * Calculation Tests
 * 
 * This file contains tests for the numerical calculation functions used in the Mortgage Market Analysis Tool.
 * It verifies functions for calculating averages, market share, premium distribution, trends, and statistics.
 */

const {
  calculateAverageRate,
  calculateMarketShare,
  calculatePremiumDistribution,
  calculateMonthlyTrend,
  calculateStatistics
} = require('../src/utils/calculation');

describe('Calculation Functions', () => {
  // Test average calculation functions
  describe('calculateAverageRate', () => {
    test('should calculate correct average rate', () => {
      const data = [
        { Rate: 3.99 },
        { Rate: 4.25 },
        { Rate: 3.75 }
      ];
      expect(calculateAverageRate(data)).toBe(4.00); // 3.99 + 4.25 + 3.75 / 3 = 4.00
    });
    
    test('should handle empty array', () => {
      expect(calculateAverageRate([])).toBeNull();
    });

    test('should handle null or undefined input', () => {
      expect(calculateAverageRate(null)).toBeNull();
      expect(calculateAverageRate(undefined)).toBeNull();
    });

    test('should handle missing Rate property', () => {
      const data = [
        { Rate: 3.99 },
        { },
        { Rate: 3.75 }
      ];
      expect(calculateAverageRate(data)).toBe(2.58); // (3.99 + 0 + 3.75) / 3 = 2.58
    });
  });

  // Test market share calculation
  describe('calculateMarketShare', () => {
    test('should calculate correct market share percentages', () => {
      const data = [
        { Provider: 'HSBC UK' },
        { Provider: 'HSBC UK' },
        { Provider: 'Barclays Bank UK PLC' },
        { Provider: 'NatWest' }
      ];
      
      const expected = [
        { lender: 'HSBC UK', count: 2, share: 50 },
        { lender: 'Barclays Bank UK PLC', count: 1, share: 25 },
        { lender: 'NatWest', count: 1, share: 25 }
      ];
      
      const result = calculateMarketShare(data);
      
      // Sort both arrays to ensure consistent comparison
      const sortedExpected = expected.sort((a, b) => a.lender.localeCompare(b.lender));
      const sortedResult = result.sort((a, b) => a.lender.localeCompare(b.lender));
      
      expect(sortedResult).toEqual(sortedExpected);
    });
    
    test('should handle empty array', () => {
      expect(calculateMarketShare([])).toEqual([]);
    });

    test('should handle null or undefined input', () => {
      expect(calculateMarketShare(null)).toEqual([]);
      expect(calculateMarketShare(undefined)).toEqual([]);
    });

    test('should handle missing Provider property', () => {
      const data = [
        { Provider: 'HSBC UK' },
        { },
        { Provider: 'NatWest' }
      ];
      
      const result = calculateMarketShare(data);
      expect(result.length).toBe(2); // Only two providers with valid names
    });
  });

  // Test premium distribution calculation
  describe('calculatePremiumDistribution', () => {
    test('should calculate correct premium distribution', () => {
      const data = [
        { PremiumBand: '0-1%' },
        { PremiumBand: '0-1%' },
        { PremiumBand: '1-2%' },
        { PremiumBand: '2-3%' },
        { PremiumBand: '4%+' }
      ];
      
      const expected = {
        '0-1%': { count: 2, percentage: 40 },
        '1-2%': { count: 1, percentage: 20 },
        '2-3%': { count: 1, percentage: 20 },
        '3-4%': { count: 0, percentage: 0 },
        '4%+': { count: 1, percentage: 20 }
      };
      
      expect(calculatePremiumDistribution(data)).toEqual(expected);
    });

    test('should handle empty array', () => {
      const expected = {
        '0-1%': { count: 0, percentage: 0 },
        '1-2%': { count: 0, percentage: 0 },
        '2-3%': { count: 0, percentage: 0 },
        '3-4%': { count: 0, percentage: 0 },
        '4%+': { count: 0, percentage: 0 }
      };
      expect(calculatePremiumDistribution([])).toEqual(expected);
    });

    test('should handle null or undefined input', () => {
      const expected = {
        '0-1%': { count: 0, percentage: 0 },
        '1-2%': { count: 0, percentage: 0 },
        '2-3%': { count: 0, percentage: 0 },
        '3-4%': { count: 0, percentage: 0 },
        '4%+': { count: 0, percentage: 0 }
      };
      expect(calculatePremiumDistribution(null)).toEqual(expected);
      expect(calculatePremiumDistribution(undefined)).toEqual(expected);
    });

    test('should handle invalid premium bands', () => {
      const data = [
        { PremiumBand: '0-1%' },
        { PremiumBand: 'invalid' },
        { PremiumBand: '2-3%' }
      ];
      
      const result = calculatePremiumDistribution(data);
      expect(result['0-1%'].count).toBe(1);
      expect(result['2-3%'].count).toBe(1);
      // Other bands should be 0
      expect(result['1-2%'].count).toBe(0);
    });
  });

  // Test trend calculation
  describe('calculateMonthlyTrend', () => {
    test('should calculate correct monthly trend data', () => {
      const data = [
        { DocumentDate: '2023-01-15', Rate: 3.99 },
        { DocumentDate: '2023-01-20', Rate: 4.25 },
        { DocumentDate: '2023-02-10', Rate: 3.75 },
        { DocumentDate: '2023-02-15', Rate: 3.85 }
      ];
      
      const expected = [
        { month: '2023-01', avgRate: 4.12 },
        { month: '2023-02', avgRate: 3.80 }
      ];
      
      const result = calculateMonthlyTrend(data);
      
      // Sort both arrays to ensure consistent comparison
      const sortedExpected = expected.sort((a, b) => a.month.localeCompare(b.month));
      const sortedResult = result.sort((a, b) => a.month.localeCompare(b.month));
      
      expect(sortedResult).toEqual(sortedExpected);
    });

    test('should handle empty array', () => {
      expect(calculateMonthlyTrend([])).toEqual([]);
    });

    test('should handle null or undefined input', () => {
      expect(calculateMonthlyTrend(null)).toEqual([]);
      expect(calculateMonthlyTrend(undefined)).toEqual([]);
    });

    test('should handle missing DocumentDate or Rate', () => {
      const data = [
        { DocumentDate: '2023-01-15', Rate: 3.99 },
        { DocumentDate: '2023-01-20' },
        { Rate: 3.75 }
      ];
      
      const result = calculateMonthlyTrend(data);
      expect(result.length).toBe(1); // Only one valid month-rate pair
      expect(result[0].month).toBe('2023-01');
      expect(result[0].avgRate).toBe(3.99);
    });
  });

  // Test statistical calculations
  describe('calculateStatistics', () => {
    test('should calculate correct statistics for rates', () => {
      const data = [
        { Rate: 3.0 },
        { Rate: 4.0 },
        { Rate: 5.0 },
        { Rate: 6.0 },
        { Rate: 7.0 }
      ];
      
      const expected = {
        min: 3.0,
        max: 7.0,
        mean: 5.0,
        median: 5.0,
        standardDeviation: 1.41 // Approximate
      };
      
      const result = calculateStatistics(data, 'Rate');
      expect(result.min).toBe(expected.min);
      expect(result.max).toBe(expected.max);
      expect(result.mean).toBe(expected.mean);
      expect(result.median).toBe(expected.median);
      expect(result.standardDeviation).toBeCloseTo(expected.standardDeviation, 1);
    });

    test('should calculate correct median for even number of values', () => {
      const data = [
        { Rate: 3.0 },
        { Rate: 4.0 },
        { Rate: 5.0 },
        { Rate: 6.0 }
      ];
      
      const result = calculateStatistics(data, 'Rate');
      expect(result.median).toBe(4.5); // (4 + 5) / 2 = 4.5
    });

    test('should handle empty array', () => {
      const expected = {
        min: null,
        max: null,
        mean: null,
        median: null,
        standardDeviation: null
      };
      
      expect(calculateStatistics([], 'Rate')).toEqual(expected);
    });

    test('should handle null or undefined input', () => {
      const expected = {
        min: null,
        max: null,
        mean: null,
        median: null,
        standardDeviation: null
      };
      
      expect(calculateStatistics(null, 'Rate')).toEqual(expected);
      expect(calculateStatistics(undefined, 'Rate')).toEqual(expected);
    });

    test('should handle missing field', () => {
      const data = [
        { Rate: 3.0 },
        { Rate: 4.0 }
      ];
      
      const expected = {
        min: null,
        max: null,
        mean: null,
        median: null,
        standardDeviation: null
      };
      
      expect(calculateStatistics(data, null)).toEqual(expected);
      expect(calculateStatistics(data, undefined)).toEqual(expected);
      expect(calculateStatistics(data, '')).toEqual(expected);
    });

    test('should handle missing values for the specified field', () => {
      const data = [
        { OtherField: 3.0 },
        { OtherField: 4.0 }
      ];
      
      const expected = {
        min: null,
        max: null,
        mean: null,
        median: null,
        standardDeviation: null
      };
      
      expect(calculateStatistics(data, 'Rate')).toEqual(expected);
    });
  });
});
