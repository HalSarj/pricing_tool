/**
 * Generates mock swap rate data for testing
 * @param {string|Date} startDate - Start date for the data range
 * @param {string|Date} endDate - End date for the data range
 * @returns {Array} Array of mock swap rate data objects
 */
function generateMockSwapRateData(startDate, endDate) {
  const productTerms = [24, 60]; // 2-year or 5-year
  const mockData = [];
  
  // Generate daily swap rates for the date range
  const currentDate = new Date(startDate);
  const endDateTime = new Date(endDate).getTime();
  
  while (currentDate.getTime() <= endDateTime) {
    const formattedDate = formatDate(currentDate);
    
    // Generate rates for each product term
    productTerms.forEach(term => {
      // Swap rates between 0.5% and 4%
      const rate = (Math.random() * 3.5 + 0.5).toFixed(3);
      
      mockData.push({
        Date: formattedDate,
        effective_at: formattedDate,
        product_term_in_months: term,
        rate: parseFloat(rate)
      });
    });
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return mockData;
}

/**
 * Formats a date object to YYYY-MM-DD string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

module.exports = { generateMockSwapRateData };
