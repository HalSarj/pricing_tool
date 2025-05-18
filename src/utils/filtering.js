/**
 * Filtering utility functions for the Mortgage Market Analysis Tool
 */

/**
 * Filters data based on multiple criteria
 * @param {Array} data - Array of records to filter
 * @param {Object} filters - Object containing filter criteria
 * @returns {Array} Filtered data
 */
function filterData(data, filters = {}) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }
  
  return data.filter(item => {
    // Filter by lender
    if (filters.lender && item.Provider !== filters.lender) {
      return false;
    }
    
    // Filter by LTV range
    if (filters.ltvMin !== undefined && item.LTV < filters.ltvMin) {
      return false;
    }
    
    if (filters.ltvMax !== undefined && item.LTV > filters.ltvMax) {
      return false;
    }
    
    // Filter by product type
    if (filters.productType && item.ProductType !== filters.productType) {
      return false;
    }
    
    // Filter by product term
    if (filters.productTerm) {
      if (filters.productTerm === '2-year' && item.TieInPeriod !== 24) {
        return false;
      }
      if (filters.productTerm === '5-year' && item.TieInPeriod !== 60) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Filters data by product term
 * @param {Array} data - Array of records to filter
 * @param {string} term - Product term to filter by (e.g., '2-year', '5-year')
 * @returns {Array} Filtered data
 */
function filterByProductTerm(data, term) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  if (term === null) {
    return data;
  }
  
  if (!term || term === '') {
    return [];
  }
  
  let termInMonths;
  
  // Convert term string to months
  if (term === '2-year') {
    termInMonths = 24;
  } else if (term === '5-year') {
    termInMonths = 60;
  } else if (term === '2 years') {
    termInMonths = 24;
  } else if (term === '5 years') {
    termInMonths = 60;
  } else {
    // Try to extract the number from the term
    const match = term.match(/(\d+)/);
    if (match && match[1]) {
      const years = parseInt(match[1], 10);
      if (years === 2) {
        termInMonths = 24;
      } else if (years === 5) {
        termInMonths = 60;
      }
    }
  }
  
  if (!termInMonths) {
    return [];
  }
  
  return data.filter(item => item.TieInPeriod === termInMonths);
}

/**
 * Filters data by date range
 * @param {Array} data - Array of records to filter
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Array} Filtered data
 */
function filterByDateRange(data, startDate, endDate) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  if (!startDate && !endDate) {
    return data;
  }
  
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  
  return data.filter(item => {
    if (!item.DocumentDate) {
      return false;
    }
    
    const itemDate = new Date(item.DocumentDate);
    
    if (start && itemDate < start) {
      return false;
    }
    
    if (end && itemDate > end) {
      return false;
    }
    
    return true;
  });
}

/**
 * Filters data by premium band
 * @param {Array} data - Array of records to filter
 * @param {Array} bands - Array of premium bands to include
 * @returns {Array} Filtered data
 */
function filterByPremiumBand(data, bands = []) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  if (!bands || !Array.isArray(bands) || bands.length === 0) {
    return data;
  }
  
  return data.filter(item => bands.includes(item.PremiumBand));
}

module.exports = {
  filterData,
  filterByProductTerm,
  filterByDateRange,
  filterByPremiumBand
};
