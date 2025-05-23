# Product Requirements Document: Mortgage Market Analysis Tool

## Overview
The Mortgage Market Analysis Tool is a data analysis application that combines swap rate data with ESIS (European Standardised Information Sheet) data to calculate premium over swap rates for mortgage products across the market. The tool will enable Generation Home's Chief Commercial Officer to analyze mortgage pricing trends by visualizing loan amounts categorized by premium bands and time periods, supporting strategic pricing decisions.

## Problem Statement
Generation Home needs to analyze how its mortgage products are priced relative to market swap rates compared to competitors. Currently, this requires manual data processing to:
1. Match ESIS data with corresponding swap rates
2. Calculate premiums over swap rates
3. Aggregate loan amounts by premium bands and time periods
4. Analyze trends and market positioning

An automated tool would significantly reduce analysis time and enable more frequent and detailed market assessments.

## User Personas
**Primary User:** Chief Commercial Officer at Generation Home
- Needs to make strategic pricing decisions
- Has high financial literacy and familiarity with mortgage market concepts
- Requires actionable insights rather than just raw data

**Secondary Users:** Pricing analysts and commercial team members
- Support the CCO with data-driven recommendations
- Need to perform ad-hoc analyses on market positioning

## Goals and Success Metrics
1. Reduce time spent on manual data processing by 90%
2. Enable more frequent (weekly vs. monthly) market position analyses
3. Improve pricing strategy with data-driven insights
4. Identify market opportunities in specific premium bands
5. Track Generation Home's competitive position over time

## Input Requirements
The tool will accept two CSV files:

**1. Swap Rates Dataset**
- Fields: product_term_in_months, rate, effective_at
- Contains swap rates for various terms with corresponding effective dates
- Example format shown in the provided sample data

**2. ESIS Dataset**
- Fields: DocumentDate, BaseLender, Description, Type, Loan, LTV, InitialFees, ProductType, TieInPeriod, InitialRate, PurchaseType
- Contains mortgage offer details from various lenders
- Example format shown in the provided sample data

## Functional Requirements

### Core Features

#### 1. Data Processing
- **Requirement:** Import and process ESIS and swap rate CSV data
- **Details:**
  - Match each ESIS record with the corresponding swap rate based on DocumentDate and product_term_in_months
  - Calculate premium over swap rate for each ESIS (InitialRate - swap_rate)
  - Group data by calendar month
  - Categorize each ESIS into premium bands of 20 basis points
  - Sum loan amounts within each premium band and month

#### 2. Data Visualization
- **Requirement:** Display processed data in a tabular format with interactive filtering
- **Details:**
  - Primary view: Table showing loan amounts by month (columns) and premium band (rows)
  - Each cell represents the total loan amount for that month and premium band
  - Include summary row and column with totals

#### 3. Interactive Filtering
- **Requirement:** Enable users to filter and analyze specific segments of data
- **Details:**
  - Date range selector to analyze specific time periods
  - Premium range selector to focus on specific premium bands
  - Lender filter to include/exclude specific lenders
  - Ability to filter by product type, purchase type, and other ESIS attributes

#### 4. Data Export
- **Requirement:** Allow export of filtered data for further analysis
- **Details:**
  - Export to CSV format
  - Include all calculated fields (premium over swap, etc.)
  - Option to export summary tables or detailed records

### Secondary Features

#### 5. Comparative Analysis
- **Requirement:** Enable comparison of Generation Home vs. market
- **Details:**
  - Highlight Gen H positions within the overall market
  - Calculate market share by premium band
  - Track positioning changes over time

#### 6. Trend Analysis
- **Requirement:** Visualize trends in premium distribution over time
- **Details:**
  - Option to view data as a line chart showing premium band movements
  - Identify shifts in market pricing strategy

## Technical Requirements

### Performance
- Process datasets containing up to 100,000 ESIS records efficiently
- Complete all calculations and display results in under 30 seconds
- Support interactive filtering with response times under 2 seconds

### Data Handling
- Handle CSV files up to 50MB in size
- Account for missing or inconsistent data in input files
- Validate input data before processing
- Store processed results for quick reanalysis

### User Interface
- Clean, professional interface suitable for financial analysis
- Table view with conditional formatting to highlight key insights
- Intuitive filtering controls
- Responsive design that works well on desktop displays

## User Flow

1. **Data Import**
   - User uploads two CSV files (swap rates and ESIS data)
   - System validates file format and displays preview
   - User confirms import

2. **Initial Analysis**
   - System processes data and calculates premium over swap for each ESIS
   - System categorizes data into 20 bps premium bands
   - System generates default table view showing last 12 months

3. **Refinement**
   - User adjusts time period as needed
   - User filters by specific lenders or other attributes
   - User selects premium range of interest

4. **Insights & Export**
   - User reviews data in table format
   - User exports filtered data for presentation or further analysis

## Detailed Specifications

### Premium Band Calculation
- Create premium bands starting from the lowest premium with any data
- Use consistent 20 basis point bands (e.g., 100-120 bps, 120-140 bps)
- Display bands as rows in the analysis table

### Date Matching Logic
- Match ESIS DocumentDate with the closest preceding swap rate effective_at date
- For ESIS records with no matching swap rate date, use the closest available rate

### User Interface Components

#### Main Dashboard
- Filter panel (left side):
  - Date range selector
  - Lender multi-select dropdown
  - Premium range selector
  - Additional filters (Product Type, Purchase Type, etc.)
- Data visualization area (center/right):
  - Primary table view with:
    - Rows: Premium bands (20 bps increments)
    - Columns: Months
    - Cells: Total loan amount
    - Conditional formatting to highlight cells by volume

#### Controls
- Export button
- Reset filters button
- View options (table, summary, etc.)

## Constraints and Considerations

### Data Privacy
- Tool is for internal use only
- No PII (Personally Identifiable Information) should be included in the datasets
- Access limited to authorized commercial team members

### Technical Implementation
- Implement as a standalone desktop application or internal web application
- Ensure compatibility with company's existing systems
- No external APIs or data sources required

## Future Enhancements (v2.0)
1. Advanced visualization options (heatmaps, bubble charts)
2. Time series forecasting of premium trends
3. Integration with live data sources
4. Automated regular reports
5. Market share projection tools

## Implementation Timeline

### Phase 1 (4 weeks)
- Requirements finalization and design
- Core data processing implementation
- Basic UI development

### Phase 2 (3 weeks)
- Interactive filtering implementation
- Export functionality
- Testing and refinement

### Phase 3 (1 week)
- Deployment and user training
- Documentation
- Feedback collection

## Appendix

### Data Dictionary

**Swap Rate Dataset Fields:**
- `product_term_in_months`: Term of the swap rate in months (e.g., 60 for 5-year fixed)
- `rate`: The swap rate as a decimal (e.g., 0.0326 = 3.26%)
- `effective_at`: Date and time when the swap rate became effective

**ESIS Dataset Fields:**
- `DocumentDate`: Date and time when the ESIS was issued
- `BaseLender`: Financial institution offering the mortgage
- `Description`: Description of the mortgage product
- `Type`: Type of property (e.g., Residential)
- `Loan`: Loan amount in GBP
- `LTV`: Loan-to-Value ratio
- `InitialFees`: Initial fees associated with the mortgage
- `ProductType`: Type of product (e.g., fix)
- `TieInPeriod`: Period in months during which early repayment charges apply
- `InitialRate`: Initial interest rate as a percentage
- `PurchaseType`: Type of purchase (e.g., First Time Buyer, Home mover)

**Calculated Fields:**
- `SwapRate`: Matching swap rate for the ESIS
- `PremiumOverSwap`: Difference between InitialRate and SwapRate in basis points
- `PremiumBand`: 20 bps band categorization of the premium