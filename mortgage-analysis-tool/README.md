# Mortgage Market Analysis Tool

A browser-based tool for analyzing mortgage pricing trends by visualizing loan amounts categorized by premium bands and time periods.

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

## License

This project is licensed under the MIT License.
