# Mortgage Market Analysis Tool Test Suite

This repository contains a comprehensive test suite for the Mortgage Market Analysis Tool JavaScript application using Jest as the primary testing framework.

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

This will install all required testing dependencies:
- Jest (v29.5.0)
- jest-environment-jsdom (v29.5.0)
- @testing-library/jest-dom (v5.16.5)
- Puppeteer (v20.1.0) - Optional for E2E tests

## Running Tests

### Standard Test Run

```bash
npm test
```

### Watch Mode for Development

```bash
npm run test:watch
```

### With Coverage Report

```bash
npm run test:coverage
```

The coverage report will be generated in the `coverage` directory.

## Test Organization

The tests are organized into the following files:

- **mockData.test.js**: Tests for mock data generation functions
- **dataProcessing.test.js**: Tests for data transformation functions
- **calculation.test.js**: Tests for numerical calculation functions
- **filtering.test.js**: Tests for data filtering logic
- **visualization.test.js**: Tests for UI rendering functions
- **interactionHandlers.test.js**: Tests for user interaction event handlers
- **integration.test.js**: Tests for multiple functions working together
- **performance.test.js**: Tests for application performance with large datasets
- **e2e.test.js**: End-to-end tests using Puppeteer

## Mock Data

The test suite includes functions to generate realistic mock data that exactly matches the application's data structure:

### ESIS Data

Mock ESIS data includes the following fields:
- DocumentDate: Date when the ESIS was issued
- BaseLender: Financial institution offering the mortgage
- InitialRate: Initial interest rate as a percentage
- Loan: Loan amount in GBP
- ProductType: Type of product (e.g., fix)
- TieInPeriod: Period in months during which early repayment charges apply
- PurchaseType: Type of purchase (e.g., First Time Buyer, Home mover)

### Swap Rates Data

Mock swap rates data includes:
- product_term_in_months: Term of the swap rate in months
- rate: The swap rate as a decimal
- effective_at: Date when the swap rate became effective

## Test Coverage

The test suite aims to achieve at least 80% code coverage across all modules. Coverage is measured for:

- Statements
- Branches
- Functions
- Lines

Key areas with 100% coverage:
- Core calculation functions
- Data filtering functions
- Premium band determination logic

## Mocking Strategy

The test suite uses several mocking approaches:

### Function Mocks

Jest's `jest.fn()` is used to create function mocks for:
- Event handlers
- Callback functions
- Third-party library functions

Example:
```javascript
const mockCallback = jest.fn();
processData(mockData, mockCallback);
expect(mockCallback).toHaveBeenCalledTimes(1);
```

### Module Mocks

Jest's `jest.mock()` is used to mock entire modules:

```javascript
jest.mock('../src/utils/fileParser', () => ({
  parseCSV: jest.fn().mockResolvedValue(mockData),
  parseExcel: jest.fn().mockResolvedValue(mockData)
}));
```

### DOM Mocks

JSDOM is used to simulate a browser environment for testing DOM interactions:

```javascript
document.body.innerHTML = `
  <div id="results-table"></div>
  <button id="filter-button">Filter</button>
`;
```

## Performance Testing

Performance tests verify that the application meets performance requirements:

- Data loading should complete in under 500ms for files up to 10MB
- Filtering 1000 records should complete in under 50ms
- Calculating premiums for 1000 records should complete in under 50ms
- Aggregating 1000 records should complete in under 100ms
- Preparing visualization data for 1000 records should complete in under 100ms

## End-to-End Testing

End-to-end tests use Puppeteer to verify the complete user experience in a real browser environment:

- Application loading and initial data display
- Filtering functionality
- Reset functionality
- Chart and visualization rendering
- Data export functionality

## Contributing

When adding new tests, please follow these guidelines:

1. Each test file should start with a descriptive header explaining its purpose
2. Include detailed comments explaining what each test is verifying
3. Explain why specific test values were chosen
4. Document any edge cases being tested

## Troubleshooting

### Common Issues

1. **Tests fail with "ReferenceError: document is not defined"**
   - Make sure you're using the JSDOM environment for DOM tests
   - Check that jest.config.js has `testEnvironment: 'jsdom'`

2. **Puppeteer tests fail**
   - Ensure Puppeteer is installed: `npm install puppeteer@20.1.0`
   - Try running with `--no-sandbox` option if in CI environment

3. **Performance tests are inconsistent**
   - Performance tests may vary based on system resources
   - Consider adjusting thresholds for CI environments
