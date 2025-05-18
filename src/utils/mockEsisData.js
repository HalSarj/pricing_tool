/**
 * Generates mock ESIS (European Standardised Information Sheet) data for testing
 * @param {number} count - Number of mock records to generate
 * @returns {Array} Array of mock ESIS data objects
 */
function generateMockEsisData(count = 100) {
  const lenders = [
    "Nationwide Building Society", 
    "Barclays Bank UK PLC", 
    "HSBC UK", 
    "NatWest", 
    "Santander UK", 
    "Halifax", 
    "Lloyds Bank"
  ];
  
  const productTypes = ["Fixed Rate", "Variable Rate"];
  const purchaseTypes = ["First Time Buyer", "Home mover", "Remortgage"];
  const tieInPeriods = [24, 60]; // 2-year or 5-year fixed
  
  const mockData = [];
  
  for (let i = 0; i < count; i++) {
    const provider = lenders[Math.floor(Math.random() * lenders.length)];
    const documentDate = generateRandomDate(new Date(2020, 0, 1), new Date());
    const rate = (Math.random() * 6 + 1).toFixed(2); // Between 1% and 7%
    const loan = Math.floor(Math.random() * 900000) + 100000; // £100,000 to £1,000,000
    const ltv = Math.floor(Math.random() * 46) + 50; // 50% to 95%
    
    mockData.push({
      Provider: provider,
      BaseLender: provider,
      DocumentDate: formatDate(documentDate),
      Timestamp: formatDate(documentDate),
      Rate: parseFloat(rate),
      InitialRate: parseFloat(rate),
      Loan: loan,
      LTV: ltv,
      ProductType: productTypes[Math.floor(Math.random() * productTypes.length)],
      PurchaseType: purchaseTypes[Math.floor(Math.random() * purchaseTypes.length)],
      TieInPeriod: tieInPeriods[Math.floor(Math.random() * tieInPeriods.length)]
    });
  }
  
  return mockData;
}

/**
 * Generates a random date between the given start and end dates
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Date} Random date between start and end
 */
function generateRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Formats a date object to YYYY-MM-DD string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

module.exports = { generateMockEsisData };
