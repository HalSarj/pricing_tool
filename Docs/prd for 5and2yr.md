Enhance Mortgage Analysis Tool: Step-by-Step Approach
I need to modify our mortgage analysis tool to properly handle both 2-year and 5-year fixed rate products. Let's take a gradual approach to prevent disrupting the existing codebase.
Phase 1: Basic Product Term Classification
First, let's modify only the swap rate matching logic to properly categorize products:

Update the findMatchingSwapRate function:

javascript// Add this BEFORE calling the original findMatchingSwapRate function
function normalizeProductTerm(tieInPeriod) {
    // Convert to number if it's a string
    const period = parseInt(tieInPeriod) || 0;
    
    // Normalize to standard terms
    if (period >= 24 && period <= 27) {
        return 24; // 2-year fixed
    } else if (period >= 60 && period <= 63) {
        return 60; // 5-year fixed
    } else {
        return null; // Non-standard term
    }
}

// Don't modify the original findMatchingSwapRate yet - just add this wrapper
function getMatchingSwapRate(esisRecord) {
    // Add normalized term to the record
    const normalizedTerm = normalizeProductTerm(esisRecord.TieInPeriod);
    esisRecord.NormalizedTerm = normalizedTerm;
    
    // Skip non-standard terms
    if (normalizedTerm === null) {
        return null;
    }
    
    // Use the existing swap rate matching but with normalized term
    const originalTieInPeriod = esisRecord.TieInPeriod;
    esisRecord.TieInPeriod = normalizedTerm;
    
    const result = findMatchingSwapRate(esisRecord);
    
    // Restore original value
    esisRecord.TieInPeriod = originalTieInPeriod;
    
    return result;
}

Update the data enrichment process:

javascript// In the enrichEsisData function, replace the call to findMatchingSwapRate with:
const matchingSwapRate = getMatchingSwapRate(esisRecord);

// After enrichment, filter out records with non-standard terms
state.esisData = state.esisData.filter(record => record.NormalizedTerm !== null);

Add simple logging to verify the data contains both product types:

javascript// Add after data processing
const twoYearCount = state.esisData.filter(r => r.NormalizedTerm === 24).length;
const fiveYearCount = state.esisData.filter(r => r.NormalizedTerm === 60).length;
console.log(`Processed ${twoYearCount} 2-year products and ${fiveYearCount} 5-year products`);
Phase 2: Data Analysis Preparation (No UI Changes Yet)

Add a helper function to get data by product term:

javascript// Add this function to help with future filtering
function getDataByProductTerm(data, term) {
    if (term === 'all') {
        return data;
    }
    
    const normalizedTerm = term === '2year' ? 24 : 60;
    return data.filter(record => record.NormalizedTerm === normalizedTerm);
}

Modify your aggregation function to handle the product terms:

javascript// No changes to the function signature - it should still work the same way
// Just ensure it can handle the reduced dataset when we filter later
Phase 3: Add Product Term Filter UI
Once Phase 1 & 2 are working correctly and verified, implement the product term filter:

Add the filter UI element (place it with your other filters):

html<div class="filter-group">
    <label for="product-term-filter">Product Term:</label>
    <select id="product-term-filter">
        <option value="all" selected>All Fixed Rates</option>
        <option value="2year">2 Year Fixed Only</option>
        <option value="5year">5 Year Fixed Only</option>
    </select>
</div>

Create a separate product term filter function that doesn't modify your existing filter logic:

javascript// Add this function to apply product term filtering
function applyProductTermFilter(data) {
    const productTermFilter = document.getElementById('product-term-filter').value;
    return getDataByProductTerm(data, productTermFilter);
}

Update your data update flow to include the product term filter:

javascript// Find where you currently update tables after filter changes
function updateTables() {
    // First apply existing filters 
    let filteredData = filterData(state.esisData);
    
    // Then apply product term filter separately
    filteredData = applyProductTermFilter(filteredData);
    
    // Process the filtered data for display
    const aggregatedData = aggregateByPremiumBandAndMonth(filteredData);
    
    // Update main table
    updateMainTable(aggregatedData);
    
    // If you have a market share table, update it too
    if (typeof updateMarketShareTable === 'function') {
        updateMarketShareTable(filteredData);
    }
}

Add event listener for the product term filter:

javascript// Add this with your other event listeners
document.getElementById('product-term-filter').addEventListener('change', function() {
    // Log the selected value to verify it's working
    console.log('Product term filter changed:', this.value);
    updateTables();
});

Add additional debug logging to help troubleshoot:

javascript// Add in updateTables() function to verify filtering is working
console.log('Data before product term filter:', filterData(state.esisData).length);
console.log('Data after product term filter:', filteredData.length);
console.log('Selected product term filter:', document.getElementById('product-term-filter').value);
Testing All Phases
After implementing all phases:

Upload a CSV file containing both 2-year and 5-year products
Check the console logs to verify both product types are being processed
Test each filter option:

"All Fixed Rates" should show all products
"2 Year Fixed Only" should show only products with tie-in periods 24-27 months
"5 Year Fixed Only" should show only products with tie-in periods 60-63 months


Verify that both tables (main premium band table and market share table) update correctly when changing the filter
Check that the premium calculations are correct for each product term

Troubleshooting Tips
If the filter doesn't work after implementation:

Check the console for error messages
Verify the event listener is being triggered (via console.log)
Confirm the filtered data counts change when the filter changes
Inspect a few records with browser dev tools to confirm NormalizedTerm is being set correctly
Check that updateTables() is properly using the filtered data for both tables

This incremental approach minimizes risk by adding functionality in layers without significantly altering your existing codebase structure.