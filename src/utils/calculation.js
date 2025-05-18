/**
 * Calculation utility functions for the Mortgage Market Analysis Tool
 */

/**
 * Calculates the average rate from a dataset
 * @param {Array} data - Array of records with Rate property
 * @returns {number|null} Average rate or null if no data
 */
function calculateAverageRate(data) {
  if (!data || data.length === 0) {
    return null;
  }
  
  const sum = data.reduce((total, item) => total + (item.Rate || 0), 0);
  return parseFloat((sum / data.length).toFixed(2));
}

/**
 * Calculates market share percentages by provider
 * @param {Array} data - Array of records with Provider property
 * @returns {Array} Array of objects with lender, count, and share percentage
 */
function calculateMarketShare(data) {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Count occurrences of each provider
  const providerCounts = {};
  data.forEach(item => {
    const provider = item.Provider;
    if (provider) {
      providerCounts[provider] = (providerCounts[provider] || 0) + 1;
    }
  });
  
  // Calculate percentages
  const totalCount = data.length;
  const result = Object.keys(providerCounts).map(provider => {
    const count = providerCounts[provider];
    return {
      lender: provider,
      count: count,
      share: Math.round((count / totalCount) * 100)
    };
  });
  
  return result;
}

/**
 * Calculates the distribution of premium bands
 * @param {Array} data - Array of records with PremiumBand property
 * @returns {Object} Object with premium bands as keys and count/percentage as values
 */
function calculatePremiumDistribution(data) {
  // Initialize all premium bands
  const distribution = {
    '0-1%': { count: 0, percentage: 0 },
    '1-2%': { count: 0, percentage: 0 },
    '2-3%': { count: 0, percentage: 0 },
    '3-4%': { count: 0, percentage: 0 },
    '4%+': { count: 0, percentage: 0 }
  };
  
  // If no data, return initialized distribution with zeros
  if (!data || data.length === 0) {
    return distribution;
  }
  
  // Count occurrences of each premium band
  data.forEach(item => {
    const band = item.PremiumBand;
    if (band && distribution[band]) {
      distribution[band].count += 1;
    }
  });
  
  // Calculate percentages
  const totalCount = data.length;
  Object.keys(distribution).forEach(band => {
    distribution[band].percentage = Math.round((distribution[band].count / totalCount) * 100);
  });
  
  return distribution;
}

/**
 * Calculates monthly trend data for rates
 * @param {Array} data - Array of records with DocumentDate and Rate properties
 * @returns {Array} Array of objects with month and average rate
 */
function calculateMonthlyTrend(data) {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Group data by month
  const monthlyData = {};
  
  data.forEach(item => {
    if (item.DocumentDate && item.Rate) {
      // Extract YYYY-MM from the date
      const month = item.DocumentDate.substring(0, 7);
      
      if (!monthlyData[month]) {
        monthlyData[month] = { rates: [], count: 0 };
      }
      
      monthlyData[month].rates.push(item.Rate);
      monthlyData[month].count += 1;
    }
  });
  
  // Calculate average rate for each month
  const result = Object.keys(monthlyData).map(month => {
    const rates = monthlyData[month].rates;
    const avgRate = parseFloat((rates.reduce((sum, rate) => sum + rate, 0) / rates.length).toFixed(2));
    
    return {
      month: month,
      avgRate: avgRate
    };
  });
  
  return result;
}

/**
 * Calculates statistical measures for a numeric field
 * @param {Array} data - Array of records
 * @param {string} field - Field name to calculate statistics for
 * @returns {Object} Object with min, max, mean, median, and standard deviation
 */
function calculateStatistics(data, field) {
  if (!data || data.length === 0 || !field) {
    return {
      min: null,
      max: null,
      mean: null,
      median: null,
      standardDeviation: null
    };
  }
  
  // Extract values for the specified field
  const values = data.map(item => item[field]).filter(val => val !== undefined && val !== null);
  
  if (values.length === 0) {
    return {
      min: null,
      max: null,
      mean: null,
      median: null,
      standardDeviation: null
    };
  }
  
  // Sort values for median calculation
  const sortedValues = [...values].sort((a, b) => a - b);
  
  // Calculate statistics
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  const sum = sortedValues.reduce((total, val) => total + val, 0);
  const mean = sum / sortedValues.length;
  
  // Calculate median
  let median;
  const midIndex = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 0) {
    // Even number of elements
    median = (sortedValues[midIndex - 1] + sortedValues[midIndex]) / 2;
  } else {
    // Odd number of elements
    median = sortedValues[midIndex];
  }
  
  // Calculate standard deviation
  const squaredDifferences = sortedValues.map(val => Math.pow(val - mean, 2));
  const variance = squaredDifferences.reduce((total, val) => total + val, 0) / sortedValues.length;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    min,
    max,
    mean,
    median,
    standardDeviation
  };
}

module.exports = {
  calculateAverageRate,
  calculateMarketShare,
  calculatePremiumDistribution,
  calculateMonthlyTrend,
  calculateStatistics
};
