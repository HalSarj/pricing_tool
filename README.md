# Mortgage Market Analysis Tool

A web-based tool for analyzing mortgage pricing trends and market share across different premium bands.

## Features

- **Data Import**: Upload ESIS data and swap rates files in CSV or Excel format
- **Premium Band Analysis**: View mortgage data aggregated by premium bands
- **Filtering Options**: Filter by date range, lender, product type, purchase type, and LTV
- **Product Term Filtering**: Filter for 2-year or 5-year fixed rate products
- **Market Share Analysis**: Analyze lender market share across selected premium bands
- **Data Export**: Export analysis results to CSV

## Usage

1. Upload your ESIS data and swap rates files
2. Click "Analyze Data" to process the files
3. Use the filters to refine your analysis
4. View the Premium Band Analysis table
5. Select premium bands for the Lender Market Share Analysis
6. Export data as needed

## Technologies Used

- HTML/CSS/JavaScript
- [Tabulator](https://tabulator.info/) for interactive tables
- [Papa Parse](https://www.papaparse.com/) for CSV parsing
- [SheetJS](https://sheetjs.com/) for Excel file parsing
- [Moment.js](https://momentjs.com/) for date handling

## Local Development

To run this project locally:

1. Clone the repository
2. Open `index.html` in your browser
3. No build steps or server setup required

## License

MIT License

## Overview

This tool allows users to:
- Import ESIS (European Standardised Information Sheet) data and swap rate data
- Calculate premium over swap rates for mortgage products
- Visualize loan amounts by premium band and month
- Filter data by various criteria
- Export results for further analysis

## How to Use

1. **Data Import**
   - Click the ESIS Data file input to select your ESIS CSV file
   - Click the Swap Rates file input to select your swap rates CSV or Excel file
   - Click "Analyze Data" to process the files

2. **Filtering Data**
   - Use the date range selector to focus on specific time periods
   - Select lenders to include/exclude from the analysis
   - Set premium range to focus on specific premium bands
   - Filter by product type or purchase type
   - Click "Apply Filters" to update the results

3. **Exporting Results**
   - Click "Export Data" to download the current table view as a CSV file

## File Format Requirements

### ESIS Data CSV
Required columns:
- DocumentDate: Date when the ESIS was issued
- BaseLender: Financial institution offering the mortgage
- InitialRate: Initial interest rate as a percentage
- Loan: Loan amount in GBP
- ProductType: Type of product (e.g., fix)
- TieInPeriod: Period in months during which early repayment charges apply
- PurchaseType: Type of purchase (e.g., First Time Buyer, Home mover)

### Swap Rates CSV/Excel
Required columns:
- product_term_in_months: Term of the swap rate in months
- rate: The swap rate as a decimal
- effective_at: Date when the swap rate became effective

## Implementation Details

This tool is implemented using:
- Plain HTML, CSS, and JavaScript
- PapaParse for CSV parsing
- SheetJS for Excel processing
- Tabulator for data grid/table display

The application runs entirely in the browser with no server-side components, making it easy to deploy and use.

## Browser Compatibility

This tool works best in modern browsers:
- Chrome (recommended)
- Firefox
- Edge
- Safari

## Local Development

To run this tool locally:
1. Clone this repository
2. Open index.html in your browser
3. No build steps or server required!

## Deployment

This tool can be easily deployed to GitHub Pages:
1. Push the code to a GitHub repository
2. Enable GitHub Pages in the repository settings
3. The tool will be available at https://[username].github.io/mortgage-analysis-tool

## Continuous Integration

[![Test Suite](https://github.com/username/mortgage-market-analysis-tool/actions/workflows/test.yml/badge.svg)](https://github.com/username/mortgage-market-analysis-tool/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/username/mortgage-market-analysis-tool/branch/main/graph/badge.svg)](https://codecov.io/gh/username/mortgage-market-analysis-tool)

This project uses continuous integration to automatically run tests on code changes. The test suite is run on multiple Node.js versions to ensure compatibility.

### CI Workflow

1. On each push or pull request to main/master/develop branches:
   - Install dependencies
   - Run the test suite
   - Generate and upload coverage reports

### Coverage Requirements

- Minimum coverage: 80%
- Coverage reports are uploaded to Codecov

## License

This project is licensed under the MIT License.
