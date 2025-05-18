Create a comprehensive test suite for my Mortgage Market Analysis Tool JavaScript application using Jest as the primary testing framework. The test implementation should be easy to set up and run by any developer working on the project.

## Testing Framework Details

Use the following frameworks and tools:
- Jest: For the primary testing framework, assertions, and test running
- JSDOM: For DOM manipulation testing
- jest-environment-jsdom: For simulating browser environment
- @testing-library/jest-dom: For enhanced DOM element assertions
- Puppeteer (optional): Only if end-to-end browser testing is required

## Setup Instructions

Include clear instructions for setting up the test environment:

1. Create a package.json with all necessary testing dependencies:
```json
{
  "devDependencies": {
    "jest": "^29.5.0",
    "jest-environment-jsdom": "^29.5.0",
    "@testing-library/jest-dom": "^5.16.5",
    "puppeteer": "^20.1.0" // Optional for E2E tests
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}

Include a jest.config.js file with the proper configuration:

jsmodule.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.js'],
  verbose: true,
  collectCoverageFrom: ['src/**/*.js', '!**/node_modules/**'],
}

Include a jest.setup.js file that imports the necessary testing utilities:

jsrequire('@testing-library/jest-dom');
// Any other global test setup
Data Structure
I need the generated mock data to EXACTLY match my current data format. Use the field structure below as the precise blueprint for mock data generation:
ESIS Data fields:

Provider: string (lender name)
BaseLender: string (same as Provider in most cases)
DocumentDate: date (format: YYYY-MM-DD)
Timestamp: date (same as DocumentDate)
Rate: number (e.g., 3.99)
InitialRate: number (same as Rate)
Loan: number (loan amount in GBP)
LTV: number (loan-to-value ratio, e.g., 75)
ProductType: string (e.g., "Fixed Rate", "Variable Rate")
PurchaseType: string (e.g., "First Time Buyer", "Home mover", "Remortgage")
TieInPeriod: number (typically 24 or 60 for 2-year or 5-year fixed)

Swap Rate Data fields:

Date: date (format: YYYY-MM-DD)
effective_at: date (same as Date)
product_term_in_months: number (24 or 60)
rate: number (e.g., 1.234)

Test Organization
Organize tests logically into distinct files:

mockData.test.js - Test the mock data generation functions
dataProcessing.test.js - Test data transformation functions
calculation.test.js - Test numerical calculation functions
filtering.test.js - Test data filtering logic
visualization.test.js - Test UI rendering functions
integration.test.js - Test multiple functions working together
performance.test.js - Test application performance with large datasets

Running Tests
Include clear instructions on how to run the tests:

Standard test run: npm test
Watch mode for development: npm run test:watch
With coverage report: npm run test:coverage

Testing Requirements
Create tests for these key components:

Data Processing Functions:

Test mapFieldNames for field normalization
Test normalizeProductTerm for proper term classification
Test findMatchingSwapRate for correct rate matching
Test calculatePremiumOverSwap for accurate premium calculations
Test assignPremiumBand for correct band assignment
Test enrichEsisData for proper data enhancement


Aggregation and Filtering:

Test aggregateByPremiumBandAndMonth for correct data grouping
Test filterData with various filter combinations
Test getDataByProductTerm for product term filtering
Test performance with large datasets (1000+ records)


Visualization Components:

Test prepareTableData for correct data formatting
Test renderTable for proper table generation
Test populatePremiumBandSelect for UI element creation
Test updateMarketShareTable for correct market share calculations
Test prepareHeatmapData and renderHeatmap for heatmap visualization
Test groupByMonthAndLender and renderTrendsChart for trends visualization


User Interaction:

Test applyFilters with various user selections
Test resetFilters for proper state restoration
Test exportData and exportMarketShareData for correct export functionality



Use realistic values within these ranges:

Loan amounts: £100,000 to £1,000,000
LTV: 50% to 95%
Rate: 1% to 7%
Swap rates: 0.5% to 4%

For lender names, use a mix of common UK banks and building societies like: "Nationwide Building Society", "Barclays Bank UK PLC", "HSBC UK", "NatWest", "Santander UK", "Halifax", "Lloyds Bank".
Begin with detailed mock data generator functions that precisely match my existing data structure. Then structure the tests hierarchically, starting with unit tests for core functions and building up to integration and UI tests.
Documentation
Include detailed comments explaining:

What each test is verifying
Why specific test values were chosen
Any edge cases being tested

Each test file should start with a descriptive header explaining its purpose.
Mocking Strategy
For DOM tests, provide a clear strategy for mocking browser elements and include helper functions for setting up the document environment.
Include examples of mocking global objects like document, Chart.js, and Tabulator.