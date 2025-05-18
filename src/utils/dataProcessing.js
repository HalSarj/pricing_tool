/**
 * Data processing utility functions for the Mortgage Market Analysis Tool
 */

/**
 * Maps field names from the source data format to a standardized format
 * @param {Object} record - The source data record
 * @returns {Object} Record with standardized field names
 */
function mapFieldNames(record) {
  const fieldMapping = {
    'Provider': 'lender',
    'BaseLender': 'baseLender',
    'DocumentDate': 'documentDate',
    'Timestamp': 'timestamp',
    'Rate': 'rate',
    'InitialRate': 'initialRate',
    'Loan': 'loan',
    'LTV': 'ltv',
    'ProductType': 'productType',
    'PurchaseType': 'purchaseType',
    'TieInPeriod': 'tieInPeriod'
  };

  const result = {};
  
  // Map each field that exists in the record
  Object.keys(record).forEach(key => {
    const mappedKey = fieldMapping[key] || key.toLowerCase();
    result[mappedKey] = record[key];
  });
  
  return result;
}

/**
 * Normalizes product term to months format
 * @param {string|number} term - The product term (e.g., "2 years", 24, "5-year fixed")
 * @returns {number|null} Term in months or null if invalid
 */
function normalizeProductTerm(term) {
  if (term === null || term === undefined) {
    return null;
  }
  
  // If term is already a number, assume it's in months
  if (typeof term === 'number') {
    return term;
  }
  
  // Convert string term to months
  const termString = term.toString().toLowerCase();
  
  if (termString.includes('2') && (termString.includes('year') || termString.includes('yr'))) {
    return 24; // 2 years = 24 months
  } else if (termString.includes('5') && (termString.includes('year') || termString.includes('yr'))) {
    return 60; // 5 years = 60 months
  }
  
  return null;
}

/**
 * Finds the matching swap rate for an ESIS record
 * @param {Object} esisRecord - The ESIS record
 * @param {Array} swapRates - Array of swap rate records
 * @returns {Object|null} Matching swap rate or null if not found
 */
function findMatchingSwapRate(esisRecord, swapRates) {
  if (!esisRecord || !swapRates || !Array.isArray(swapRates) || swapRates.length === 0) {
    return null;
  }
  
  // Get document date and term from ESIS
  const documentDate = esisRecord.DocumentDate;
  const termInMonths = normalizeProductTerm(esisRecord.TieInPeriod);
  
  if (!documentDate || !termInMonths) {
    return null;
  }
  
  // Filter swap rates by product term
  const termMatches = swapRates.filter(sr => sr.product_term_in_months === termInMonths);
  
  if (termMatches.length === 0) {
    return null;
  }
  
  // Find exact date match
  const exactMatch = termMatches.find(sr => sr.Date === documentDate);
  
  if (exactMatch) {
    return exactMatch;
  }
  
  // If no exact match, find closest date
  const esisDate = new Date(documentDate);
  let closestMatch = null;
  let smallestDiff = Infinity;
  
  // Get the min and max dates in the swap rates
  const swapDates = termMatches.map(sr => new Date(sr.Date).getTime());
  const minSwapDate = Math.min(...swapDates);
  const maxSwapDate = Math.max(...swapDates);
  const esisTime = esisDate.getTime();
  
  // If ESIS date is outside the range of available swap rates, return null
  if (esisTime < minSwapDate || esisTime > maxSwapDate) {
    return null;
  }
  
  termMatches.forEach(sr => {
    const swapDate = new Date(sr.Date);
    const diff = Math.abs(esisDate.getTime() - swapDate.getTime());
    
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestMatch = sr;
    }
  });
  
  return closestMatch;
}

/**
 * Calculates the premium over swap rate
 * @param {Object} esisRecord - The ESIS record
 * @param {Object} swapRate - The matching swap rate record
 * @returns {number|null} Premium over swap or null if calculation not possible
 */
function calculatePremiumOverSwap(esisRecord, swapRate) {
  if (!esisRecord || !swapRate) {
    return null;
  }
  
  const esisRate = esisRecord.Rate;
  const baseRate = swapRate.rate;
  
  if (esisRate === undefined || baseRate === undefined) {
    return null;
  }
  
  // Calculate premium (difference between ESIS rate and swap rate)
  const premium = parseFloat((esisRate - baseRate).toFixed(2));
  return premium;
}

/**
 * Assigns a premium band based on the premium value
 * @param {number} premium - The premium over swap rate
 * @returns {string} Premium band classification
 */
function assignPremiumBand(premium) {
  if (premium === null || premium === undefined) {
    return 'Unknown';
  }
  
  if (premium < 1) {
    return '0-1%';
  } else if (premium < 2) {
    return '1-2%';
  } else if (premium < 3) {
    return '2-3%';
  } else if (premium < 4) {
    return '3-4%';
  } else {
    return '4%+';
  }
}

/**
 * Enriches ESIS data with swap rate and premium information
 * @param {Object} esisRecord - The ESIS record
 * @param {Array} swapRates - Array of swap rate records
 * @returns {Object} Enriched ESIS record
 */
function enrichEsisData(esisRecord, swapRates) {
  if (!esisRecord) {
    return null;
  }
  
  // Create a copy of the ESIS record to avoid modifying the original
  const enriched = { ...esisRecord };
  
  // Find matching swap rate
  const swapRate = findMatchingSwapRate(esisRecord, swapRates);
  
  // Add swap rate information
  enriched.SwapRate = swapRate ? swapRate.rate : null;
  
  // Calculate premium over swap
  enriched.Premium = calculatePremiumOverSwap(esisRecord, swapRate);
  
  // Assign premium band
  enriched.PremiumBand = assignPremiumBand(enriched.Premium);
  
  // Add normalized product term
  const termInMonths = normalizeProductTerm(esisRecord.TieInPeriod);
  enriched.ProductTerm = termInMonths === 24 ? '2-year' : 
                        termInMonths === 60 ? '5-year' : 
                        `${termInMonths/12}-year`;
  
  return enriched;
}

module.exports = {
  mapFieldNames,
  normalizeProductTerm,
  findMatchingSwapRate,
  calculatePremiumOverSwap,
  assignPremiumBand,
  enrichEsisData
};
