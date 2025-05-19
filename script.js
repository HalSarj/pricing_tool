// Mortgage Market Analysis Tool - Main JavaScript

// Global state
const state = {
    esisData: null,
    swapRatesData: null,
    processedData: null,
    table: null,
    marketShareTable: null,
    filterCache: null,
    filters: {
        dateRange: [null, null],
        lenders: [],
        premiumRange: [0, 500],
        productTypes: [],
        purchaseTypes: [],
        ltvRange: 'all' // 'all', 'below-80', or 'above-80'
    },
    marketShareFilters: {
        selectedPremiumBands: []
    },
    lenderMarketShare: {
        selectedPremiumBands: []
    },
    marketShareTrends: {
        selectedPremiumBands: []
    },
    totalMarketByPremiumBand: {}, // For % of market calculation
    overallTotalMarket: 0,      // For overall % of market calculation
    lenderMarketShareData: null  // For lender market share analysis
};

/**
 * Wraps a function with standardized error handling
 * @param {Function} fn - The function to wrap
 * @param {string} functionName - Name of the function for logging
 * @param {Function} onError - Optional custom error handler
 * @returns {Function} Wrapped function with error handling
 */
function withErrorHandling(fn, functionName, onError) {
  return function(...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      console.error(`Error in ${functionName}:`, error);
      
      // Use custom error handler if provided, otherwise use default
      if (typeof onError === 'function') {
        onError(error);
      } else {
        // Default error handling
        showError(`An error occurred while ${functionName.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${error.message}`);
      }
      
      // Hide any loading indicators that might be showing
      showLoading(false);
      
      // Return a safe default value based on the expected return type
      return null;
    }
  };
}

/**
 * Wraps an async function with standardized error handling
 * @param {Function} fn - The async function to wrap
 * @param {string} functionName - Name of the function for logging
 * @param {Function} onError - Optional custom error handler
 * @returns {Function} Wrapped async function with error handling
 */
function withAsyncErrorHandling(fn, functionName, onError) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      console.error(`Error in async ${functionName}:`, error);
      
      if (typeof onError === 'function') {
        onError(error);
      } else {
        showError(`An error occurred while ${functionName.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${error.message}`);
      }
      
      // Hide any loading indicators that might be showing
      showLoading(false);
      
      return null;
    }
  };
}

// DOM Elements
const elements = {
    // Create a function to safely get DOM elements
    getElement: function(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found in the DOM`);
        }
        return element;
    },
    
    // Create a function to safely get element properties
    getOptions: function(selectElement) {
        if (!selectElement) return [];
        return selectElement.options || [];
    },
    
    getSelectedOptions: function(selectElement) {
        if (!selectElement) return [];
        return selectElement.selectedOptions || [];
    }
};

// Initialize elements object with DOM references
function initElementReferences() {
    elements.esisFileInput = elements.getElement('esis-file');
    elements.swapFileInput = elements.getElement('swap-file');
    elements.esisFileInfo = elements.getElement('esis-file-info');
    elements.swapFileInfo = elements.getElement('swap-file-info');
    elements.analyzeBtn = elements.getElement('analyze-btn');
    elements.loadingIndicator = elements.getElement('loading-indicator');
    elements.filtersSection = elements.getElement('filters-section');
    elements.resultsSection = elements.getElement('results-section');
    elements.resultsTable = elements.getElement('results-table');
    elements.exportBtn = elements.getElement('export-btn');
    elements.dateStart = elements.getElement('date-start');
    elements.dateEnd = elements.getElement('date-end');
    elements.productType = elements.getElement('product-type');
    elements.purchaseType = elements.getElement('purchase-type');
    elements.lenderFilter = elements.getElement('lender-filter');
    elements.ltvFilter = elements.getElement('ltv-filter');
    elements.productTermFilter = elements.getElement('product-term-filter');
    elements.applyFiltersBtn = elements.getElement('apply-filters');
    elements.resetFiltersBtn = elements.getElement('reset-filters');
    elements.errorContainer = elements.getElement('error-container');
    elements.errorText = elements.getElement('error-text');
    elements.dismissError = elements.getElement('dismiss-error');
    elements.marketShareSection = elements.getElement('market-share-section');
    elements.marketShareTable = elements.getElement('market-share-table');
    elements.premiumBandsContainer = elements.getElement('premium-bands-container');
    elements.premiumBandsCounter = elements.getElement('premium-bands-counter');
    elements.applyMarketShareBtn = elements.getElement('apply-market-share');
    elements.exportMarketShareBtn = elements.getElement('export-market-share-btn');
    elements.heatmapSection = elements.getElement('heatmap-section');
    elements.heatmapVisualization = elements.getElement('heatmap-visualization');
    elements.lenderModeRadio = elements.getElement('lender-mode');
    elements.premiumModeRadio = elements.getElement('premium-mode');
    elements.marketShareTrendsSection = elements.getElement('market-share-trends-section');
    elements.trendsPremiumBandsContainer = elements.getElement('trends-premium-bands-container');
    elements.trendsPremiumBandsCounter = elements.getElement('trends-premium-bands-counter');
    elements.trendsApplyBtn = elements.getElement('trends-apply-btn');
    elements.trendsExportBtn = elements.getElement('trends-export-btn');
    elements.marketShareTrendsChart = elements.getElement('market-share-trends-chart');
    
    console.log('Element references initialized');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    // Initialize element references first
    initElementReferences();
    
    // Ensure heatmap elements exist in the DOM
    ensureHeatmapElementsExist();
    
    // Initialize Chart.js configuration
    initChartJsConfig();
    
    // Initialize premium band selector for market share trends
    initializePremiumBandSelector();
    
    // Set up event listeners with null checks
    if (elements.esisFileInput) elements.esisFileInput.addEventListener('change', handleESISFileSelect);
    if (elements.swapFileInput) elements.swapFileInput.addEventListener('change', handleSwapFileSelect);
    if (elements.analyzeBtn) elements.analyzeBtn.addEventListener('click', processData);
    if (elements.exportBtn) elements.exportBtn.addEventListener('click', exportData);
    if (elements.applyFiltersBtn) elements.applyFiltersBtn.addEventListener('click', handleApplyFilters);
    if (elements.resetFiltersBtn) elements.resetFiltersBtn.addEventListener('click', resetFilters);
    if (elements.dismissError) elements.dismissError.addEventListener('click', dismissError);
    if (elements.applyMarketShareBtn) elements.applyMarketShareBtn.addEventListener('click', updateMarketShareTable);
    if (elements.exportMarketShareBtn) elements.exportMarketShareBtn.addEventListener('click', exportMarketShareData);
    
    // Add non-filter event listeners
    nonFilterListeners.forEach(({ element, event, handler }) => {
        if (elements[element]) {
            elements[element].addEventListener(event, handler);
            console.log(`Added ${event} listener to ${element}`);
        }
    });
    
    // Add event listener for product term filter
    if (elements.productTermFilter) {
        elements.productTermFilter.addEventListener('change', handleApplyFilters);
    }
    
    console.log('Mortgage Market Analysis Tool initialized with auto-applying filters');
}

// Apply error handling wrappers to critical functions
// Core data processing functions
processData = withAsyncErrorHandling(processData, 'processData');
enrichEsisData = withErrorHandling(enrichEsisData, 'enrichEsisData');
mapFieldNames = withErrorHandling(mapFieldNames, 'mapFieldNames');
aggregateByPremiumBandAndMonth = withErrorHandling(aggregateByPremiumBandAndMonth, 'aggregateByPremiumBandAndMonth');

// File handling functions
parseCSVFile = withAsyncErrorHandling(parseCSVFile, 'parseCSVFile');
parseExcelFile = withAsyncErrorHandling(parseExcelFile, 'parseExcelFile');

// UI and visualization functions
renderTable = withErrorHandling(renderTable, 'renderTable');
applyFilters = withErrorHandling(applyFilters, 'applyFilters');
updateMarketShareTable = withErrorHandling(updateMarketShareTable, 'updateMarketShareTable');
updateHeatmap = withErrorHandling(updateHeatmap, 'updateHeatmap');
renderTrendsChart = withErrorHandling(renderTrendsChart, 'renderTrendsChart');

console.log('Error handling wrappers applied to critical functions');

// Function to ensure heatmap elements exist in the DOM
function ensureHeatmapElementsExist() {
    // Check if the heatmap section exists
    let heatmapSection = document.getElementById('heatmap-section');
    
    // If not, create it
    if (!heatmapSection) {
        console.log('Creating missing heatmap section');
        
        // Create the heatmap section
        heatmapSection = document.createElement('section');
        heatmapSection.id = 'heatmap-section';
        heatmapSection.className = 'heatmap-section hidden';
        
        // Create header
        const header = document.createElement('h2');
        header.textContent = 'Market Distribution Heatmap';
        heatmapSection.appendChild(header);
        
        // Create container
        const container = document.createElement('div');
        container.className = 'heatmap-container';
        
        // Create controls
        const controls = document.createElement('div');
        controls.className = 'heatmap-controls';
        
        // Create label
        const label = document.createElement('label');
        label.textContent = 'Visualization Mode:';
        controls.appendChild(label);
        
        // Create toggle switch
        const toggleSwitch = document.createElement('div');
        toggleSwitch.className = 'toggle-switch';
        
        // Create lender mode radio
        const lenderRadio = document.createElement('input');
        lenderRadio.type = 'radio';
        lenderRadio.id = 'lender-mode';
        lenderRadio.name = 'heatmap-mode';
        lenderRadio.value = 'lender';
        lenderRadio.checked = true;
        
        const lenderLabel = document.createElement('label');
        lenderLabel.htmlFor = 'lender-mode';
        lenderLabel.textContent = 'Distribution of Each Lender\'s Volume';
        
        // Create premium mode radio
        const premiumRadio = document.createElement('input');
        premiumRadio.type = 'radio';
        premiumRadio.id = 'premium-mode';
        premiumRadio.name = 'heatmap-mode';
        premiumRadio.value = 'premium';
        
        const premiumLabel = document.createElement('label');
        premiumLabel.htmlFor = 'premium-mode';
        premiumLabel.textContent = 'Market Share Within Premium Bands';
        
        // Append radio buttons and labels
        toggleSwitch.appendChild(lenderRadio);
        toggleSwitch.appendChild(lenderLabel);
        toggleSwitch.appendChild(premiumRadio);
        toggleSwitch.appendChild(premiumLabel);
        
        controls.appendChild(toggleSwitch);
        container.appendChild(controls);
        
        // Create visualization div
        const visualization = document.createElement('div');
        visualization.id = 'heatmap-visualization';
        container.appendChild(visualization);
        
        heatmapSection.appendChild(container);
        
        // Add the heatmap section to the document
        // Find the market share section to insert after it
        const marketShareSection = document.getElementById('market-share-section');
        if (marketShareSection) {
            marketShareSection.parentNode.insertBefore(heatmapSection, marketShareSection.nextSibling);
        } else {
            // If market share section doesn't exist, try to insert after results section
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                resultsSection.parentNode.insertBefore(heatmapSection, resultsSection.nextSibling);
            } else {
                // If neither section exists, add to the container
                const appContainer = document.querySelector('.container');
                if (appContainer) {
                    appContainer.appendChild(heatmapSection);
                } else {
                    // Last resort: append to body
                    document.body.appendChild(heatmapSection);
                }
            }
        }
        
        console.log('Heatmap section created and added to DOM');
    }
}

// File Handling Functions
function handleESISFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        elements.esisFileInfo.textContent = 'No file selected';
        checkFilesReady();
        return;
    }
    
    elements.esisFileInfo.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
    checkFilesReady();
}

function handleSwapFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        elements.swapFileInfo.textContent = 'No file selected';
        checkFilesReady();
        return;
    }
    
    elements.swapFileInfo.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
    checkFilesReady();
}

function checkFilesReady() {
    const esisSelected = elements.esisFileInput.files.length > 0;
    const swapSelected = elements.swapFileInput.files.length > 0;
    
    console.log('File selection status:', { esisSelected, swapSelected });
    
    if (esisSelected && swapSelected) {
        elements.analyzeBtn.disabled = false;
    } else {
        elements.analyzeBtn.disabled = true;
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Data Processing Functions
async function processData() {
    showLoading(true);
    
    // Check if files are selected
    const esisFile = elements.esisFileInput.files[0];
    const swapFile = elements.swapFileInput.files[0];
    
    if (!esisFile || !swapFile) {
        throw new Error('Please select both ESIS data and Swap Rates files');
    }
    
    // Reset market share filters when loading new data
    state.marketShareFilters.selectedPremiumBands = [];
    
    // Parse ESIS data
    state.esisData = await parseCSVFile(esisFile);
    
    // DEBUG: Log raw loan total immediately after parsing
    const rawLoanTotal = state.esisData.reduce((sum, record) => sum + (parseFloat(record.Loan) || 0), 0);
    console.log('DEBUG - Raw loan total from CSV:', rawLoanTotal.toLocaleString());
    
    // DEBUG: Log sample loan amounts from raw data
    if (state.esisData.length > 0) {
        console.log('DEBUG - Sample raw loan amounts from first 5 records:');
        state.esisData.slice(0, 5).forEach((record, idx) => {
            console.log(`Record ${idx}: Raw Loan=${record.Loan}, Type=${typeof record.Loan}`);
        });
    }
    
    // DEBUG: Check for duplicate records in raw data and deduplicate
    const uniqueIds = new Set();
    const uniqueRecords = [];
    const duplicates = [];
    
    state.esisData.forEach(record => {
        // Use id if available, otherwise create a composite key
        const id = record.id || `${record.Provider}-${record.DocumentDate}-${record.Loan}`;
        if (uniqueIds.has(id)) {
            duplicates.push(record);
        } else {
            uniqueIds.add(id);
            uniqueRecords.push(record);
        }
    });
    
    console.log('DEBUG - Number of potential duplicate records in raw data:', duplicates.length);
    console.log('DEBUG - Number of unique records after deduplication:', uniqueRecords.length);
    
    // Replace the original data with deduplicated data
    state.esisData = uniqueRecords;
    
    // Map field names first, so validateData can use standardized names
    mapFieldNames(); 
    
    // Parse Swap Rates data (CSV or Excel)
    if (swapFile.name.endsWith('.csv')) {
        state.swapRatesData = await parseCSVFile(swapFile);
    } else if (swapFile.name.endsWith('.xlsx')) {
        const swapData = await parseExcelFile(swapFile);
        console.log('Raw swapData from Excel:', swapData ? JSON.stringify(swapData.slice(0, 5)) : 'null'); // Log first 5 raw records
        
        state.swapRatesData = swapData
            .map(row => {
                // Attempt to parse the date. Robustly handle different possible date inputs if necessary.
                // For now, assuming row.Date is in a format moment() can parse directly or is an Excel date serial number.
                const effectiveDate = moment(row.Date); 
                return {
                    effective_at: effectiveDate.isValid() ? effectiveDate.toDate() : null, // Store as Date object
                    product_term_in_months: parseInt(row['TieInPeriod'], 10),
                    rate: parseFloat(row['Rate'])
                };
            })
            .filter(rate => 
                rate.effective_at instanceof Date && !isNaN(rate.effective_at.getTime()) && // Check for valid Date object
                !isNaN(rate.product_term_in_months) && 
                !isNaN(rate.rate)
            ); // Filter out invalid rates more robustly
        
        console.log('Processed state.swapRatesData:', state.swapRatesData ? JSON.stringify(state.swapRatesData.slice(0, 5).map(r => ({...r, effective_at: r.effective_at ? r.effective_at.toISOString() : null }))) : 'null'); // Log with ISO dates
        if (!state.swapRatesData || state.swapRatesData.length === 0) {
            console.warn('state.swapRatesData is empty or null after processing. Check Excel sheet and parsing logic.');
        }
    } else {
        throw new Error('Unsupported swap rates file format. Please use CSV or XLSX.');
    }
    
    // Validate data (now after mapFieldNames)
    validateData();
    
    // DEBUG: Simple verification total - sum all loans without any grouping
    const simpleVerificationTotal = state.esisData.reduce((sum, record) => sum + (record.Loan || 0), 0);
    console.log('DEBUG - Simple verification total (just summing all loans):', simpleVerificationTotal.toLocaleString());
    
    // Enrich state.esisData with PremiumBand and Month
    state.esisData = enrichEsisData(state.esisData);
    
    // Initialize the premium band selector for market share trends
    initializePremiumBandSelector();
    
    // Make sure the market share trends section is visible
    if (elements.marketShareTrendsSection) {
        elements.marketShareTrendsSection.classList.remove('hidden');
    }
    
    // Log product type counts to verify both 2-year and 5-year products are present
    const twoYearCount = state.esisData.filter(r => r.NormalizedTerm === 24).length;
    const fiveYearCount = state.esisData.filter(r => r.NormalizedTerm === 60).length;
    const totalCount = state.esisData.length;
    const twoYearPercent = ((twoYearCount / totalCount) * 100).toFixed(2);
    const fiveYearPercent = ((fiveYearCount / totalCount) * 100).toFixed(2);
    
    console.log('=== PRODUCT TYPE VERIFICATION ===');
    console.log(`Total products processed: ${totalCount}`);
    console.log(`2-year fixed products: ${twoYearCount} (${twoYearPercent}%)`);
    console.log(`5-year fixed products: ${fiveYearCount} (${fiveYearPercent}%)`);
    console.log(`Other term products: ${totalCount - twoYearCount - fiveYearCount} (${(100 - parseFloat(twoYearPercent) - parseFloat(fiveYearPercent)).toFixed(2)}%)`);
    
    // Warning if either product type is missing or significantly imbalanced
    if (twoYearCount === 0 || fiveYearCount === 0) {
        console.warn('WARNING: One or more product types are missing from the dataset!');
    } else if (twoYearCount < 0.1 * totalCount || fiveYearCount < 0.1 * totalCount) {
        console.warn('WARNING: Product type distribution is significantly imbalanced (one type < 10% of total).');
    }
    console.log('=================================');
    
    // DEBUG: Calculate total loan amount after enrichment
    const postEnrichmentTotal = state.esisData.reduce((sum, record) => sum + (record.Loan || 0), 0);
    console.log('DEBUG - Total loan amount after enrichment:', postEnrichmentTotal.toLocaleString());
    
    // Aggregate the enriched data for charts/processed views
    state.processedData = aggregateByPremiumBandAndMonth(state.esisData);

    // Store total market figures from the initial full dataset processing
    if (state.processedData && state.processedData.totals) {
        state.totalMarketByPremiumBand = { ...state.processedData.totals.byPremiumBand }; // Shallow copy
        state.overallTotalMarket = state.processedData.totals.overall;
        console.log('Initial Total Market by Premium Band:', JSON.stringify(state.totalMarketByPremiumBand));
        console.log('Initial Overall Total Market:', state.overallTotalMarket.toLocaleString());
        
        // DEBUG: Compare with our simple verification total
        console.log('DEBUG - Comparison of totals:', {
            'Simple verification total': simpleVerificationTotal.toLocaleString(),
            'Aggregated overall total': state.overallTotalMarket.toLocaleString(),
            'Ratio (aggregated/simple)': (state.overallTotalMarket / simpleVerificationTotal).toFixed(2)
        });
    } else {
        state.totalMarketByPremiumBand = {};
        state.overallTotalMarket = 0;
        console.warn('Could not set initial market totals, processedData or its totals are missing.');
    }

    // Update UI with results - always update filters first
    updateFilters();
    renderTable();

    // --- Ensure all sections are shown and populated ---
    // Show all sections
    elements.filtersSection.classList.remove('hidden');
    elements.resultsSection.classList.remove('hidden');
    elements.marketShareSection.classList.remove('hidden');
    elements.heatmapSection.classList.remove('hidden');
    elements.marketShareTrendsSection.classList.remove('hidden');
    
    // Initialize heatmap visualization
    updateHeatmap();
    
    // Make sure event listeners are attached to the radio buttons
    attachHeatmapModeListeners();
    
    // Initialize Market Share section
    if (state.processedData && state.processedData.premiumBands) {
        populatePremiumBandSelect(state.processedData.premiumBands);
    }
    
    // Initialize Market Share Trends section
    resetMarketShareTrends();
    
    // Log the state of filters for debugging
    console.log('Filters after processing data:', JSON.stringify(state.filters));
    
    // Ensure we have date range set
    if (!state.filters.dateRange || !state.filters.dateRange[0] || !state.filters.dateRange[1]) {
        console.warn('Date range not properly set in filters, setting defaults');
        // Set default date range if not already set
        if (state.processedData && state.processedData.months && state.processedData.months.length > 0) {
            state.filters.dateRange = [
                state.processedData.months[0],
                state.processedData.months[state.processedData.months.length - 1]
            ];
            console.log('Set default date range:', state.filters.dateRange);
        }
    }
    
    // Hide loading indicator
    showLoading(false);
    
    // Show success message
    showSuccess('Data processed successfully!');
    
    return state.processedData;
}

// Helper function to enrich ESIS data records
function enrichEsisData(esisDataArray) {
    // DEBUG: Calculate total loan amount before enrichment
    const preEnrichmentTotal = esisDataArray.reduce((sum, record) => sum + (record.Loan || 0), 0);
    console.log('DEBUG - Total loan amount before enrichment:', preEnrichmentTotal.toLocaleString());
    
    // Filter out Right to Buy products before any processing
    const filteredEsisData = esisDataArray.filter(record => {
        // Check for Right to Buy in various possible fields
        const productType = (record.ProductType || record.Mortgage_Type || '').toLowerCase();
        const purchaseType = (record.PurchaseType || '').toLowerCase();
        const description = (record.Description || record.Product_Description || '').toLowerCase();
        
        // Check if any field contains 'right to buy' or 'rtb'
        const isRightToBuy = 
            productType.includes('right to buy') || productType.includes('rtb') ||
            purchaseType.includes('right to buy') || purchaseType.includes('rtb') ||
            description.includes('right to buy') || description.includes('rtb');
            
        // Return false to filter out Right to Buy products
        return !isRightToBuy;
    });
    
    // Log how many Right to Buy products were filtered out
    const rightToBuyCount = esisDataArray.length - filteredEsisData.length;
    console.log(`Filtered out ${rightToBuyCount} Right to Buy products (${((rightToBuyCount / esisDataArray.length) * 100).toFixed(2)}% of total)`);
    
    // Use the filtered data for further processing
    esisDataArray = filteredEsisData;
    
    if (!state.swapRatesData || state.swapRatesData.length === 0) {
        console.warn('Swap rates not loaded or empty. Cannot fully enrich ESIS data.');
        // Return data with Month and default PremiumBand if swap rates are missing
        return esisDataArray.map(esisRecord => ({
            ...esisRecord,
            SwapRate: null,
            PremiumOverSwap: null,
            PremiumBand: assignPremiumBand(null), // Assign default/unknown band
            Month: extractMonth(esisRecord.DocumentDate)
        }));
    }

    // Initialize swap rate tracking if not already done
    if (!state.swapRateTracking) {
        state.swapRateTracking = {
            excludedRecords: 0,
            excludedLoanAmount: 0,
            missingDateRanges: {}
        };
    }

    // Process each record and filter out those with no matching swap rate or non-standard terms
    const enrichedData = esisDataArray
        .map(esisRecord => {
            // Find matching swap rate using the new wrapper function that handles normalized terms
            const matchingSwapRate = getMatchingSwapRate(esisRecord);
            
            // If no matching swap rate found or non-standard term, return null to filter out this record
            if (!matchingSwapRate) {
                return null;
            }
            
            // Calculate premium and determine band
            const premiumBps = calculatePremiumOverSwap(esisRecord, matchingSwapRate);
            const premiumBand = assignPremiumBand(premiumBps);
            const month = extractMonth(esisRecord.DocumentDate);
            
            return {
                ...esisRecord,
                SwapRate: matchingSwapRate.rate,
                MatchedSwapDate: matchingSwapRate.effective_at,
                PremiumOverSwap: premiumBps,
                PremiumBand: premiumBand,
                Month: month
            };
        })
        .filter(record => record !== null); // Remove records with no matching swap rate or non-standard terms

    // Log swap rate tracking statistics
    console.log('Swap Rate Matching Statistics:', {
        TotalRecords: esisDataArray.length,
        IncludedRecords: enrichedData.length,
        ExcludedRecords: state.swapRateTracking.excludedRecords,
        ExcludedLoanAmount: state.swapRateTracking.excludedLoanAmount.toLocaleString(),
        ExclusionRate: ((state.swapRateTracking.excludedRecords / esisDataArray.length) * 100).toFixed(2) + '%',
        MissingDateRanges: Object.keys(state.swapRateTracking.missingDateRanges).map(yearMonth => {
            return `${yearMonth}: ${state.swapRateTracking.missingDateRanges[yearMonth]} records`;
        }).join(', ')
    });

    // Calculate total loan amount after filtering
    const postEnrichmentTotal = enrichedData.reduce((sum, record) => sum + (record.Loan || 0), 0);
    console.log('DEBUG - Total loan amount after swap rate filtering:', postEnrichmentTotal.toLocaleString());
    console.log('DEBUG - Excluded loan amount due to missing swap rates:', state.swapRateTracking.excludedLoanAmount.toLocaleString());
    console.log('DEBUG - Verification: Original total - Excluded total =', (preEnrichmentTotal - state.swapRateTracking.excludedLoanAmount).toLocaleString());
    
    return enrichedData;
}

// File Parsing Functions
function parseCSVFile(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
                } else {
                    resolve(results.data);
                }
            },
            error: (error) => {
                reject(new Error(`CSV parsing error: ${error.message}`));
            }
        });
    });
}

function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                
                // Look for a sheet with 'Swap' in the name
                let sheetName = workbook.SheetNames.find(name => 
                    name.includes('Swap') || name.includes('swap') || name.includes('Rate') || name.includes('rate'));
                
                // If no swap sheet found, use the first sheet
                if (!sheetName) {
                    sheetName = workbook.SheetNames[0];
                }
                
                console.log('Using Excel sheet:', sheetName);
                
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                // Add effective_at date based on the file name if it contains a date
                const dateMatch = file.name.match(/(\d{2})_(\d{2})_(\d{4})/);
                if (dateMatch) {
                    const [_, day, month, year] = dateMatch;
                    const fileDate = new Date(`${year}-${month}-${day}`);
                    
                    jsonData.forEach(record => {
                        record.effective_at = fileDate;
                    });
                }
                
                console.log('Parsed Excel data:', jsonData.length, 'records');
                resolve(jsonData);
            } catch (error) {
                console.error('Excel parsing error:', error);
                reject(new Error(`Excel parsing error: ${error.message}`));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Error reading Excel file'));
        };
        
        reader.readAsBinaryString(file);
    });
}

function validateData() {
    // Validate ESIS data
    if (!state.esisData || state.esisData.length === 0) {
        throw new Error('ESIS data is empty or invalid');
    }
    
    // Check required ESIS fields
    const requiredESISFields = ['Provider', 'Rate', 'Timestamp'];
    const firstESISRecord = state.esisData[0];
    
    for (const field of requiredESISFields) {
        if (!(field in firstESISRecord)) {
            console.warn(`ESIS data is missing recommended field: ${field}`);
        }
    }
    
    // Validate Swap Rates data
    if (!state.swapRatesData || state.swapRatesData.length === 0) {
        throw new Error('Swap Rates data is empty or invalid');
    }
    
    // Check required Swap Rates fields
    const requiredSwapFields = ['product_term_in_months', 'rate', 'effective_at'];
    const firstSwapRecord = state.swapRatesData[0];
    
    // Convert date strings to Date objects
    state.swapRatesData.forEach(record => {
        if (typeof record.effective_at === 'string') {
            record.effective_at = new Date(record.effective_at);
        }
    });
    
    // Map fields from CSV to our internal structure
    mapFieldNames();
    
    // Convert date strings to Date objects in the mapped data
    state.esisData.forEach(record => {
        if (record.DocumentDate && typeof record.DocumentDate === 'string') {
            record.DocumentDate = new Date(record.DocumentDate);
        }
    });
    
    state.swapRatesData.forEach(record => {
        // Find the date field
        const dateField = Object.keys(record).find(key => 
            key.toLowerCase().includes('date') || 
            key.toLowerCase().includes('effective') || 
            key.toLowerCase().includes('timestamp'));
        
        if (dateField && typeof record[dateField] === 'string') {
            record.effective_at = new Date(record[dateField]);
        } else if (record.effective_at && typeof record.effective_at === 'string') {
            record.effective_at = new Date(record.effective_at);
        }
    });
}

function mapFieldNames() {
    console.log('Mapping field names for', state.esisData.length, 'records');
    
    // DEBUG: Calculate total loan amount before mapping
    const preMappingTotal = state.esisData.reduce((sum, record) => sum + (parseFloat(record.Loan) || 0), 0);
    console.log('DEBUG - Total loan amount before field mapping:', preMappingTotal.toLocaleString());
        
        // DEBUG: Analyze LTV distribution in the dataset
        let ltvData = {
            total: 0,
            count: 0,
            below80Count: 0,
            above80Count: 0,
            missingCount: 0,
            ltvFields: {}
        };
        
        // Check for LTV field names in the data
        if (state.esisData.length > 0) {
            const firstRecord = state.esisData[0];
            Object.keys(firstRecord).forEach(key => {
                if (key.toLowerCase().includes('ltv') || key.toLowerCase().includes('loan_to_value') || key.toLowerCase().includes('loan-to-value')) {
                    ltvData.ltvFields[key] = true;
                }
            });
            console.log('DEBUG - Potential LTV field names found:', Object.keys(ltvData.ltvFields));
        }
        
        if (state.esisData.length === 0) {
            console.warn('mapFieldNames called with no ESIS data.');
            return;
        }
        
        const firstRecordOriginal = state.esisData[0];
        // console.log('First record fields (original):', Object.keys(firstRecordOriginal)); // Optional: for deep debugging
        
        state.esisData = state.esisData.map((record, index) => {
            const mappedRecord = { ...record }; // Start with a copy

            // 1. Ensure DocumentDate is a Date object
            if (record.DocumentDate && !(record.DocumentDate instanceof Date)) {
                mappedRecord.DocumentDate = new Date(record.DocumentDate);
            } else if (record.Timestamp && !(record.Timestamp instanceof Date)) {
                mappedRecord.DocumentDate = new Date(record.Timestamp);
            } else if (!mappedRecord.DocumentDate || !(mappedRecord.DocumentDate instanceof Date)) {
                // console.warn(`Record ${index} has invalid or missing date. Defaulting. Original DocumentDate: ${record.DocumentDate}, Timestamp: ${record.Timestamp}`);
                mappedRecord.DocumentDate = new Date(); // Defaulting to now, review if null is better
            }
            
            // Standardize LTV field
            let ltv = null;
            // Check for various LTV field names
            if (record.LTV !== undefined) {
                ltv = parseFloat(record.LTV);
            } else if (record.Loan_To_Value !== undefined) {
                ltv = parseFloat(record.Loan_To_Value);
            } else if (record['Loan-to-Value'] !== undefined) {
                ltv = parseFloat(record['Loan-to-Value']);
            } else if (record.loan_to_value !== undefined) {
                ltv = parseFloat(record.loan_to_value);
            }
            
            // Normalize LTV format (some may be stored as percentage, some as decimal)
            if (ltv !== null && !isNaN(ltv)) {
                // If LTV is stored as decimal (e.g., 0.76 instead of 76), convert to percentage
                if (ltv > 0 && ltv < 1) {
                    ltv = ltv * 100;
                }
                
                // Update LTV statistics
                ltvData.total += ltv;
                ltvData.count++;
                if (ltv < 80) {
                    ltvData.below80Count++;
                } else {
                    ltvData.above80Count++;
                }
                
                // Store the standardized LTV value
                mappedRecord.StandardizedLTV = ltv;
            } else {
                ltvData.missingCount++;
            }

            // 2. Derive Month (handle potential errors from new Date() if source is bad)
            // Try to extract the month, but handle potential errors gracefully
            if (mappedRecord.DocumentDate instanceof Date && !isNaN(mappedRecord.DocumentDate)) {
                mappedRecord.Month = extractMonth(mappedRecord.DocumentDate);
            } else {
                console.error(`Error extracting month for record ${index}: Invalid date`, mappedRecord.DocumentDate);
                mappedRecord.Month = null;
            }

            // Log for the first 3 records
            if (index < 3) {
                console.log(`mapFieldNames - Record ${index}: DocumentDate=${mappedRecord.DocumentDate instanceof Date && !isNaN(mappedRecord.DocumentDate) ? mappedRecord.DocumentDate.toISOString() : 'Invalid Date'}, Month=${mappedRecord.Month}`);
            }

            // 3. Standardize Lender Fields
            if (record.BaseLender && typeof record.BaseLender === 'string' && record.BaseLender.trim() !== '') {
                mappedRecord.Provider = record.BaseLender.trim();
                mappedRecord.BaseLender = record.BaseLender.trim();
            } else if (record.Provider && typeof record.Provider === 'string' && record.Provider.trim() !== '') {
                mappedRecord.BaseLender = record.Provider.trim();
                mappedRecord.Provider = record.Provider.trim();
            } else {
                mappedRecord.Provider = '';
                mappedRecord.BaseLender = '';
            }
            
            // 4. Standardize ProductType/Mortgage_Type
            if (record.Mortgage_Type && !record.ProductType) {
                mappedRecord.ProductType = record.Mortgage_Type;
            } else if (record.ProductType && !record.Mortgage_Type) {
                mappedRecord.Mortgage_Type = record.ProductType;
            }
            
            // 5. Ensure InitialRate is a number
            mappedRecord.InitialRate = parseFloat(record.InitialRate || record.Rate);
            if (isNaN(mappedRecord.InitialRate)) {
                mappedRecord.InitialRate = 0; 
            }

            // 6. Ensure Loan is a number
            const originalLoan = record.Loan;
            mappedRecord.Loan = parseFloat(record.Loan);
            if (isNaN(mappedRecord.Loan)){
                mappedRecord.Loan = 0; 
            }
            
            // DEBUG: Log any significant changes to loan amounts during parsing
            if (index < 5 || (originalLoan && Math.abs(mappedRecord.Loan - originalLoan) > 1000)) {
                console.log(`DEBUG - Loan conversion: Record ${index}, Original=${originalLoan} (${typeof originalLoan}), Parsed=${mappedRecord.Loan} (${typeof mappedRecord.Loan})`);
            }

            return mappedRecord;
        });
        
        // DEBUG: Calculate total loan amount after mapping
        const postMappingTotal = state.esisData.reduce((sum, record) => sum + (record.Loan || 0), 0);
        console.log('DEBUG - Total loan amount after field mapping:', postMappingTotal.toLocaleString());
        
        if (state.esisData.length > 0) {
            console.log('DEBUG - Sample mapped loan amounts from first 5 records:');
            state.esisData.slice(0, 5).forEach((record, idx) => {
                console.log(`Record ${idx}: Mapped Loan=${record.Loan}, Type=${typeof record.Loan}, LTV=${record.StandardizedLTV || 'N/A'}`);
            });
            
            // Output LTV statistics
            if (ltvData.count > 0) {
                const avgLTV = ltvData.total / ltvData.count;
                console.log('\n======== LTV ANALYSIS REPORT ========');
                console.log(`Total records with LTV data: ${ltvData.count} (${((ltvData.count / state.esisData.length) * 100).toFixed(2)}% of dataset)`);
                console.log(`Records missing LTV data: ${ltvData.missingCount} (${((ltvData.missingCount / state.esisData.length) * 100).toFixed(2)}% of dataset)`);
                console.log(`Average LTV across dataset: ${avgLTV.toFixed(2)}%`);
                console.log(`Records with LTV < 80%: ${ltvData.below80Count} (${((ltvData.below80Count / ltvData.count) * 100).toFixed(2)}% of LTV data)`);
                console.log(`Records with LTV >= 80%: ${ltvData.above80Count} (${((ltvData.above80Count / ltvData.count) * 100).toFixed(2)}% of LTV data)`);
                console.log('====================================\n');
                
                // Store LTV stats in state for reference
                state.ltvStats = {
                    avgLTV: avgLTV,
                    below80Percent: (ltvData.below80Count / ltvData.count) * 100,
                    above80Percent: (ltvData.above80Count / ltvData.count) * 100,
                    recordsWithLTV: ltvData.count,
                    recordsMissingLTV: ltvData.missingCount
                };
            } else {
                console.warn('No LTV data found in the dataset. Check field names or data quality.');
            }
        }
}

function determinePurchaseType(record) {
    // Determine purchase type based on available fields
    if (record.First_Time_Buyer === 'yes' || record.First_Time_Buyer === true) {
        return 'First Time Buyer';
    } else if (record.Second_Time_Buyer === 'yes' || record.Second_Time_Buyer === true) {
        return 'Home mover';
    } else if (record.Remortgages === 'yes' || record.Remortgages === true) {
        return 'Remortgage';
    }
    
    // Check for Right to Buy indicators in various fields
    const productType = (record.ProductType || record.Mortgage_Type || '').toLowerCase();
    const description = (record.Description || record.Product_Description || '').toLowerCase();
    
    if (productType.includes('right to buy') || productType.includes('rtb') ||
        description.includes('right to buy') || description.includes('rtb')) {
        return 'Right to buy';
    }
    
    // Default if we can't determine
    return 'Unknown';
}

// Product Term Normalization Functions
/**
 * Normalizes product tie-in periods to standard terms (24 months for 2-year fixed, 60 months for 5-year fixed)
 * @param {string|number} tieInPeriod - The tie-in period from the product record
 * @returns {number|null} - Returns 24 for 2-year fixed, 60 for 5-year fixed, or null for non-standard terms
 */
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

/**
 * Wrapper for findMatchingSwapRate that uses normalized product terms
 * @param {Object} esisRecord - The ESIS record to find a matching swap rate for
 * @returns {Object|null} - The matching swap rate or null if no match found
 */
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

// Premium Calculation Functions
function findMatchingSwapRate(esisRecord) {
    // Initialize tracking if not already done
    if (!state.swapRateTracking) {
        state.swapRateTracking = {
            excludedRecords: 0,
            excludedLoanAmount: 0,
            missingDateRanges: {}
        };
    }
    
    // Ensure document date is a proper Date object with consistent timezone handling
    let documentDate;
    if (esisRecord.DocumentDate instanceof Date) {
        documentDate = new Date(esisRecord.DocumentDate.getTime());
    } else if (typeof esisRecord.DocumentDate === 'string') {
        documentDate = new Date(esisRecord.DocumentDate);
    } else {
        // If no valid date, exclude the record
        console.warn(`Invalid document date for record from ${esisRecord.Provider}, excluding from analysis`);
        state.swapRateTracking.excludedRecords++;
        state.swapRateTracking.excludedLoanAmount += (esisRecord.Loan || 0);
        return null;
    }
    
    // Verify the date is valid
    if (isNaN(documentDate.getTime())) {
        console.warn(`Invalid document date for record from ${esisRecord.Provider}: ${esisRecord.DocumentDate}, excluding from analysis`);
        state.swapRateTracking.excludedRecords++;
        state.swapRateTracking.excludedLoanAmount += (esisRecord.Loan || 0);
        return null;
    }
    
    // Get the tie-in period (product term) - default to 60 months (5 years) if not available
    const tieInPeriod = esisRecord.TieInPeriod || 60;
    
    // First try to find rates that match the product term
    let matchingRates = [...state.swapRatesData]
        .filter(swap => swap.product_term_in_months === tieInPeriod)
        .map(swap => {
            // Ensure effective_at is a proper Date object
            let effectiveDate;
            if (swap.effective_at instanceof Date) {
                effectiveDate = new Date(swap.effective_at.getTime());
            } else if (typeof swap.effective_at === 'string') {
                effectiveDate = new Date(swap.effective_at);
            } else {
                effectiveDate = new Date(swap.effective_at);
            }
            
            return {
                ...swap,
                effective_at: effectiveDate
            };
        })
        .filter(swap => !isNaN(swap.effective_at.getTime())); // Filter out invalid dates
    
    // If no rates match the product term, try to find rates for a similar term
    if (matchingRates.length === 0) {
        // Get all unique product terms
        const availableTerms = [...new Set(state.swapRatesData.map(swap => swap.product_term_in_months))];
        
        // Find the closest term to the mortgage's tie-in period
        let closestTerm = availableTerms.reduce((closest, term) => {
            return Math.abs(term - tieInPeriod) < Math.abs(closest - tieInPeriod) ? term : closest;
        }, availableTerms[0] || 60);
        
        // Get rates for the closest term
        matchingRates = [...state.swapRatesData]
            .filter(swap => swap.product_term_in_months === closestTerm)
            .map(swap => {
                // Ensure effective_at is a proper Date object
                let effectiveDate;
                if (swap.effective_at instanceof Date) {
                    effectiveDate = new Date(swap.effective_at.getTime());
                } else if (typeof swap.effective_at === 'string') {
                    effectiveDate = new Date(swap.effective_at);
                } else {
                    effectiveDate = new Date(swap.effective_at);
                }
                
                return {
                    ...swap,
                    effective_at: effectiveDate
                };
            })
            .filter(swap => !isNaN(swap.effective_at.getTime())); // Filter out invalid dates
    }
    
    // Sort by effective date
    matchingRates.sort((a, b) => a.effective_at.getTime() - b.effective_at.getTime());
    
    // Find the closest preceding swap rate
    let matchingRate = null;
    for (const swap of matchingRates) {
        if (swap.effective_at <= documentDate) {
            matchingRate = swap;
        } else {
            break;
        }
    }
    
    // Define tolerance window (±5 business days)
    const TOLERANCE_DAYS = 5;
    
    // If no preceding rate found, check if there's a rate within the tolerance window
    if (!matchingRate && matchingRates.length > 0) {
        // Find the closest rate (could be after the document date)
        const closestRate = matchingRates[0];
        
        // Calculate the difference in days
        const diffTime = Math.abs(closestRate.effective_at.getTime() - documentDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // If within tolerance window, use this rate
        if (diffDays <= TOLERANCE_DAYS) {
            matchingRate = closestRate;
            // console.log(`Using swap rate from ${closestRate.effective_at.toISOString().split('T')[0]} for ${esisRecord.Provider} document dated ${documentDate.toISOString().split('T')[0]} (${diffDays} days difference)`);
        } else {
            // Track missing date ranges
            const yearMonth = documentDate.toISOString().substring(0, 7); // YYYY-MM format
            if (!state.swapRateTracking.missingDateRanges[yearMonth]) {
                state.swapRateTracking.missingDateRanges[yearMonth] = 0;
            }
            state.swapRateTracking.missingDateRanges[yearMonth]++;
            
            // Log the exclusion
            //console.log(`No suitable swap rate found for ${esisRecord.Provider} on ${documentDate.toISOString().split('T')[0]}, excluding from analysis`);
            state.swapRateTracking.excludedRecords++;
            state.swapRateTracking.excludedLoanAmount += (esisRecord.Loan || 0);
            return null;
        }
    }
    
    // Date comparison example logging commented out to reduce console clutter
    /*
    // Log a few examples of date comparisons for verification
    if (Math.random() < 0.001) { // Log approximately 0.1% of comparisons
        console.log('Date comparison example:', {
            Provider: esisRecord.Provider,
            DaysDifference: matchingRate ? 
                Math.round((documentDate.getTime() - matchingRate.effective_at.getTime()) / (1000 * 60 * 60 * 24)) : 
                'N/A'
        });
    }
    */
    
    return matchingRate;
}

function calculatePremiumOverSwap(esisRecord, swapRate) {
    if (!swapRate) {
        return null;
    }
    
    // Determine which rate field to use from ESIS record
    let esisRateValue = null;
    
    // Check different possible rate fields in order of preference
    if (esisRecord.Rate !== undefined && esisRecord.Rate !== null) {
        esisRateValue = esisRecord.Rate;
    } else if (esisRecord.InitialRate !== undefined && esisRecord.InitialRate !== null) {
        esisRateValue = esisRecord.InitialRate;
    } else {
        console.warn(`No rate field found for ${esisRecord.Provider}`);
        return null;
    }
    
    // Normalize the ESIS rate (handle percentage vs decimal format)
    let esisRate;
    if (typeof esisRateValue === 'string') {
        // Remove any % signs and convert to number
        esisRateValue = esisRateValue.replace('%', '');
        esisRate = parseFloat(esisRateValue);
    } else {
        esisRate = parseFloat(esisRateValue);
    }
    
    // Special case handling for Nationwide Building Society
    // Their rates appear to be stored as 0.XX instead of X.XX%
    if (esisRecord.Provider === 'Nationwide Building Society' && esisRate < 0.5) {
        // Convert from 0.XX to 0.0XX (e.g., 0.49 to 0.049 for 4.9%)
        // console.log(`Applying Nationwide rate correction: ${esisRate} -> ${esisRate / 10}`);
        esisRate = esisRate / 10;
    }
    // Check if the ESIS rate is likely in percentage format (e.g., 3.99 instead of 0.0399)
    // Most mortgage rates are between 0.5% and 15%
    else if (esisRate > 0.5 && esisRate < 15) {
        // Rate is already in percentage format (e.g., 3.99 for 3.99%)
        // Convert to decimal for calculation
        esisRate = esisRate / 100;
    } else if (esisRate > 15) {
        // This is likely an error or a special case
        console.warn(`Unusually high ESIS rate detected: ${esisRate} for ${esisRecord.Provider}`);
    }
    
    // Get and normalize the swap rate value
    let swapRateValue;
    if (typeof swapRate.rate === 'string') {
        swapRateValue = parseFloat(swapRate.rate);
    } else {
        swapRateValue = swapRate.rate;
    }
    
    // Validate the values
    if (isNaN(esisRate)) {
        console.warn(`Invalid ESIS rate for ${esisRecord.Provider}: ${esisRateValue} (type: ${typeof esisRateValue})`);
        return null;
    }
    
    if (isNaN(swapRateValue)) {
        console.warn(`Invalid swap rate for ${esisRecord.Provider}: ${swapRate.rate} (type: ${typeof swapRate.rate})`);
        return null;
    }
    
    // Calculate premium in basis points (100 basis points = 1%)
    // Both rates should be in decimal format (e.g., 0.0399 for 3.99%)
    const premiumBps = Math.round((esisRate - swapRateValue) * 10000);
    
    // Log extreme values for investigation
    if (premiumBps > 300 || premiumBps < -30) {
        // Premium investigation debug message commented out to reduce console clutter
        /*
        console.log('PREMIUM INVESTIGATION:', {
            Provider: esisRecord.Provider,
            LoanAmount: esisRecord.Loan,
            DocumentDate: esisRecord.DocumentDate instanceof Date ? esisRecord.DocumentDate.toISOString() : esisRecord.DocumentDate,
            ESISRateOriginal: esisRateValue,
            ESISRateNormalized: esisRate,
            ESISRateType: typeof esisRateValue,
            SwapRateOriginal: swapRate.rate,
            SwapRateNormalized: swapRateValue,
            SwapRateType: typeof swapRate.rate,
            SwapRateDate: swapRate.effective_at instanceof Date ? swapRate.effective_at.toISOString() : swapRate.effective_at,
            PremiumBps: premiumBps,
            ProductTerm: esisRecord.TieInPeriod || 60,
            SwapProductTerm: swapRate.product_term_in_months,
            Calculation: `(${esisRate} - ${swapRateValue}) * 10000 = ${premiumBps}`
        });
        */
    }
    return premiumBps;
}

function assignPremiumBand(premiumBps) {
    if (premiumBps === null) return 'Unknown';
    
    // Add validation for extreme negative values
    // Limit to a reasonable range (-60 to +560 bps)
    if (premiumBps < -60) {
        // console.warn(`Unusually low premium detected: ${premiumBps}bps. Capping at -60bps.`);
        premiumBps = -60;
    } else if (premiumBps > 560) {
        // console.warn(`Unusually high premium detected: ${premiumBps}bps. Capping at 560bps.`);
        premiumBps = 560;
    }
    
    // Floor to nearest 20bps band
    const lowerBound = Math.floor(premiumBps / 20) * 20;
    return `${lowerBound}-${lowerBound + 20}`;
}

/**
 * Filters data by product term (2-year, 5-year, or all)
 * @param {Array} data - The dataset to filter
 * @param {string} term - The product term to filter by ('all', '2year', or '5year')
 * @returns {Array} - Filtered dataset containing only records matching the specified term
 */
function getDataByProductTerm(data, term) {
    // Return all data if term is 'all' or invalid
    if (!data || !Array.isArray(data) || term === 'all') {
        return data;
    }
    
    // Map term values to normalized term values
    const normalizedTerm = term === '2year' ? 24 : 60;
    
    // Filter data by normalized term
    return data.filter(record => record.NormalizedTerm === normalizedTerm);
}

/**
 * Applies product term filtering to the data based on UI selection
 * @param {Array} data - The dataset to filter
 * @returns {Array} - Dataset filtered by the selected product term
 */
function applyProductTermFilter(data) {
    if (!data) return [];
    
    // Get the selected product term from the UI
    const productTermFilter = document.getElementById('product-term-filter').value;
    
    // Use the getDataByProductTerm helper function to filter the data
    return getDataByProductTerm(data, productTermFilter);
}

function extractMonth(date) {
    return date.toISOString().substring(0, 7); // Format: YYYY-MM
}

function aggregateByPremiumBandAndMonth(records) {
    // DEBUG: Calculate simple sum of all loans before aggregation
    const preAggregationTotal = records.reduce((sum, record) => sum + (record.Loan || 0), 0);
    console.log('DEBUG - Total loan amount before aggregation:', preAggregationTotal.toLocaleString());
        if (!records || !Array.isArray(records) || records.length === 0) {
            console.warn('No valid records to aggregate');
            return {
                premiumBands: [],
                months: [],
                data: {},
                totals: {
                    byPremiumBand: {},
                    byMonth: {},
                    overall: 0
                }
            };
        }

        if (records.length > 0) {
            console.log(`aggregateByPremiumBandAndMonth - First input record: Month=${records[0].Month}, PremiumBand=${records[0].PremiumBand}, Loan=${records[0].Loan}`);
        }
        
        // Get unique premium bands and months
        const premiumBands = [...new Set(records.map(r => r.PremiumBand).filter(Boolean))].sort((a, b) => {
            // Sort premium bands numerically, with error handling
            const aParts = a.split('-');
            const bParts = b.split('-');
            
            if (!aParts[0] || !bParts[0]) {
                console.error('Invalid premium band format:', a, b);
                return 0;
            }
            
            const aLower = parseInt(aParts[0]);
            const bLower = parseInt(bParts[0]);
            
            if (isNaN(aLower) || isNaN(bLower)) {
                console.error('Error parsing premium bands as numbers:', a, b);
                return 0;
            }
            
            return aLower - bLower;
        });
        
        const months = [...new Set(records.map(r => r.Month).filter(Boolean))].sort();
        
        // Create aggregated data structure
        const aggregatedData = {
            premiumBands,
            months,
            data: {},
            totals: {
                byPremiumBand: {},
                byMonth: {},
                overall: 0
            }
        };
        
        // Initialize data structure
        premiumBands.forEach(band => {
            aggregatedData.data[band] = {};
            aggregatedData.totals.byPremiumBand[band] = 0;
            
            months.forEach(month => {
                aggregatedData.data[band][month] = 0;
            });
        });
        
        months.forEach(month => {
            aggregatedData.totals.byMonth[month] = 0;
        });
        
        // DEBUG: Create a tracking object to detect potential double-counting
        const loanTracking = {
            byBandMonth: 0,
            byPremiumBand: 0,
            byMonth: 0,
            overall: 0
        };
        
        // Aggregate loan amounts
        records.forEach((record, idx) => {
            if (record.PremiumBand && record.Month && record.Loan) {
                // Make sure the band and month exist in our structure
                if (aggregatedData.data[record.PremiumBand] && 
                    months.includes(record.Month)) {
                    
                    // DEBUG: Track the first few records for detailed analysis
                    const isTrackedRecord = idx < 3;
                    if (isTrackedRecord) {
                        console.log(`DEBUG - Aggregating record ${idx}: Loan=${record.Loan}, PremiumBand=${record.PremiumBand}, Month=${record.Month}`);
                    }
                    
                    aggregatedData.data[record.PremiumBand][record.Month] += record.Loan;
                    loanTracking.byBandMonth += record.Loan;
                    
                    aggregatedData.totals.byPremiumBand[record.PremiumBand] += record.Loan;
                    loanTracking.byPremiumBand += record.Loan;
                    
                    aggregatedData.totals.byMonth[record.Month] += record.Loan;
                    loanTracking.byMonth += record.Loan;
                    
                    aggregatedData.totals.overall += record.Loan;
                    loanTracking.overall += record.Loan;
                    
                    if (isTrackedRecord) {
                        console.log(`DEBUG - After adding record ${idx}: byBandMonth=${aggregatedData.data[record.PremiumBand][record.Month]}, overall=${aggregatedData.totals.overall}`);
                    }
                }
            }
        });
        
        // DEBUG: Log the tracking totals to identify potential double-counting
        console.log('DEBUG - Aggregation tracking totals:', {
            byBandMonth: loanTracking.byBandMonth.toLocaleString(),
            byPremiumBand: loanTracking.byPremiumBand.toLocaleString(),
            byMonth: loanTracking.byMonth.toLocaleString(),
            overall: loanTracking.overall.toLocaleString()
        });
        
        // DEBUG: Verify the overall total matches our expectation
        console.log('DEBUG - Final aggregated overall total:', aggregatedData.totals.overall.toLocaleString());
        
        // DEBUG: Calculate sum of premium band totals as a verification
        const sumOfBandTotals = Object.values(aggregatedData.totals.byPremiumBand).reduce((sum, val) => sum + val, 0);
        console.log('DEBUG - Sum of all premium band totals:', sumOfBandTotals.toLocaleString());
        
        // DEBUG: Calculate sum of month totals as a verification
        const sumOfMonthTotals = Object.values(aggregatedData.totals.byMonth).reduce((sum, val) => sum + val, 0);
        console.log('DEBUG - Sum of all month totals:', sumOfMonthTotals.toLocaleString());
        
        // DEBUG: Check if these sums match the overall total
        console.log('DEBUG - Do totals match?', {
            'overall === sumOfBandTotals': aggregatedData.totals.overall === sumOfBandTotals,
            'overall === sumOfMonthTotals': aggregatedData.totals.overall === sumOfMonthTotals,
            'difference (overall - bandTotals)': aggregatedData.totals.overall - sumOfBandTotals,
            'difference (overall - monthTotals)': aggregatedData.totals.overall - sumOfMonthTotals
        });
        
        return aggregatedData;
}

// Table Rendering Functions
function renderTable() {
    // Show/hide market share section in sync with results
    if (state.processedData && state.processedData.premiumBands && state.processedData.premiumBands.length > 0) {
        elements.marketShareSection.classList.remove('hidden');
    } else {
        elements.marketShareSection.classList.add('hidden');
    }

    // Check if we have processed data
    const currentAggregatedData = state.processedData; // Use filtered or full data

    if (!currentAggregatedData || !currentAggregatedData.months || currentAggregatedData.months.length === 0) {
        console.warn('No data available for table rendering (currentAggregatedData missing or empty).');
        elements.resultsTable.innerHTML = '<div class="empty-state">No data available. Please check your filters or try uploading different data files.</div>';
        return;
    }
        
        // Prepare table data
        const tableData = prepareTableData(currentAggregatedData);
        
        // DEBUG: Log the total amount being displayed in the table
        if (tableData && tableData.length > 0) {
            const totalRow = tableData.find(row => row.premiumBand === "Total");
            if (totalRow) {
                console.log('DEBUG - Total amount being displayed in table:', totalRow.total.toLocaleString());
            }
        }
        
        // Note about values being in millions removed as requested
        
        // Define table columns
        const tableColumns = [
            { title: "Premium Band (bps)", field: "premiumBand", headerSort: false, frozen: true }
        ];
        
        // Add month columns
        currentAggregatedData.months.forEach(month => {
            tableColumns.push({
                title: formatMonth(month),
                field: month,
                hozAlign: "right",
                formatter: function(cell) {
                    const value = cell.getValue();
                    if (value === 0 || !value) return "£0.00m";
                    const valueInMillions = (value / 1000000).toFixed(2);
                    // Format the millions with commas
                    const formattedValueInMillions = Number(valueInMillions).toLocaleString();
                    return `£${formattedValueInMillions}m`;
                },
                formatterParams: {},
                headerSort: false,
                cellClick: function(e, cell) {
                    const cellValue = cell.getValue();
                    if (cellValue > 0) {
                        // Could show detailed breakdown on click
                        console.log(`Clicked on ${cell.getColumn().getField()} for ${cell.getRow().getData().premiumBand}`);
                    }
                }
            });
        });
        
        // Add total column
        tableColumns.push({
            title: "Total",
            field: "total",
            hozAlign: "right",
            formatter: function(cell) {
                const value = cell.getValue();
                if (value === 0 || !value) return "£0.00m";
                const valueInMillions = (value / 1000000).toFixed(2);
                // Format the millions with commas
                const formattedValueInMillions = Number(valueInMillions).toLocaleString();
                return `£${formattedValueInMillions}m`;
            },
            formatterParams: {},
            headerSort: false,
            // Use a custom bottomCalc function to prevent double-counting
            // Instead of summing all values (which would include the Total row),
            // we'll just return the value from the Total row directly
            bottomCalc: function(values, data, calcParams) {
                // Find the Total row
                const totalRow = data.find(row => row.premiumBand === "Total");
                // Return its total value directly
                return totalRow ? totalRow.total : 0;
            },
            bottomCalcFormatter: function(cell) {
                const value = cell.getValue();
                if (value === 0 || !value) return "£0.00m";
                const valueInMillions = (value / 1000000).toFixed(2);
                // Format the millions with commas
                const formattedValueInMillions = Number(valueInMillions).toLocaleString();
                return `£${formattedValueInMillions}m`;
            }
        });

        // Add % of Market column
        tableColumns.push({
            title: "% of Market",
            field: "percentageOfMarket",
            hozAlign: "right",
            headerSort: false,
            formatter: function(cell, formatterParams, onRendered){
                const value = cell.getValue();
                return (typeof value === 'number') ? value.toFixed(2) + '%' : 'N/A';
            },
            bottomCalc: function(values, data, calcParams) {
                const totalRowData = data.find(d => d.premiumBand === "Total");
                return totalRowData && typeof totalRowData.percentageOfMarket === 'number' ? totalRowData.percentageOfMarket : null;
            },
            bottomCalcFormatter: function(cell, formatterParams, onRendered){
                const value = cell.getValue();
                return (typeof value === 'number') ? value.toFixed(2) + '%' : 'N/A';
            }
        });
        
        // If table already exists, destroy it first
        if (state.table) {
            state.table.destroy();
        }
        
        // Initialize Tabulator
        state.table = new Tabulator("#results-table", {
            data: tableData,
            columns: tableColumns,
            layout: "fitColumns",
            height: "450px",
            rowFormatter: function(row) {
                // Highlight total row
                if (row.getData().premiumBand === "Total") {
                    row.getElement().style.fontWeight = "bold";
                    row.getElement().style.backgroundColor = "#eaecee";
                }
            },
            dataFiltered: function(filters, rows) {
                if (rows.length === 0) {
                    console.log('No data matches the current filters');
                }
            }
        });
    }
// End of renderTable function

// Declare prepareTableData function
function prepareTableData(currentProcessedData) {
    const tableData = [];
    
    // Calculate market totals based on current time, product, and purchase filters but without lender filter
    function calculateMarketTotals() {
        // Create a custom filter function that only applies date, product, and purchase type filters
        function marketTotalFilter(record) {
            // Skip invalid records
            if (!record || typeof record !== 'object') {
                return false;
            }
            
            // Filter by date range
            if (state.filters.dateRange[0] && state.filters.dateRange[1]) {
                if (!record.Month) { 
                    return false;
                }
                const recordMonth = record.Month; 
                if (recordMonth < state.filters.dateRange[0] || recordMonth > state.filters.dateRange[1]) {
                    return false;
                }
            }
            
            // Filter by product type
            if (state.filters.productTypes.length > 0) {
                if (!record.ProductType || !state.filters.productTypes.includes(record.ProductType)) {
                    return false;
                }
            }
            
            // Filter by purchase type
            if (state.filters.purchaseTypes.length > 0) {
                if (!record.PurchaseType || !state.filters.purchaseTypes.includes(record.PurchaseType)) {
                    return false;
                }
            }
            
            // Skip Right to Buy products
            if (record.PurchaseType === 'Right to Buy') {
                return false;
            }
            
            return true;
        }
        
        // Apply the filter to get market data
        const marketData = state.esisData.filter(marketTotalFilter);
        
        // Calculate totals by premium band
        const marketTotals = { byPremiumBand: {}, overall: 0 };
        
        marketData.forEach(record => {
            const band = record.PremiumBand;
            const loanAmount = record.Loan || 0;
            
            if (band) {
                marketTotals.byPremiumBand[band] = (marketTotals.byPremiumBand[band] || 0) + loanAmount;
                marketTotals.overall += loanAmount;
            }
        });
        
        return marketTotals;
    }
    
    // Get market totals based on current filters
    const marketTotals = calculateMarketTotals();
    console.log('Market totals based on current time/product/purchase filters:', marketTotals);
    
    // Add rows for each premium band
    currentProcessedData.premiumBands.forEach(band => {
        const filteredBandTotal = currentProcessedData.totals.byPremiumBand[band] || 0;
        const marketBandTotal = marketTotals.byPremiumBand[band] || 0;
        
        // Calculate percentage - if "All Lenders" is selected, this should be 100%
        let percentage = 0;
        if (marketBandTotal > 0) {
            // Check if "All Lenders" is selected
            if (state.filters.lenders.length === 0 || 
                (state.filters.lenders.length === 1 && state.filters.lenders[0] === "-- All Lenders --")) {
                percentage = 100; // All lenders selected, should be 100%
            } else {
                percentage = (filteredBandTotal / marketBandTotal) * 100;
            }
        }

        const rowData = {
            premiumBand: band,
            total: filteredBandTotal,
            percentageOfMarket: percentage
        };
        
        // Add data for each month
        currentProcessedData.months.forEach(month => {
            rowData[month] = currentProcessedData.data[band]?.[month] || 0;
        });
        
        tableData.push(rowData);
    });
    
    // Add total row
    const grandFilteredTotal = currentProcessedData.totals.overall || 0;
    const grandMarketTotal = marketTotals.overall || 0;
    
    // Calculate total percentage - if "All Lenders" is selected, this should be 100%
    let grandPercentage = 0;
    if (grandMarketTotal > 0) {
        // Check if "All Lenders" is selected
        if (state.filters.lenders.length === 0 || 
            (state.filters.lenders.length === 1 && state.filters.lenders[0] === "-- All Lenders --")) {
            grandPercentage = 100; // All lenders selected, should be 100%
        } else {
            grandPercentage = (grandFilteredTotal / grandMarketTotal) * 100;
        }
    }

    const totalRow = {
        premiumBand: "Total",
        total: grandFilteredTotal,
        percentageOfMarket: grandPercentage
    };
    
    currentProcessedData.months.forEach(month => {
        totalRow[month] = currentProcessedData.totals.byMonth[month] || 0;
    });
    
    tableData.push(totalRow);
    
    return tableData;
}

// Filter Functions
function updateFilters() {
    // Update date range options
    const months = state.processedData.months;
    if (months && months.length > 0) {
        const startMonth = months[0];
        const endMonth = months[months.length - 1];
        
        // Format dates for input[type="month"]
        elements.dateStart.value = startMonth;
        elements.dateEnd.value = endMonth;
        
        state.filters.dateRange = [startMonth, endMonth];
    }
        
        // Set default premium range (even though it's not in the UI anymore)
        // This ensures the internal state is maintained for filtering
        state.filters.premiumRange = [0, 500];
        
        // COMPLETELY REWRITTEN LENDER FILTER HANDLING
        console.log('Updating lender filter with ESIS data records:', state.esisData.length);
        
        // Extract all unique BaseLender values
        const uniqueLenders = new Set();
        
        // First pass: collect all unique lender names
        state.esisData.forEach(record => {
            if (record.BaseLender && record.BaseLender.trim() !== '') {
                uniqueLenders.add(record.BaseLender.trim());
            } else if (record.Provider && record.Provider.trim() !== '') {
                uniqueLenders.add(record.Provider.trim());
            }
        });
        
        // Convert to array and sort alphabetically
        const lenders = Array.from(uniqueLenders).sort();
        
        console.log(`Found ${lenders.length} unique lenders:`, lenders.slice(0, 10));
        
        // Clear the existing dropdown options with null check
        if (!elements.lenderFilter) {
            console.warn('Lender filter element not found in the DOM');
            // Continue with other filters instead of returning early
        } else {
            while (elements.lenderFilter.firstChild) {
                elements.lenderFilter.removeChild(elements.lenderFilter.firstChild);
            }
            
            // Add "All Lenders" option
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = '-- All Lenders --';
            elements.lenderFilter.appendChild(allOption);
            
            // Add each lender as an option
            lenders.forEach(lender => {
                const option = document.createElement('option');
                option.value = lender;
                option.textContent = lender;
                elements.lenderFilter.appendChild(option);
            });
        }
        
        // "All Lenders" option is now added in the block above
        
        // Lenders are now added in the block above
        
        // Log lender options using safe helper method
        console.log(`Added ${elements.getOptions(elements.lenderFilter).length} lender options to dropdown`);
        console.log('First few lender options:', Array.from(elements.getOptions(elements.lenderFilter)).slice(0, 5).map(opt => opt.value));
        
        // PRODUCT TYPE FILTER
        // Extract all unique product types
        const uniqueProductTypes = new Set();
        state.esisData.forEach(record => {
            const productType = record.ProductType || record.Mortgage_Type;
            if (productType && productType.trim() !== '') {
                uniqueProductTypes.add(productType.trim());
            }
        });
        
        const productTypes = Array.from(uniqueProductTypes).sort();
        
        // Clear the existing dropdown options
        while (elements.productType.firstChild) {
            elements.productType.removeChild(elements.productType.firstChild);
        }
        
        // Add each product type as an option
        productTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            elements.productType.appendChild(option);
        });
        
        // PURCHASE TYPE FILTER
        // Extract all unique purchase types
        const uniquePurchaseTypes = new Set();
        state.esisData.forEach(record => {
            if (record.PurchaseType && record.PurchaseType.trim() !== '') {
                uniquePurchaseTypes.add(record.PurchaseType.trim());
            }
        });
        
        const purchaseTypes = Array.from(uniquePurchaseTypes).sort();
        
        // Clear the existing dropdown options
        while (elements.purchaseType.firstChild) {
            elements.purchaseType.removeChild(elements.purchaseType.firstChild);
        }
        
        // Add each purchase type as an option
        purchaseTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            elements.purchaseType.appendChild(option);
        });
        
        console.log('Filter options updated:', {
            lenders: lenders.length,
            productTypes: productTypes.length,
            purchaseTypes: purchaseTypes.length
        });
}

function applyFilters() {
    showLoading(true);
    
    // Get filter values - with null checks
    const dateStart = elements.dateStart ? elements.dateStart.value : null;
    const dateEnd = elements.dateEnd ? elements.dateEnd.value : null;
    
    // Store previous date range for comparison
    const previousDateStart = state.filters.dateRange[0];
    const previousDateEnd = state.filters.dateRange[1];
    // Premium range filter removed from UI but maintained in state
    const premiumMin = 0;
    const premiumMax = 500;
    // Get LTV filter value
    const ltvRange = elements.ltvFilter ? elements.ltvFilter.value : 'all';
        
        // Add null checks to prevent errors if lenderFilter is not fully initialized
        const lenderOptions = elements.lenderFilter ? elements.getOptions(elements.lenderFilter) : [];
        const selectedLenderOptions = elements.lenderFilter ? elements.getSelectedOptions(elements.lenderFilter) : [];
        console.log('Total lender options:', lenderOptions.length);
        console.log('Selected lender options:', selectedLenderOptions.length);
        
        // Get selected lenders with null checks
        const selectedLenders = elements.lenderFilter ? 
            Array.from(elements.getSelectedOptions(elements.lenderFilter)).map(option => option.value) : [];
        
        // Get selected product types with null checks
        const selectedProductTypes = elements.productType ? 
            Array.from(elements.getSelectedOptions(elements.productType)).map(option => option.value) : [];
        
        // Get selected purchase types with null checks
        const selectedPurchaseTypes = elements.purchaseType ? 
            Array.from(elements.getSelectedOptions(elements.purchaseType)).map(option => option.value) : [];
        
        // Log filter values for debugging
        console.log('Applying filters:', {
            dateRange: [dateStart, dateEnd],
            premiumRange: [premiumMin, premiumMax],
            lenders: selectedLenders,
            productTypes: selectedProductTypes,
            purchaseTypes: selectedPurchaseTypes
        });
        
        // Update state
        state.filters.dateRange = [dateStart, dateEnd];
        state.filters.lenders = selectedLenders.filter(l => l !== ""); // Remove empty selections (All Lenders option)
        state.filters.premiumRange = [premiumMin, premiumMax];
        state.filters.productTypes = selectedProductTypes;
        state.filters.purchaseTypes = selectedPurchaseTypes;
        state.filters.ltvRange = ltvRange;
        
        // Log lender filter state for debugging using safe helper methods
        console.log('Lender filter state after processing:', {
            originalSelection: selectedLenders,
            filteredSelection: state.filters.lenders,
            lenderCount: elements.getOptions(elements.lenderFilter).length,
            selectedCount: elements.getSelectedOptions(elements.lenderFilter).length
        });

        // New log to inspect state.esisData before calling filterData
        if (state.esisData && state.esisData.length > 0) {
            const sampleRecord = state.esisData[0]; // Check first record
            console.log('applyFilters - First record of state.esisData BEFORE filterData call:', {
                Month: sampleRecord.Month,
                PremiumBand: sampleRecord.PremiumBand,
                Loan: sampleRecord.Loan,
                Provider: sampleRecord.Provider
            });
            // Log a sample record that is known to fail during filtering (e.g., Barclays)
            const specificSample = state.esisData.find(r => r.Provider === 'Barclays Bank UK PLC' && r.Month === '2024-03');
            if (specificSample) {
                 console.log('applyFilters - Barclays March record from state.esisData BEFORE filterData call:', {
                    Month: specificSample.Month,
                    PremiumBand: specificSample.PremiumBand,
                    Loan: specificSample.Loan,
                    Provider: specificSample.Provider
                });
            } else {
                console.log('applyFilters - Could not find specific Barclays March record in state.esisData for pre-filter check.');
            }
        } else {
            console.log('applyFilters - state.esisData is empty or undefined BEFORE filterData call.');
        }

        // Apply all filters including product term filter in one step with caching
        state.filteredData = getCachedFilteredData(state.esisData);
        
        // Invalidate cache when data source changes
        if (previousDateStart !== state.filters.dateRange[0] || previousDateEnd !== state.filters.dateRange[1]) {
            invalidateFilterCache();
        }
        
        // Log filtering results after applying all filters
        console.log(`Unified filtering complete: ${state.filteredData.length} records match the criteria out of ${state.esisData.length} total records`);
        
        // Log sample records after filtering (first 3 records)
        if (state.filteredData && state.filteredData.length > 0) {
            console.log('Sample filtered records:');
            state.filteredData.slice(0, 3).forEach((record, index) => {
                console.log(`Sample ${index + 1}:`, {
                    Provider: record.Provider,
                    NormalizedTerm: record.NormalizedTerm,
                    TieInPeriod: record.TieInPeriod,
                    Rate: record.Rate,
                    PremiumOverSwap: record.PremiumOverSwap
                });
            });
        }
        
        // Log warnings for edge cases
        if (state.filteredData.length === 0) {
            console.warn('WARNING: Filtering removed all records! Check filter criteria.');
        } else if ((state.esisData.length - state.filteredData.length) / state.esisData.length > 0.9) {
            const removalPercentage = (((state.esisData.length - state.filteredData.length) / state.esisData.length) * 100).toFixed(2);
            console.warn(`WARNING: Filtering removed ${removalPercentage}% of records. Verify this is expected.`);
        }
        console.log('===========================================');
        
        // DEBUG: Calculate total loan amount after all filtering
        const postFilterTotal = state.filteredData.reduce((sum, record) => sum + (record.Loan || 0), 0);
        console.log('DEBUG - Total loan amount after all filtering:', postFilterTotal.toLocaleString());
        
        // Process filtered data
        state.processedData = aggregateByPremiumBandAndMonth(state.filteredData);
        
        // DEBUG: Log the total loan amount in the processed data
        if (state.processedData && state.processedData.totals) {
            console.log('DEBUG - Total loan amount in processed data:', state.processedData.totals.overall.toLocaleString());
        }
        
        // Update table
        renderTable();

        // --- Ensure premium bands are always populated after filters are applied ---
        if (state.processedData && state.processedData.premiumBands) {
            populatePremiumBandSelect(state.processedData.premiumBands);
            elements.marketShareSection.classList.remove('hidden');
            
            // Show heatmap section
            elements.heatmapSection.classList.remove('hidden');
            
            // Update heatmap without resetting
            updateHeatmapWithCurrentFilters();
            
            // Make sure event listeners are attached to the radio buttons
            attachHeatmapModeListeners();
            
            // Update market share table if it exists instead of resetting it
            if (state.marketShareFilters.selectedPremiumBands && 
                state.marketShareFilters.selectedPremiumBands.length > 0) {
                updateMarketShareTable();
            } else {
                // Auto-select the first premium band if none are selected
                // This ensures the market share table is displayed without requiring user interaction
                if (state.processedData.premiumBands && state.processedData.premiumBands.length > 0) {
                    // Update the market share table with default selection
                    if (state.processedData.premiumBands.length > 0) {
                        // Select the first premium band by default
                        state.marketShareFilters.selectedPremiumBands = [state.processedData.premiumBands[0]];
                        // Update the market share table
                        updateMarketShareTable();
                    }
                }
            }
        } else {
            elements.marketShareSection.classList.add('hidden');
        }
        // Update charts
        // updateCharts();
        
        console.log('Filters applied successfully. Filtered data count:', state.filteredData.length);
        showLoading(false);
}

// Break down filtering into separate functions
function dateRangeFilter(record, dateRange) {
    if (!dateRange[0] || !dateRange[1]) return true;
    if (!record.DocumentDate && !record.Month) return false;
    const recordMonth = record.Month;
    return recordMonth >= dateRange[0] && recordMonth <= dateRange[1];
}

function lenderFilter(record, lenders) {
    if (!lenders || lenders.length === 0) return true;
    const provider = (record.Provider || '').trim();
    const baseLender = (record.BaseLender || '').trim();
    return lenders.some(lender => provider === lender || baseLender === lender);
}

function premiumRangeFilter(record, premiumRange) {
    // Handle 'N/A' PremiumBand
    if (record.PremiumBand === 'N/A') {
        return premiumRange[0] <= -50 && premiumRange[1] >= 250;
    }
    
    // Handle records with PremiumOverSwap value
    if (record.PremiumOverSwap !== null && record.PremiumOverSwap !== undefined) {
        return record.PremiumOverSwap >= premiumRange[0] && record.PremiumOverSwap <= premiumRange[1];
    }
    
    // Handle records with PremiumBand but no PremiumOverSwap
    if (record.PremiumBand) {
        // Extract the bounds of the premium band (e.g., '60-80' -> [60, 80])
        const bandBounds = record.PremiumBand.split('-').map(Number);
        const bandMin = bandBounds[0];
        const bandMax = bandBounds[1] || bandBounds[0]; // Handle single value bands
        
        // Check if the band overlaps with the filter range
        const filterMin = premiumRange[0];
        const filterMax = premiumRange[1];
        
        // Check if there's any overlap between the band and filter range
        return !(bandMin > filterMax || bandMax < filterMin);
    }
    
    // If no PremiumBand or PremiumOverSwap, we can't determine if it should be filtered
    return false;
}

function productTypeFilter(record, productTypes) {
    if (!productTypes || productTypes.length === 0) return true;
    return record.ProductType && productTypes.includes(record.ProductType);
}

function purchaseTypeFilter(record, purchaseTypes) {
    if (!purchaseTypes || purchaseTypes.length === 0) return true;
    return record.PurchaseType && purchaseTypes.includes(record.PurchaseType);
}

function ltvRangeFilter(record, ltvRange, ltvFilterStats) {
    if (ltvRange === 'all') return true;
    
    // Use standardized LTV field from mapping
    let ltv = record.StandardizedLTV;
    
    // If LTV is available, filter by it
    if (ltv !== undefined && ltv !== null && !isNaN(ltv)) {
        if (ltvRange === 'below-80' && ltv >= 80) {
            // DEBUG: Log some filtered records for verification
            if (Math.random() < 0.01) { // Log ~1% of filtered records to avoid console spam
                console.log(`LTV Filter: Excluding record with LTV=${ltv}% (≥80%) from below-80 filter`, 
                          { provider: record.Provider, loan: record.Loan, ltv: ltv });
            }
            return false;
        } else if (ltvRange === 'above-80' && ltv < 80) {
            // DEBUG: Log some filtered records for verification
            if (Math.random() < 0.01) { // Log ~1% of filtered records to avoid console spam
                console.log(`LTV Filter: Excluding record with LTV=${ltv}% (<80%) from above-80 filter`, 
                          { provider: record.Provider, loan: record.Loan, ltv: ltv });
            }
            return false;
        }
        return true;
    } else {
        // If LTV is not available, we can't filter by it
        // For debugging, count how many records are missing LTV data
        if (!ltvFilterStats) {
            ltvFilterStats = { missingLtvCount: 0, totalProcessed: 0 };
        }
        ltvFilterStats.missingLtvCount++;
        ltvFilterStats.totalProcessed++;
        
        // Log every 100th missing record to avoid console spam
        if (ltvFilterStats.missingLtvCount % 100 === 0) {
            console.log(`LTV Filter: ${ltvFilterStats.missingLtvCount} records missing LTV data out of ${ltvFilterStats.totalProcessed} processed`);
        }
        return true;
    }
}

// filterData function removed - replaced by unified applyFilters function

/**
 * Event handler wrapper for the applyFilters function
 * This function is used as an event handler and calls the actual filtering function
 */
function handleApplyFilters() {
    try {
        showLoading(true);
        
        // Get filter values - with null checks
        const dateStart = elements.dateStart ? elements.dateStart.value : null;
        const dateEnd = elements.dateEnd ? elements.dateEnd.value : null;
        
        // Store previous date range for comparison
        const previousDateStart = state.filters.dateRange[0];
        const previousDateEnd = state.filters.dateRange[1];
        // Premium range filter removed from UI but maintained in state
        const premiumMin = 0;
        const premiumMax = 500;
        // Get LTV filter value
        const ltvRange = elements.ltvFilter ? elements.ltvFilter.value : 'all';
        
        // Add null checks to prevent errors if lenderFilter is not fully initialized
        const lenderOptions = elements.lenderFilter ? elements.getOptions(elements.lenderFilter) : [];
        const selectedLenderOptions = elements.lenderFilter ? elements.getSelectedOptions(elements.lenderFilter) : [];
        console.log('Total lender options:', lenderOptions.length);
        console.log('Selected lender options:', selectedLenderOptions.length);
        
        // Get selected lenders with null checks
        const selectedLenders = elements.lenderFilter ? 
            Array.from(elements.getSelectedOptions(elements.lenderFilter)).map(option => option.value) : [];
        
        // Get selected product types with null checks
        const selectedProductTypes = elements.productType ? 
            Array.from(elements.getSelectedOptions(elements.productType)).map(option => option.value) : [];
        
        // Get selected purchase types with null checks
        const selectedPurchaseTypes = elements.purchaseType ? 
            Array.from(elements.getSelectedOptions(elements.purchaseType)).map(option => option.value) : [];
        
        // Log filter values for debugging
        console.log('Applying filters:', {
            dateRange: [dateStart, dateEnd],
            premiumRange: [premiumMin, premiumMax],
            lenders: selectedLenders,
            productTypes: selectedProductTypes,
            purchaseTypes: selectedPurchaseTypes
        });
        
        // Update state
        state.filters.dateRange = [dateStart, dateEnd];
        state.filters.lenders = selectedLenders.filter(l => l !== ""); // Remove empty selections (All Lenders option)
        state.filters.premiumRange = [premiumMin, premiumMax];
        state.filters.productTypes = selectedProductTypes;
        state.filters.purchaseTypes = selectedPurchaseTypes;
        state.filters.ltvRange = ltvRange;
        
        // Apply all filters including product term filter in one step with caching
        state.filteredData = getCachedFilteredData(state.esisData);
        
        // Invalidate cache when data source changes
        if (previousDateStart !== state.filters.dateRange[0] || previousDateEnd !== state.filters.dateRange[1]) {
            invalidateFilterCache();
        }
        
        // Log filtering results after applying all filters
        console.log(`Unified filtering complete: ${state.filteredData.length} records match the criteria out of ${state.esisData.length} total records`);
        
        // Log sample records after filtering (first 3 records)
        if (state.filteredData && state.filteredData.length > 0) {
            console.log('Sample filtered records:');
            state.filteredData.slice(0, 3).forEach((record, index) => {
                console.log(`Sample ${index + 1}:`, {
                    Provider: record.Provider,
                    NormalizedTerm: record.NormalizedTerm,
                    TieInPeriod: record.TieInPeriod,
                    Rate: record.Rate,
                    PremiumOverSwap: record.PremiumOverSwap
                });
            });
        }
        
        // Log warnings for edge cases
        if (state.filteredData.length === 0) {
            console.warn('WARNING: Filtering removed all records! Check filter criteria.');
        } else if ((state.esisData.length - state.filteredData.length) / state.esisData.length > 0.9) {
            const removalPercentage = (((state.esisData.length - state.filteredData.length) / state.esisData.length) * 100).toFixed(2);
            console.warn(`WARNING: Filtering removed ${removalPercentage}% of records. Verify this is expected.`);
        }
        console.log('===========================================');
        
        // Process filtered data
        state.processedData = aggregateByPremiumBandAndMonth(state.filteredData);
        
        // Update table
        renderTable();

        // --- Ensure premium bands are always populated after filters are applied ---
        if (state.processedData && state.processedData.premiumBands) {
            populatePremiumBandSelect(state.processedData.premiumBands);
            elements.marketShareSection.classList.remove('hidden');
            
            // Show heatmap section
            elements.heatmapSection.classList.remove('hidden');
            
            // Update heatmap without resetting
            updateHeatmapWithCurrentFilters();
            
            // Make sure event listeners are attached to the radio buttons
            attachHeatmapModeListeners();
            
            // Update market share table if it exists instead of resetting it
            if (state.marketShareFilters.selectedPremiumBands && 
                state.marketShareFilters.selectedPremiumBands.length > 0) {
                updateMarketShareTable();
            } else {
                // Auto-select the first premium band if none are selected
                // This ensures the market share table is displayed without requiring user interaction
                if (state.processedData.premiumBands && state.processedData.premiumBands.length > 0) {
                    // Update the market share table with default selection
                    if (state.processedData.premiumBands.length > 0) {
                        // Select the first premium band by default
                        state.marketShareFilters.selectedPremiumBands = [state.processedData.premiumBands[0]];
                        // Update the market share table
                        updateMarketShareTable();
                    }
                }
            }
        } else {
            elements.marketShareSection.classList.add('hidden');
        }
        
        console.log('Filters applied successfully. Filtered data count:', state.filteredData.length);
        showLoading(false);
    } catch (error) {
        console.error('Error applying filters:', error);
        showError(`Error applying filters: ${error.message}`);
        showLoading(false);
    }
}

/**
 * Unified filter function that can be configured to apply specific filters
 * @param {Array} data - The dataset to filter
 * @param {Object} options - Configuration for which filters to apply
 * @returns {Array} - Filtered dataset
 */
function applyFilters(data, options = {}) {
    // Default options - apply all filters
    const filterOptions = {
        dateRange: true,
        lenders: true,
        premiumRange: true,
        productTypes: true,
        purchaseTypes: true,
        ltvRange: true,
        productTerm: true,
        ...options
    };
    
    // Validate input data
    if (!data || !Array.isArray(data)) {
        console.error('Invalid data provided to applyFilters:', data);
        return [];
    }
    
    // Apply filters conditionally based on options
    return data.filter(record => {
        try {
            // Skip invalid records
            if (!record || typeof record !== 'object') {
                return false;
            }
            
            // Filter by date range
            if (filterOptions.dateRange && state.filters.dateRange[0] && state.filters.dateRange[1]) {
                if (!record.DocumentDate || !record.Month) { 
                    return false;
                }
                const recordMonth = record.Month; 
                if (recordMonth < state.filters.dateRange[0] || recordMonth > state.filters.dateRange[1]) {
                    return false;
                }
            }
            
            // Filter by lender
            if (filterOptions.lenders && state.filters.lenders && state.filters.lenders.length > 0) {
                const provider = (record.Provider || '').trim();
                const baseLender = (record.BaseLender || '').trim();
                const matchesLender = state.filters.lenders.some(lender => {
                    return provider === lender || baseLender === lender;
                });
                if (!matchesLender) {
                    return false;
                }
            }
            
            // Filter by premium range
            if (filterOptions.premiumRange) {
                if (record.PremiumBand === 'N/A') {
                    if (state.filters.premiumRange[0] > -50 || state.filters.premiumRange[1] < 250) { 
                        return false;
                    }
                } else if (record.PremiumOverSwap === null || record.PremiumOverSwap === undefined) {
                    // Handle records where PremiumOverSwap is not defined but we have a PremiumBand
                    if (record.PremiumBand) {
                        // Extract the bounds of the premium band (e.g., '60-80' -> [60, 80])
                        const bandBounds = record.PremiumBand.split('-').map(Number);
                        const bandMin = bandBounds[0];
                        const bandMax = bandBounds[1] || bandBounds[0]; // Handle single value bands
                        
                        // Check if the band overlaps with the filter range
                        const filterMin = state.filters.premiumRange[0];
                        const filterMax = state.filters.premiumRange[1];
                        
                        // Check if the band is completely outside the filter range
                        if (bandMin > filterMax || bandMax < filterMin) {
                            return false;
                        }
                        // Otherwise keep it (there's some overlap)
                        return true;
                    }
                    // If no PremiumBand, we can't determine if it should be filtered
                    return false;
                } else if (record.PremiumOverSwap < state.filters.premiumRange[0] || record.PremiumOverSwap > state.filters.premiumRange[1]) {
                    // For records with explicit PremiumOverSwap values, filter based on that
                    return false;
                }
            }
            
            // Filter by product type
            if (filterOptions.productTypes && state.filters.productTypes && state.filters.productTypes.length > 0) {
                if (!record.ProductType || !state.filters.productTypes.includes(record.ProductType)) {
                    return false;
                }
            }
            
            // Filter by purchase type
            if (filterOptions.purchaseTypes && state.filters.purchaseTypes && state.filters.purchaseTypes.length > 0) {
                if (!record.PurchaseType || !state.filters.purchaseTypes.includes(record.PurchaseType)) {
                    return false;
                }
            }
            
            // Filter by LTV range
            if (filterOptions.ltvRange && state.filters.ltvRange !== 'all') {
                // Use our standardized LTV field from mapping
                let ltv = record.StandardizedLTV;
                
                // If LTV is available, filter by it
                if (ltv !== undefined && ltv !== null && !isNaN(ltv)) {
                    if (state.filters.ltvRange === 'below-80' && ltv >= 80) {
                        return false;
                    } else if (state.filters.ltvRange === 'above-80' && ltv < 80) {
                        return false;
                    }
                } else {
                    // If LTV is not available, we can't filter by it
                    // For debugging, count how many records are missing LTV data
                    if (!state.ltvFilterStats) {
                        state.ltvFilterStats = { missingLtvCount: 0, totalProcessed: 0 };
                    }
                    state.ltvFilterStats.missingLtvCount++;
                    state.ltvFilterStats.totalProcessed++;
                }
            }
            
            // Filter by product term
            if (filterOptions.productTerm) {
                const productTermFilter = document.getElementById('product-term-filter');
                if (productTermFilter && productTermFilter.value !== 'all') {
                    // Map term values to normalized term values
                    const normalizedTerm = productTermFilter.value === '2year' ? 24 : 60;
                    
                    // Filter by normalized term
                    if (record.NormalizedTerm !== normalizedTerm) {
                        return false;
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error filtering record in applyFilters:', error, record);
            return false;
        }
    });
}

/**
 * Get filtered data with caching support
 * @param {Array} data - The dataset to filter
 * @param {Object} options - Filter options
 * @returns {Array} - Filtered dataset
 */
function getCachedFilteredData(data, options = {}) {
    // Create a cache key based on options and current filters
    const cacheKey = JSON.stringify({
        options,
        filters: state.filters
    });
    
    // Initialize filter cache if needed
    if (!state.filterCache) state.filterCache = {};
    
    // Use cached results if available
    if (state.filterCache[cacheKey]) {
        console.log('Using cached filtered data');
        return state.filterCache[cacheKey];
    }
    
    // Filter the data
    const filtered = applyFilters(data, options);
    
    // Cache the results
    state.filterCache[cacheKey] = filtered;
    
    return filtered;
}

/**
 * Invalidate filter cache when source data changes
 */
function invalidateFilterCache() {
    state.filterCache = {};
    console.log('Filter cache invalidated');
}

function resetFilters() {
    showLoading(true);
    
    // Reset filter controls
    if (state.processedData && state.processedData.months && state.processedData.months.length > 0) {
        elements.dateStart.value = state.processedData.months[0];
        elements.dateEnd.value = state.processedData.months[state.processedData.months.length - 1];
    }
        
        // Store previous date range for comparison
        const previousDateStart = state.filters.dateRange[0];
        const previousDateEnd = state.filters.dateRange[1];
        
        // Deselect all options in multi-select dropdowns
        Array.from(elements.lenderFilter.options).forEach(option => option.selected = false);
        Array.from(elements.productType.options).forEach(option => option.selected = false);
        Array.from(elements.purchaseType.options).forEach(option => option.selected = false);
        
        // Reset LTV filter to 'all'
        elements.ltvFilter.value = 'all';
        
        // Premium range filter removed from UI but maintained in state
        
        // Reset state
        state.filters = {
            dateRange: state.processedData && state.processedData.months && state.processedData.months.length > 0 ? 
                [state.processedData.months[0], state.processedData.months[state.processedData.months.length - 1]] : 
                [null, null],
            lenders: [],
            premiumRange: [0, 500],
            productTypes: [],
            purchaseTypes: []
        };
        
        // Restore original processed data
        state.processedData = aggregateByPremiumBandAndMonth(state.esisData);
        
        // Update table
        renderTable();
        // --- MARKET SHARE: Populate dropdown and render section if data ---
        if (state.processedData && state.processedData.premiumBands) {
            populatePremiumBandSelect(state.processedData.premiumBands);
            elements.marketShareSection.classList.remove('hidden');
        } else {
            elements.marketShareSection.classList.add('hidden');
        }
        resetMarketShareTable();
        
        // Reset market share trends if date range changed
        if (previousDateStart !== state.filters.dateRange[0] || previousDateEnd !== state.filters.dateRange[1]) {
            resetMarketShareTrends();
        }
        
        // Show the market share trends section if it was hidden
        if (elements.marketShareTrendsSection) {
            elements.marketShareTrendsSection.classList.remove('hidden');
        }
        
        console.log('Filters reset successfully');
        showLoading(false);
}

// --- MARKET SHARE: Populate premium band chips ---
function populatePremiumBandSelect(bands) {
    const container = document.getElementById('premium-bands-container');
    const counter = document.getElementById('premium-bands-counter');
    container.innerHTML = '';
    
    // Keep track of selected bands
    state.selectedPremiumBands = state.selectedPremiumBands || [];
    
    bands.forEach(band => {
        const chip = document.createElement('div');
        chip.className = 'premium-band-chip';
        // Set both data-band attribute and dataset.value for consistency
        chip.setAttribute('data-band', band);
        chip.dataset.value = band;
        
        // Check if this band is already selected
        if (state.selectedPremiumBands.includes(band)) {
            chip.classList.add('selected');
        }
        
        // Create checkmark span
        const checkmark = document.createElement('span');
        checkmark.className = 'checkmark';
        checkmark.innerHTML = '✓';
        chip.appendChild(checkmark);
        
        // Add the band text
        const text = document.createTextNode(band);
        chip.appendChild(text);
        
        // Add click event listener
        chip.addEventListener('click', function() {
            this.classList.toggle('selected');
            const value = this.getAttribute('data-band') || this.dataset.value;
            
            // Initialize lenderMarketShare state if needed
            if (!state.lenderMarketShare) {
                state.lenderMarketShare = { selectedPremiumBands: [] };
            }
            
            // For backward compatibility
            if (!state.selectedPremiumBands) {
                state.selectedPremiumBands = [];
            }
            
            if (this.classList.contains('selected')) {
                // Add to selected bands if not already there
                if (!state.lenderMarketShare.selectedPremiumBands.includes(value)) {
                    state.lenderMarketShare.selectedPremiumBands.push(value);
                    state.selectedPremiumBands.push(value); // For backward compatibility
                }
            } else {
                // Remove from selected bands
                state.lenderMarketShare.selectedPremiumBands = state.lenderMarketShare.selectedPremiumBands.filter(b => b !== value);
                state.selectedPremiumBands = state.selectedPremiumBands.filter(b => b !== value); // For backward compatibility
            }
            
            // Update counter
            counter.textContent = `${state.lenderMarketShare.selectedPremiumBands.length} selected`;
            
            console.log('Lender Market Share: Premium bands selected after click:', state.lenderMarketShare.selectedPremiumBands);
            
            // Important: Apply the market share analysis to update the table
            applyMarketShareAnalysis();
        });
        
        container.appendChild(chip);
    });
    
    // Update counter
    counter.textContent = `${state.selectedPremiumBands.length} selected`;
}

// --- MARKET SHARE: Reset market share table and filters ---
function resetMarketShareTable() {
    // Reset selected premium bands in state
    state.marketShareFilters.selectedPremiumBands = [];
    state.selectedPremiumBands = [];
    
    // Reset the market share table if it exists
    if (state.marketShareTable) {
        state.marketShareTable.destroy();
        state.marketShareTable = null;
    }
    
    // Clear the market share table container
    elements.marketShareTable.innerHTML = '';
    
    // Reset the checkbox chips (remove selected class from all chips)
    const chips = document.querySelectorAll('.premium-band-chip');
    chips.forEach(chip => {
        chip.classList.remove('selected');
    });
    
    // Reset the counter
    const counter = document.getElementById('premium-bands-counter');
    if (counter) {
        counter.textContent = '0 selected';
    }
}

// Reset the market share trends section when filters change
function resetMarketShareTrends() {
    // Clear any selected premium bands
    const premiumBandChips = document.querySelectorAll('#trends-premium-bands-container .premium-band-chip');
    premiumBandChips.forEach(chip => {
        chip.classList.remove('selected');
    });
    
    // Reset the selected count
    if (elements.trendsPremiumBandsCounter) {
        elements.trendsPremiumBandsCounter.textContent = '0 selected';
    }
    
    // Clear the chart
    if (elements.marketShareTrendsChart) {
        elements.marketShareTrendsChart.innerHTML = 
            '<div class="no-data-message">Please select premium bands and click Apply to view trends.</div>';
    }
    
    // Update the premium band selector
    updatePremiumBandSelector();
}

// --- MARKET SHARE: Aggregate data by lender and premium band ---
function aggregateLenderMarketShare(selectedBands) {
    // Temporarily adjust premium range to include 500-520 band if it's selected
    const originalPremiumRange = [...state.filters.premiumRange];
    
    // If 500-520 band is selected, ensure the premium range includes it
    if (selectedBands.includes('500-520') && state.filters.premiumRange[1] < 520) {
        console.log(`DIAGNOSTIC - Adjusting premium range from [${state.filters.premiumRange[0]}-${state.filters.premiumRange[1]}] to [${state.filters.premiumRange[0]}-520] to include 500-520 band`);
        state.filters.premiumRange[1] = 520;
    }
    
    // Get filtered data without lender filter
    console.log('Getting filtered data for market share analysis (without lender filter)');
    let filtered = getCachedFilteredData(state.esisData, { lenders: false });
    console.log(`Market Share Analysis: Using ${filtered.length} records (respecting all filters except lender)`);
    
    // Restore original premium range
    state.filters.premiumRange = originalPremiumRange;
    
    // DIAGNOSTIC: Check for 500-520 band records in the filtered data
    const highPremiumRecords = filtered.filter(item => item.PremiumBand === '500-520');
    console.log(`DIAGNOSTIC - aggregateLenderMarketShare: Records in 500-520 band after filtering: ${highPremiumRecords.length}`);
    
    if (highPremiumRecords.length > 0) {
        // Calculate total loan amount in this band
        const totalLoanAmount = highPremiumRecords.reduce((sum, record) => sum + (record.Loan || 0), 0);
        console.log(`DIAGNOSTIC - aggregateLenderMarketShare: Total loan amount in 500-520 band: £${totalLoanAmount.toLocaleString()}`);
    }
    
    // DIAGNOSTIC: Check if 500-520 band is in the selected bands
    console.log(`DIAGNOSTIC - aggregateLenderMarketShare: Is 500-520 band selected: ${selectedBands.includes('500-520')}`);
    console.log(`DIAGNOSTIC - aggregateLenderMarketShare: Selected bands:`, selectedBands);
    
    // Get unique lenders
    const lenders = [...new Set(filtered.map(r => r.BaseLender || r.Provider).filter(Boolean))].sort();
    
    // Build structure: { lender: { band1: {amount, pct, below80, above80, below80_pct, above80_pct}, band2: ...}, ... }
    const bandTotals = {};
    selectedBands.forEach(band => {
        bandTotals[band] = 0;
        bandTotals[band + '_below80'] = 0;
        bandTotals[band + '_above80'] = 0;
    });
    
    const lenderData = {};
    lenders.forEach(lender => {
        lenderData[lender] = {};
        selectedBands.forEach(band => {
            lenderData[lender][band] = 0;
            lenderData[lender][band + '_pct'] = 0;
            lenderData[lender][band + '_below80'] = 0;
            lenderData[lender][band + '_below80_pct'] = 0;
            lenderData[lender][band + '_above80'] = 0;
            lenderData[lender][band + '_above80_pct'] = 0;
        });
        lenderData[lender].Total = 0;
        lenderData[lender].Total_pct = 0;
        lenderData[lender].Total_below80 = 0;
        lenderData[lender].Total_above80 = 0;
    });
    
    // DIAGNOSTIC: Check if 500-520 band is in the bandTotals
    console.log(`DIAGNOSTIC - aggregateLenderMarketShare: Is 500-520 band in bandTotals: ${bandTotals.hasOwnProperty('500-520')}`);
    
    // Aggregate
    let highPremiumCount = 0;
    filtered.forEach(r => {
        const lender = r.BaseLender || r.Provider;
        const band = r.PremiumBand;
        
        // DIAGNOSTIC: Count records in 500-520 band that have a lender
        if (band === '500-520' && lender) {
            highPremiumCount++;
            console.log(`DIAGNOSTIC - 500-520 band record:`, {
                Provider: r.Provider,
                BaseLender: r.BaseLender,
                Loan: r.Loan,
                PremiumBand: r.PremiumBand
            });
        }
        
        // Make sure we're processing records for all the selected bands
        // This is the critical fix - ensure we're checking the band is in selectedBands
        if (lender && selectedBands.includes(band)) {
            const loanAmount = r.Loan || 0;
            lenderData[lender][band] += loanAmount;
            bandTotals[band] += loanAmount;
            
            // Split by LTV
            const ltv = r.StandardizedLTV;
            if (ltv !== undefined && ltv !== null && !isNaN(ltv)) {
                if (ltv < 80) {
                    lenderData[lender][band + '_below80'] += loanAmount;
                    bandTotals[band + '_below80'] += loanAmount;
                } else {
                    lenderData[lender][band + '_above80'] += loanAmount;
                    bandTotals[band + '_above80'] += loanAmount;
                }
            } else {
                // If LTV is not available, we still count it in the total but not in LTV breakdowns
                console.log(`Record without LTV data in band ${band} for lender ${lender}`);
            }
        }
    });
    
    // DIAGNOSTIC: Report on 500-520 band records with lenders
    console.log(`DIAGNOSTIC - aggregateLenderMarketShare: Records in 500-520 band with lenders: ${highPremiumCount}`);
    if (bandTotals.hasOwnProperty('500-520')) {
        console.log(`DIAGNOSTIC - aggregateLenderMarketShare: Total in bandTotals for 500-520: £${bandTotals['500-520'].toLocaleString()}`);
    }
    
    // Calculate totals and percentages
    let overallTotal = 0;
    let overallTotal_below80 = 0;
    let overallTotal_above80 = 0;
    
    selectedBands.forEach(band => {
        overallTotal += bandTotals[band];
        overallTotal_below80 += bandTotals[band + '_below80'];
        overallTotal_above80 += bandTotals[band + '_above80'];
    });
    
    // Calculate percentages for each lender and band
    lenders.forEach(lender => {
        let lenderTotal = 0;
        let lenderTotal_below80 = 0;
        let lenderTotal_above80 = 0;
        
        selectedBands.forEach(band => {
            // Total for this band
            lenderTotal += lenderData[lender][band];
            lenderTotal_below80 += lenderData[lender][band + '_below80'];
            lenderTotal_above80 += lenderData[lender][band + '_above80'];
            
            // Calculate percentage of this band's total
            if (bandTotals[band] > 0) {
                lenderData[lender][band + '_pct'] = (lenderData[lender][band] / bandTotals[band]) * 100;
            }
            
            // Calculate percentage of this band's below 80% LTV total
            if (bandTotals[band + '_below80'] > 0) {
                lenderData[lender][band + '_below80_pct'] = (lenderData[lender][band + '_below80'] / bandTotals[band + '_below80']) * 100;
            }
            
            // Calculate percentage of this band's above 80% LTV total
            if (bandTotals[band + '_above80'] > 0) {
                lenderData[lender][band + '_above80_pct'] = (lenderData[lender][band + '_above80'] / bandTotals[band + '_above80']) * 100;
            }
        });
        
        lenderData[lender].Total = lenderTotal;
        lenderData[lender].Total_below80 = lenderTotal_below80;
        lenderData[lender].Total_above80 = lenderTotal_above80;
        
        // Calculate percentage of overall total
        if (overallTotal > 0) {
            lenderData[lender].Total_pct = (lenderTotal / overallTotal) * 100;
        }
        
        // Calculate percentage of overall below 80% LTV total
        if (overallTotal_below80 > 0) {
            lenderData[lender].Total_below80_pct = (lenderTotal_below80 / overallTotal_below80) * 100;
        }
        
        // Calculate percentage of overall above 80% LTV total
        if (overallTotal_above80 > 0) {
            lenderData[lender].Total_above80_pct = (lenderTotal_above80 / overallTotal_above80) * 100;
        }
    });
    
    // Create summary row for total market
    const summary = { Lender: 'Total Market' };
    selectedBands.forEach(band => {
        summary[band] = bandTotals[band];
        summary[band + '_pct'] = 100; // Always 100% of itself
        summary[band + '_below80'] = bandTotals[band + '_below80'];
        summary[band + '_below80_pct'] = 100;
        summary[band + '_above80'] = bandTotals[band + '_above80'];
        summary[band + '_above80_pct'] = 100;
    });
    summary.Total = overallTotal;
    summary.Total_pct = 100; // Always 100% of itself
    summary.Total_below80 = overallTotal_below80;
    summary.Total_below80_pct = 100;
    summary.Total_above80 = overallTotal_above80;
    summary.Total_above80_pct = 100;
    
    return {
        lenders,
        lenderData,
        bandTotals,
        overallTotal,
        overallTotal_below80,
        overallTotal_above80,
        summary
    };
}

function applyMarketShareAnalysis() {
    console.log('DIAGNOSTIC - applyMarketShareAnalysis called');
    
    // Get selected premium bands directly from the UI
    const selectedChips = document.querySelectorAll('#premium-bands-container .premium-band-chip.selected');
    console.log('DIAGNOSTIC - Selected chips found:', selectedChips.length);
    
    // Debug each selected chip
    selectedChips.forEach((chip, index) => {
        console.log(`DIAGNOSTIC - Selected chip ${index}:`, {
            element: chip,
            'data-band': chip.getAttribute('data-band'),
            'dataset.value': chip.dataset.value,
            className: chip.className
        });
    });
    
    // Get selected bands using both data-band attribute and dataset.value as fallback
    const selectedBands = Array.from(selectedChips).map(chip => {
        // Try to get the band from data-band attribute first
        const band = chip.getAttribute('data-band');
        // If data-band is not available, try dataset.value
        return band || chip.dataset.value;
    }).filter(Boolean);
    
    // DIAGNOSTIC: Log the selected bands
    console.log('DIAGNOSTIC - Selected premium bands for market share analysis:', selectedBands);
    console.log('DIAGNOSTIC - 500-520 band is selected:', selectedBands.includes('500-520'));
    
    // Save the selected bands in the lenderMarketShare state
    if (!state.lenderMarketShare) {
        state.lenderMarketShare = {};
    }
    state.lenderMarketShare.selectedPremiumBands = selectedBands;
    
    // For backward compatibility
    if (!state.marketShareFilters) {
        state.marketShareFilters = {};
    }
    state.marketShareFilters.selectedPremiumBands = selectedBands;
    
    console.log('DIAGNOSTIC - State after updating selected bands:', {
        'state.lenderMarketShare.selectedPremiumBands': state.lenderMarketShare.selectedPremiumBands,
        'state.marketShareFilters.selectedPremiumBands': state.marketShareFilters.selectedPremiumBands
    });
    
    // Ensure we have at least one band selected, otherwise default to '0-20'
    if (selectedBands.length === 0) {
        state.lenderMarketShare.selectedPremiumBands = ['0-20'];
        state.marketShareFilters.selectedPremiumBands = ['0-20'];
        
        console.log('DIAGNOSTIC - No bands selected, defaulting to 0-20');
        
        // Update the UI to reflect this default selection
        const chips = document.querySelectorAll('#premium-bands-container .premium-band-chip');
        chips.forEach(chip => {
            if (chip.getAttribute('data-band') === '0-20' || chip.dataset.value === '0-20') {
                chip.classList.add('selected');
            }
        });
        
        // Update counter
        const counter = document.getElementById('premium-bands-counter');
        if (counter) {
            counter.textContent = '1 selected';
        }
    }
    
    // Update the market share table
    updateMarketShareTable();
}

// New function to update the market share table based on current filters
function updateMarketShareTable() {
    console.log('DIAGNOSTIC - updateMarketShareTable called');
    
    // Make sure we have ESIS data to work with
    if (!state.esisData || !Array.isArray(state.esisData)) {
        console.error('Cannot update market share table: ESIS data is not available');
        return;
    }
    
    // Create a custom filtered dataset that respects all filters EXCEPT lender filter
    const data = getCachedFilteredData(state.esisData, { lenders: false });
    
    console.log(`Market Share Analysis: Using ${data.length} records (respecting all filters except lender)`);
    
    // Make sure we have lender market share state initialized
    if (!state.lenderMarketShare) {
        state.lenderMarketShare = { selectedPremiumBands: [] };
    }
    
    // For backward compatibility
    if (!state.marketShareFilters) {
        state.marketShareFilters = { selectedPremiumBands: [] };
    }
    
    // Get the selected premium bands directly from the state
    const selectedBands = state.lenderMarketShare.selectedPremiumBands;
    console.log('DIAGNOSTIC - Selected bands from state:', selectedBands);
    
    if (!selectedBands || selectedBands.length === 0) {
        console.log('DIAGNOSTIC - No bands selected, nothing to update');
        return;
    }
    
    // DIAGNOSTIC: Check for records in the 500-520 band (safely)
    let highPremiumRecords = [];
    if (data && Array.isArray(data)) {
        highPremiumRecords = data.filter(item => item && item.PremiumBand === '500-520');
        console.log(`DIAGNOSTIC - Records in 500-520 band after filtering: ${highPremiumRecords.length}`);
    } else {
        console.log('DIAGNOSTIC - Cannot check for 500-520 band records: data is not an array');
    }
    
    if (highPremiumRecords && highPremiumRecords.length > 0) {
        // Calculate total loan amount in this band
        const totalLoanAmount = highPremiumRecords.reduce((sum, record) => sum + (record.Loan || 0), 0);
        console.log(`DIAGNOSTIC - Total loan amount in 500-520 band: £${totalLoanAmount.toLocaleString()}`);
        
        // Group by provider
        const providerSummary = {};
        highPremiumRecords.forEach(record => {
            const provider = record.Provider || 'Unknown';
            if (!providerSummary[provider]) {
                providerSummary[provider] = {
                    count: 0,
                    totalLoan: 0
                };
            }
            providerSummary[provider].count++;
            providerSummary[provider].totalLoan += (record.Loan || 0);
        });
        
        // Show top providers
        console.log('DIAGNOSTIC - Provider summary for 500-520 band:');
        Object.entries(providerSummary)
            .sort((a, b) => b[1].totalLoan - a[1].totalLoan)
            .forEach(([provider, stats]) => {
                console.log(`${provider}: ${stats.count} records, £${stats.totalLoan.toLocaleString()}`);
            });
    }
    
    // Aggregate and render
    console.log('DIAGNOSTIC - About to call aggregateLenderMarketShare with bands:', selectedBands);
    
    // We'll directly calculate the market share data from our filtered dataset
    // that ignores the lender filter
    
    // Temporarily adjust premium range to include 500-520 band if it's selected
    const originalPremiumRange = [...state.filters.premiumRange];
    
    // If 500-520 band is selected, ensure the premium range includes it
    if (selectedBands.includes('500-520') && state.filters.premiumRange[1] < 520) {
        console.log(`DIAGNOSTIC - Adjusting premium range from [${state.filters.premiumRange[0]}-${state.filters.premiumRange[1]}] to [${state.filters.premiumRange[0]}-520] to include 500-520 band`);
        state.filters.premiumRange[1] = 520;
    }
    
    // Get unique lenders from our filtered data
    const lenders = [...new Set(data.map(r => r.BaseLender || r.Provider).filter(Boolean))].sort();
    
    // Build structure for band totals
    const bandTotals = {};
    selectedBands.forEach(band => {
        bandTotals[band] = 0;
        bandTotals[band + '_below80'] = 0;
        bandTotals[band + '_above80'] = 0;
    });
    
    // Initialize lender data structure
    const lenderData = {};
    lenders.forEach(lender => {
        lenderData[lender] = {};
        selectedBands.forEach(band => {
            lenderData[lender][band] = 0;
            lenderData[lender][band + '_pct'] = 0;
            lenderData[lender][band + '_below80'] = 0;
            lenderData[lender][band + '_below80_pct'] = 0;
            lenderData[lender][band + '_above80'] = 0;
            lenderData[lender][band + '_above80_pct'] = 0;
        });
        lenderData[lender].Total = 0;
        lenderData[lender].Total_pct = 0;
        lenderData[lender].Total_below80 = 0;
        lenderData[lender].Total_above80 = 0;
    });
    
    // Aggregate data
    data.forEach(r => {
        const lender = r.BaseLender || r.Provider;
        const band = r.PremiumBand;
        
        // Make sure we're processing records for all the selected bands
        if (lender && selectedBands.includes(band)) {
            const loanAmount = r.Loan || 0;
            lenderData[lender][band] += loanAmount;
            bandTotals[band] += loanAmount;
            
            // Split by LTV
            const ltv = r.StandardizedLTV;
            if (ltv !== undefined && ltv !== null && !isNaN(ltv)) {
                if (ltv < 80) {
                    lenderData[lender][band + '_below80'] += loanAmount;
                    bandTotals[band + '_below80'] += loanAmount;
                } else {
                    lenderData[lender][band + '_above80'] += loanAmount;
                    bandTotals[band + '_above80'] += loanAmount;
                }
            }
        }
    });
    
    // Calculate totals and percentages
    let overallTotal = 0;
    let overallTotal_below80 = 0;
    let overallTotal_above80 = 0;
    
    selectedBands.forEach(band => {
        overallTotal += bandTotals[band];
        overallTotal_below80 += bandTotals[band + '_below80'];
        overallTotal_above80 += bandTotals[band + '_above80'];
    });
    
    // Calculate percentages for each lender and band
    lenders.forEach(lender => {
        let lenderTotal = 0;
        let lenderTotal_below80 = 0;
        let lenderTotal_above80 = 0;
        
        selectedBands.forEach(band => {
            // Total for this band
            lenderTotal += lenderData[lender][band];
            lenderTotal_below80 += lenderData[lender][band + '_below80'];
            lenderTotal_above80 += lenderData[lender][band + '_above80'];
            
            // Calculate percentage of this band's total
            if (bandTotals[band] > 0) {
                lenderData[lender][band + '_pct'] = (lenderData[lender][band] / bandTotals[band]) * 100;
            }
            
            // Calculate percentage of this band's below 80% LTV total
            if (bandTotals[band + '_below80'] > 0) {
                lenderData[lender][band + '_below80_pct'] = (lenderData[lender][band + '_below80'] / bandTotals[band + '_below80']) * 100;
            }
            
            // Calculate percentage of this band's above 80% LTV total
            if (bandTotals[band + '_above80'] > 0) {
                lenderData[lender][band + '_above80_pct'] = (lenderData[lender][band + '_above80'] / bandTotals[band + '_above80']) * 100;
            }
        });
        
        lenderData[lender].Total = lenderTotal;
        lenderData[lender].Total_below80 = lenderTotal_below80;
        lenderData[lender].Total_above80 = lenderTotal_above80;
        
        // Calculate percentage of overall total
        if (overallTotal > 0) {
            lenderData[lender].Total_pct = (lenderTotal / overallTotal) * 100;
        }
        
        // Calculate percentage of overall below 80% LTV total
        if (overallTotal_below80 > 0) {
            lenderData[lender].Total_below80_pct = (lenderTotal_below80 / overallTotal_below80) * 100;
        }
        
        // Calculate percentage of overall above 80% LTV total
        if (overallTotal_above80 > 0) {
            lenderData[lender].Total_above80_pct = (lenderTotal_above80 / overallTotal_above80) * 100;
        }
    });
    
    // Create summary row for total market
    const summary = { Lender: 'Total Market' };
    selectedBands.forEach(band => {
        summary[band] = bandTotals[band];
        summary[band + '_pct'] = 100; // Always 100% of itself
        summary[band + '_below80'] = bandTotals[band + '_below80'];
        summary[band + '_below80_pct'] = 100;
        summary[band + '_above80'] = bandTotals[band + '_above80'];
        summary[band + '_above80_pct'] = 100;
    });
    summary.Total = overallTotal;
    summary.Total_pct = 100; // Always 100% of itself
    summary.Total_below80 = overallTotal_below80;
    summary.Total_below80_pct = 100;
    summary.Total_above80 = overallTotal_above80;
    summary.Total_above80_pct = 100;
    
    // Restore original premium range
    state.filters.premiumRange = originalPremiumRange;
    
    // Create the final data object for rendering
    const dataForRender = {
        lenders,
        lenderData,
        bandTotals,
        overallTotal,
        overallTotal_below80,
        overallTotal_above80,
        summary
    };
    
    state.lenderMarketShareData = dataForRender;
    
    // DIAGNOSTIC: Check if 500-520 band data is in the aggregated data
    if (dataForRender.bandTotals && dataForRender.bandTotals['500-520']) {
        console.log(`DIAGNOSTIC - 500-520 band total in aggregated data: £${dataForRender.bandTotals['500-520'].toLocaleString()}`);
    } else {
        console.log('DIAGNOSTIC - 500-520 band is missing from aggregated data bandTotals');
    }
    
    console.log('DIAGNOSTIC - Calling renderLenderMarketShareTable with bands:', selectedBands);
    renderLenderMarketShareTable(dataForRender, selectedBands);
}

// --- MARKET SHARE: Render Tabulator table ---
function renderLenderMarketShareTable(data, selectedBands) {
    // Note about values being in millions removed as requested
    // DIAGNOSTIC: Check the structure of the data object
    console.log('DIAGNOSTIC - renderLenderMarketShareTable input data:', typeof data);
    
    // Check if 500-520 band is in the selected bands
    const has500520Band = selectedBands.includes('500-520');
    console.log(`DIAGNOSTIC - 500-520 band is selected in render function: ${has500520Band}`);
    
    // Check if 500-520 band data exists in the bandTotals
    if (data.bandTotals && data.bandTotals['500-520'] !== undefined) {
        console.log(`DIAGNOSTIC - 500-520 band total in render function: £${data.bandTotals['500-520'].toLocaleString()}`);
    } else {
        console.log('DIAGNOSTIC - 500-520 band is missing from bandTotals in render function');
    }
    
    // Check lender data for 500-520 band
    if (has500520Band && data.lenders && data.lenderData) {
        console.log('DIAGNOSTIC - Sample lender data for 500-520 band:');
        let count = 0;
        for (const lender of data.lenders.slice(0, 3)) {
            if (data.lenderData[lender] && data.lenderData[lender]['500-520'] !== undefined) {
                console.log(`${lender}: £${data.lenderData[lender]['500-520'].toLocaleString()}`);
                count++;
            }
        }
        if (count === 0) {
            console.log('No lenders have data for the 500-520 band');
        }
    }
    
    // Check if table already exists and destroy it
    if (state.marketShareTable) {
        state.marketShareTable.destroy();
    }
    // Build columns
    const columns = [
        { title: 'Lender', field: 'Lender', frozen: true, headerSort: true }
    ];
    
    // Only use the bands that were actually selected
    const actualSelectedBands = selectedBands.filter(band => {
        // Verify this band exists in the data
        const exists = data.bandTotals && data.bandTotals[band] !== undefined;
        if (!exists) {
            console.log(`DIAGNOSTIC - Band ${band} was selected but not found in data.bandTotals`);
        }
        return exists;
    });
    
    // Log the actual bands being used
    console.log('DIAGNOSTIC - Actual bands used in table:', actualSelectedBands);
    console.log('DIAGNOSTIC - All available bands in data.bandTotals:', Object.keys(data.bandTotals || {}));
    
    // Use the verified bands to build columns
    actualSelectedBands.forEach(band => {
        columns.push({
            title: band,
            columns: [
                {
                    title: 'Total',
                    field: band,
                    hozAlign: 'right',
                    sorter: 'number',
                    formatter: function(cell) {
                        const amt = cell.getValue();
                        const pct = cell.getRow().getData()[band + '_pct'];
                        // Visual: horizontal bar
                        const barWidth = Math.min(100, pct || 0);
                        const amtInMillions = (amt / 1000000).toFixed(2);
                        // Format the millions with commas
                        const formattedAmtInMillions = Number(amtInMillions).toLocaleString();
                        return `<div style="display:flex;align-items:center;">
                            <div style="background:#b3d1ff;height:16px;width:${barWidth}px;max-width:60px;margin-right:4px;"></div>
                            <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(2) : '0.00'}%)">
                                £${formattedAmtInMillions}m<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(2) : '0.00'}%</span>
                            </span>
                        </div>`;
                    },
                    headerSort: true,
                    tooltip: true
                },
                {
                    title: '<80% LTV',
                    field: band + '_below80',
                    hozAlign: 'right',
                    sorter: 'number',
                    formatter: function(cell) {
                        const amt = cell.getValue();
                        const pct = cell.getRow().getData()[band + '_below80_pct'];
                        // Visual: horizontal bar - light blue for below 80% LTV
                        const barWidth = Math.min(100, pct || 0);
                        const amtInMillions = (amt / 1000000).toFixed(2);
                        // Format the millions with commas
                        const formattedAmtInMillions = Number(amtInMillions).toLocaleString();
                        return `<div style="display:flex;align-items:center;">
                            <div style="background:#d1e6ff;height:16px;width:${barWidth}px;max-width:60px;margin-right:4px;"></div>
                            <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(2) : '0.00'}%)">
                                £${formattedAmtInMillions}m<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(2) : '0.00'}%</span>
                            </span>
                        </div>`;
                    },
                    headerSort: true,
                    tooltip: true
                },
                {
                    title: '>80% LTV',
                    field: band + '_above80',
                    hozAlign: 'right',
                    sorter: 'number',
                    formatter: function(cell) {
                        const amt = cell.getValue();
                        const pct = cell.getRow().getData()[band + '_above80_pct'];
                        // Visual: horizontal bar - darker blue for above 80% LTV
                        const barWidth = Math.min(100, pct || 0);
                        const amtInMillions = (amt / 1000000).toFixed(2);
                        // Format the millions with commas
                        const formattedAmtInMillions = Number(amtInMillions).toLocaleString();
                        return `<div style="display:flex;align-items:center;">
                            <div style="background:#80b3ff;height:16px;width:${barWidth}px;max-width:60px;margin-right:4px;"></div>
                            <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(2) : '0.00'}%)">
                                £${formattedAmtInMillions}m<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(2) : '0.00'}%</span>
                            </span>
                        </div>`;
                    },
                    headerSort: true,
                    tooltip: true
                }
            ]
        });
    });
    columns.push({
        title: 'Total',
        columns: [
            {
                title: 'Total',
                field: 'Total',
                hozAlign: 'right',
                sorter: 'number',
                formatter: function(cell) {
                    const amt = cell.getValue();
                    const pct = cell.getRow().getData().Total_pct;
                    const amtInMillions = (amt / 1000000).toFixed(2);
                    // Format the millions with commas
                    const formattedAmtInMillions = Number(amtInMillions).toLocaleString();
                    return `<div style="display:flex;align-items:center;">
                        <div style="background:#b3ffc6;height:16px;width:${Math.min(100, pct || 0)}px;max-width:60px;margin-right:4px;"></div>
                        <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(2) : '0.00'}%)">
                            £${formattedAmtInMillions}m<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(2) : '0.00'}%</span>
                        </span>
                    </div>`;
                },
                headerSort: true,
                tooltip: true
            },
            {
                title: '<80% LTV',
                field: 'Total_below80',
                hozAlign: 'right',
                sorter: 'number',
                formatter: function(cell) {
                    const amt = cell.getValue();
                    const pct = cell.getRow().getData().Total_below80_pct;
                    const amtInMillions = (amt / 1000000).toFixed(2);
                    // Format the millions with commas
                    const formattedAmtInMillions = Number(amtInMillions).toLocaleString();
                    return `<div style="display:flex;align-items:center;">
                        <div style="background:#d1ffdb;height:16px;width:${Math.min(100, pct || 0)}px;max-width:60px;margin-right:4px;"></div>
                        <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(2) : '0.00'}%)">
                            £${formattedAmtInMillions}m<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(2) : '0.00'}%</span>
                        </span>
                    </div>`;
                },
                headerSort: true,
                tooltip: true
            },
            {
                title: '>80% LTV',
                field: 'Total_above80',
                hozAlign: 'right',
                sorter: 'number',
                formatter: function(cell) {
                    const amt = cell.getValue();
                    const pct = cell.getRow().getData().Total_above80_pct;
                    const amtInMillions = (amt / 1000000).toFixed(2);
                    // Format the millions with commas
                    const formattedAmtInMillions = Number(amtInMillions).toLocaleString();
                    return `<div style="display:flex;align-items:center;">
                        <div style="background:#80e699;height:16px;width:${Math.min(100, pct || 0)}px;max-width:60px;margin-right:4px;"></div>
                        <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(2) : '0.00'}%)">
                            £${formattedAmtInMillions}m<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(2) : '0.00'}%</span>
                        </span>
                    </div>`;
                },
                headerSort: true,
                tooltip: true
            }
        ]
    });
    // Prepare data rows
    const tableData = [];
    
    // Add data for each lender
    data.lenders.forEach(lender => {
        const row = { Lender: lender };
        
        // Add data for each band - use the actual selected bands that exist in the data
        actualSelectedBands.forEach(band => {
            row[band] = data.lenderData[lender][band];
            row[band + '_pct'] = data.lenderData[lender][band + '_pct'];
            row[band + '_below80'] = data.lenderData[lender][band + '_below80'];
            row[band + '_below80_pct'] = data.lenderData[lender][band + '_below80_pct'];
            row[band + '_above80'] = data.lenderData[lender][band + '_above80'];
            row[band + '_above80_pct'] = data.lenderData[lender][band + '_above80_pct'];
        });
        row.Total = data.lenderData[lender].Total;
        row.Total_pct = data.lenderData[lender].Total_pct;
        row.Total_below80 = data.lenderData[lender].Total_below80;
        row.Total_below80_pct = data.lenderData[lender].Total_below80_pct;
        row.Total = data.lenderData[lender].Total;
        row.Total_pct = data.lenderData[lender].Total_pct;
        row.Total_below80 = data.lenderData[lender].Total_below80;
        row.Total_below80_pct = data.lenderData[lender].Total_below80_pct;
        row.Total_above80 = data.lenderData[lender].Total_above80;
        row.Total_above80_pct = data.lenderData[lender].Total_above80_pct;
        tableData.push(row);
    });
    // Add summary row
    tableData.push(data.summary);
    // Render
    state.marketShareTable = new Tabulator(elements.marketShareTable, {
        data: tableData,
        columns: columns,
        layout: 'fitColumns',
        height: '450px',
        movableColumns: true,
        initialSort: [{ column: actualSelectedBands.length > 0 ? actualSelectedBands[0] : 'Lender', dir: 'desc' }],
        rowFormatter: function(row) {
            if (row.getData().Lender === 'Total Market') {
                row.getElement().style.fontWeight = 'bold';
                row.getElement().style.backgroundColor = '#eaecee';
            }
        }
    });
}

// --- MARKET SHARE: Export Function ---
function exportMarketShareData() {
    if (state.marketShareTable) {
        state.marketShareTable.download('csv', 'lender_market_share_analysis.csv');
    }
}

// --- HEATMAP: Data Processing Function ---
function prepareHeatmapData(filteredData) {
    // Get unique lenders and premium bands
    const lenders = [...new Set(filteredData.map(r => r.BaseLender || r.Provider))].sort();
    
    // Custom sort function for premium bands to ensure correct numerical order
    const premiumBands = [...new Set(filteredData.map(r => r.PremiumBand))].sort((a, b) => {
        // Extract the starting number from each band (e.g., "0-20" -> 0, "20-40" -> 20)
        const aStart = parseInt(a.split('-')[0]);
        const bStart = parseInt(b.split('-')[0]);
        return aStart - bStart;
    });
    
    // Initialize data structure
    const heatmapData = {
        lenders: lenders,
        premiumBands: premiumBands,
        lenderMode: {}, // Lender-centric view
        premiumMode: {}  // Premium-centric view
    };
    
    // Create empty data structure
    lenders.forEach(lender => {
        heatmapData.lenderMode[lender] = {};
        premiumBands.forEach(band => {
            heatmapData.lenderMode[lender][band] = 0;
        });
    });
    
    premiumBands.forEach(band => {
        heatmapData.premiumMode[band] = {};
        lenders.forEach(lender => {
            heatmapData.premiumMode[band][lender] = 0;
        });
    });
    
    // Aggregate the data
    filteredData.forEach(record => {
        const lender = record.BaseLender || record.Provider;
        const band = record.PremiumBand;
        const loanAmount = record.Loan || 0;
        
        if (lender && band && lenders.includes(lender) && premiumBands.includes(band)) {
            heatmapData.lenderMode[lender][band] += loanAmount;
            heatmapData.premiumMode[band][lender] += loanAmount;
        }
    });
    
    // Calculate lender totals for normalization
    const lenderTotals = {};
    lenders.forEach(lender => {
        lenderTotals[lender] = Object.values(heatmapData.lenderMode[lender]).reduce((a, b) => a + b, 0);
    });
    
    // Calculate premium band totals for normalization
    const bandTotals = {};
    premiumBands.forEach(band => {
        bandTotals[band] = Object.values(heatmapData.premiumMode[band]).reduce((a, b) => a + b, 0);
    });
    
    // Calculate percentages for lender mode
    lenders.forEach(lender => {
        if (lenderTotals[lender] > 0) {
            premiumBands.forEach(band => {
                heatmapData.lenderMode[lender][band + '_pct'] = 
                    (heatmapData.lenderMode[lender][band] / lenderTotals[lender]) * 100;
            });
        }
    });
    
    // Calculate percentages for premium mode
    premiumBands.forEach(band => {
        if (bandTotals[band] > 0) {
            lenders.forEach(lender => {
                heatmapData.premiumMode[band][lender + '_pct'] = 
                    (heatmapData.premiumMode[band][lender] / bandTotals[band]) * 100;
            });
        }
    });
    
    // Store raw totals for reference
    heatmapData.lenderTotals = lenderTotals;
    heatmapData.bandTotals = bandTotals;
    
    return heatmapData;
}

// --- HEATMAP: Rendering Function ---
function renderHeatmap(heatmapData, mode = 'lender', sortBy = null, sortDirection = 'desc') {
    console.time('renderHeatmap');
    const container = document.getElementById('heatmap-visualization');
    container.innerHTML = '';
    
    // Create table element
    const table = document.createElement('table');
    table.className = 'heatmap-table';
    table.setAttribute('role', 'grid');
    table.setAttribute('aria-label', mode === 'lender' ? 'Distribution of Each Lender\'s Volume' : 'Market Share Within Premium Bands');
    
    // Create caption for screen readers
    const caption = document.createElement('caption');
    caption.textContent = mode === 'lender' 
        ? 'Heatmap showing distribution of each lender\'s volume across premium bands' 
        : 'Heatmap showing market share within premium bands across lenders';
    table.appendChild(caption);
    
    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add empty cell for top-left corner
    const cornerCell = document.createElement('th');
    cornerCell.setAttribute('scope', 'col');
    cornerCell.setAttribute('aria-label', 'Lenders / Premium Bands');
    headerRow.appendChild(cornerCell);
    
    // Add premium band headers with sorting functionality
    heatmapData.premiumBands.forEach(band => {
        const th = document.createElement('th');
        th.textContent = band;
        th.setAttribute('scope', 'col');
        th.classList.add('sortable');
        
        // Add sort indicator if this column is being sorted
        if (sortBy === band) {
            th.classList.add('sorted', sortDirection === 'asc' ? 'asc' : 'desc');
            th.setAttribute('aria-sort', sortDirection === 'asc' ? 'ascending' : 'descending');
        } else {
            th.setAttribute('aria-sort', 'none');
        }
        
        // Add click event for sorting
        th.addEventListener('click', () => {
            // Determine sort direction - if already sorting by this column, toggle direction
            let newDirection = 'desc';
            if (sortBy === band && sortDirection === 'desc') {
                newDirection = 'asc';
            }
            // Re-render with new sort parameters
            renderHeatmap(heatmapData, mode, band, newDirection);
        });
        
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Sort lenders if a sort column is specified
    let sortedLenders = [...heatmapData.lenders]; // Create a copy to avoid modifying the original
    
    if (sortBy) {
        sortedLenders.sort((a, b) => {
            let aValue, bValue;
            
            if (mode === 'lender') {
                // Use percentage values for sorting
                aValue = heatmapData.lenderMode[a][sortBy + '_pct'] || 0;
                bValue = heatmapData.lenderMode[b][sortBy + '_pct'] || 0;
            } else {
                aValue = heatmapData.premiumMode[sortBy][a + '_pct'] || 0;
                bValue = heatmapData.premiumMode[sortBy][b + '_pct'] || 0;
            }
            
            // Sort based on direction
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }
    
    // Add rows for each lender (now potentially sorted)
    sortedLenders.forEach(lender => {
        const row = document.createElement('tr');
        
        // Add lender name cell with truncation
        const lenderCell = document.createElement('th');
        lenderCell.textContent = lender;
        lenderCell.setAttribute('scope', 'row');
        lenderCell.style.maxWidth = '150px';
        lenderCell.style.overflow = 'hidden';
        lenderCell.style.textOverflow = 'ellipsis';
        lenderCell.style.whiteSpace = 'nowrap';
        lenderCell.title = lender; // Show full name on hover
        row.appendChild(lenderCell);
        
        // Add data cells
        heatmapData.premiumBands.forEach(band => {
            const cell = document.createElement('td');
            
            // Calculate cell value and color based on mode
            let value, percentage, intensity;
            
            if (mode === 'lender') {
                value = heatmapData.lenderMode[lender][band] || 0;
                percentage = heatmapData.lenderMode[lender][band + '_pct'] || 0;
                // Max intensity will be within each lender's row
                intensity = Math.min(percentage / 25 * 100, 100);
            } else {
                value = heatmapData.premiumMode[band][lender] || 0;
                percentage = heatmapData.premiumMode[band][lender + '_pct'] || 0;
                // Max intensity will be within each premium band column
                intensity = Math.min(percentage / 25 * 100, 100);
            }
            
            // Apply color based on intensity (red gradient)
            cell.style.backgroundColor = `rgba(255, 100, 40, ${intensity/100})`;
            
            // Set text content for accessibility (hidden visually but available to screen readers)
            cell.textContent = `${percentage.toFixed(1)}%`;
            
            // Add data attributes for tooltips
            cell.setAttribute('data-value', formatCurrency(value));
            cell.setAttribute('data-percentage', percentage.toFixed(1) + '%');
            cell.setAttribute('aria-label', `${lender} in ${band} band: ${formatCurrency(value)} (${percentage.toFixed(1)}%)`);
            
            // Add tooltip event listeners
            cell.addEventListener('mouseover', showTooltip);
            cell.addEventListener('mouseout', hideTooltip);
            
            row.appendChild(cell);
        });
        
        fragment.appendChild(row);
    });
    
    tbody.appendChild(fragment);
    table.appendChild(tbody);
    
    // Add a legend for the heatmap and sorting instructions
    const legend = document.createElement('div');
    legend.className = 'heatmap-legend';
    legend.innerHTML = `
        <p class="legend-title">${mode === 'lender' ? 'Lender Distribution' : 'Market Share'} Legend:</p>
        <div class="legend-items">
            <div class="legend-item">
                <span class="legend-color" style="background-color: rgba(255, 100, 40, 0.1);"></span>
                <span class="legend-label">Low</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: rgba(255, 100, 40, 0.5);"></span>
                <span class="legend-label">Medium</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: rgba(255, 100, 40, 1);"></span>
                <span class="legend-label">High</span>
            </div>
        </div>
        <p class="sort-instructions">Click on any premium band header to sort lenders by that column.</p>
        </div>
    `;
    
    // Create a container for the table and legend
    const heatmapContainer = document.createElement('div');
    heatmapContainer.className = 'heatmap-visualization-container';
    heatmapContainer.appendChild(table);
    heatmapContainer.appendChild(legend);
    
    container.appendChild(heatmapContainer);
    console.timeEnd('renderHeatmap');
}

// Helper tooltip functions for heatmap
function showTooltip(event) {
    const value = event.target.getAttribute('data-value');
    const percentage = event.target.getAttribute('data-percentage');
    
    const tooltip = document.createElement('div');
    tooltip.className = 'heatmap-tooltip';
    tooltip.innerHTML = `Volume: ${value}<br>Percentage: ${percentage}`;
    
    tooltip.style.position = 'absolute';
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY + 10) + 'px';
    
    document.body.appendChild(tooltip);
    event.target.setAttribute('data-tooltip-active', 'true');
}

function hideTooltip(event) {
    const tooltips = document.querySelectorAll('.heatmap-tooltip');
    tooltips.forEach(t => t.remove());
    event.target.removeAttribute('data-tooltip-active');
}

// Helper function to format currency values
function formatCurrency(value) {
    // Format as millions with 2 decimal places
    const valueInMillions = (value / 1000000).toFixed(2);
    return `£${Number(valueInMillions).toLocaleString()}m`;
}

// --- HEATMAP: Helper function to get data without lender filter ---
function getHeatmapData() {
    console.log('Getting filtered data for heatmap visualization (without lender filter)');
    return getCachedFilteredData(state.esisData, { lenders: false });
}

// --- HEATMAP: Update Function ---
function updateHeatmap() {
    console.log('Updating heatmap visualization...');
    
    // Ensure the heatmap visualization element exists
    const heatmapVisualization = document.getElementById('heatmap-visualization');
    if (!heatmapVisualization) {
        console.warn('Heatmap visualization element not found, attempting to recreate it');
        ensureHeatmapElementsExist();
        // Try to get the element again after creating it
        const newHeatmapVisualization = document.getElementById('heatmap-visualization');
        if (!newHeatmapVisualization) {
            console.error('Failed to create heatmap visualization element');
            return;
        }
        newHeatmapVisualization.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><p>Generating heatmap...</p></div>';
    } else {
        heatmapVisualization.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><p>Generating heatmap...</p></div>';
    }
        
        // Get filtered data without lender filter
        const filteredData = getHeatmapData();
        
        // Get the heatmap visualization element again as it might have been recreated
        let vizElement = document.getElementById('heatmap-visualization');
        if (!vizElement) {
            console.error('Heatmap visualization element not found after attempting to recreate it');
            return;
        }
        
        if (filteredData.length === 0) {
            console.warn('No data available for heatmap visualization');
            vizElement.innerHTML = '<p class="no-data">No data available for the selected filters.</p>';
            return;
        }
        
        // Check if we have enough unique lenders and premium bands for a meaningful heatmap
        const uniqueLenders = new Set(filteredData.map(r => r.BaseLender || r.Provider));
        const uniquePremiumBands = new Set(filteredData.map(r => r.PremiumBand));
        
        if (uniqueLenders.size <= 1 || uniquePremiumBands.size <= 1) {
            console.warn('Not enough unique lenders or premium bands for a meaningful heatmap');
            vizElement.innerHTML = 
                '<p class="warning">Not enough data variation for a meaningful heatmap. ' + 
                'Please adjust filters to include multiple lenders and premium bands.</p>';
            return;
        }
        
        // Use setTimeout to allow the loading indicator to render before processing data
        setTimeout(() => {
            // Prepare data for the heatmap
            const heatmapData = prepareHeatmapData(filteredData);
            
            // Get current visualization mode with fallback
            const modeElement = document.querySelector('input[name="heatmap-mode"]:checked');
            const mode = modeElement ? modeElement.value : 'lender'; // Default to lender mode if not found
            console.log('Current heatmap mode:', mode);
            
            // Render the heatmap
            renderHeatmap(heatmapData, mode);
            
            // Re-attach event listeners to radio buttons
            attachHeatmapModeListeners();
            
            console.log('Heatmap updated successfully');
        }, 10);
}

// Function to update the heatmap without resetting it, using current filters
function updateHeatmapWithCurrentFilters() {
    console.log('Updating heatmap with current filters...');
    
    // Ensure the heatmap visualization element exists
    const vizElement = document.getElementById('heatmap-visualization');
    if (!vizElement) {
        console.warn('Heatmap visualization element not found, attempting to recreate it');
        ensureHeatmapElementsExist();
        // Try to get the element again after creating it
        const newVizElement = document.getElementById('heatmap-visualization');
        if (!newVizElement) {
            console.error('Failed to create heatmap visualization element');
            return;
        }
        newVizElement.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><p>Generating heatmap...</p></div>';
    } else {
        // Show loading indicator but preserve the current state
        const currentState = vizElement.innerHTML;
        vizElement.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><p>Updating heatmap...</p></div>';
        
        // Store the current state to restore if there's an error
        vizElement.dataset.previousState = currentState;
    }
        
        // Get filtered data without lender filter
        const filteredData = getHeatmapData();
        
        // Get the heatmap visualization element again as it might have been recreated
        let finalVizElement = document.getElementById('heatmap-visualization');
        if (!finalVizElement) {
            console.error('Heatmap visualization element not found after attempting to recreate it');
            return;
        }
        
        if (filteredData.length === 0) {
            console.warn('No data available for heatmap visualization');
            finalVizElement.innerHTML = '<p class="no-data">No data available for the selected filters.</p>';
            return;
        }
        
        // Check if we have enough unique lenders and premium bands for a meaningful heatmap
        const uniqueLenders = new Set(filteredData.map(r => r.BaseLender || r.Provider));
        const uniquePremiumBands = new Set(filteredData.map(r => r.PremiumBand));
        
        if (uniqueLenders.size <= 1 || uniquePremiumBands.size <= 1) {
            console.warn('Not enough unique lenders or premium bands for a meaningful heatmap');
            finalVizElement.innerHTML = 
                '<p class="warning">Not enough data variation for a meaningful heatmap. ' + 
                'Please adjust filters to include multiple lenders and premium bands.</p>';
            return;
        }
        
        // Use setTimeout to allow the loading indicator to render before processing data
        setTimeout(() => {
            // Prepare data for the heatmap
            const heatmapData = prepareHeatmapData(filteredData);
            
            // Get current visualization mode with fallback
            const modeElement = document.querySelector('input[name="heatmap-mode"]:checked');
            const mode = modeElement ? modeElement.value : 'lender'; // Default to lender mode if not found
            console.log('Current heatmap mode:', mode);
            
            // Get current sort parameters if they exist
            let sortBy = null;
            let sortDirection = 'desc';
            
            // Check if we have any sorted columns
            const sortedHeader = document.querySelector('.heatmap-table th.sorted');
            if (sortedHeader) {
                sortBy = sortedHeader.textContent;
                sortDirection = sortedHeader.classList.contains('asc') ? 'asc' : 'desc';
                console.log(`Preserving sort: ${sortBy} (${sortDirection})`);
            }
            
            // Render the heatmap with preserved sort parameters
            renderHeatmap(heatmapData, mode, sortBy, sortDirection);
            
            // Re-attach event listeners to radio buttons
            attachHeatmapModeListeners();
            
            console.log('Heatmap updated successfully with current filters');
        }, 10);
}

// Function to attach event listeners to heatmap mode radio buttons
function attachHeatmapModeListeners() {
    const radioButtons = document.querySelectorAll('input[name="heatmap-mode"]');
    console.log('Attaching listeners to', radioButtons.length, 'radio buttons');
    
    radioButtons.forEach(radio => {
        // Remove any existing listeners to prevent duplicates
        radio.removeEventListener('change', updateHeatmapOnModeChange);
        // Add the new listener
        radio.addEventListener('change', updateHeatmapOnModeChange);
    });
}

// Separate function to handle mode changes to avoid closure issues
function updateHeatmapOnModeChange(event) {
    console.log('Heatmap mode changed to:', event.target.value);
    // Use the new function that preserves state
    updateHeatmapWithCurrentFilters();
}

// Chart.js Configuration and Functions
function initChartJsConfig() {
    // Verify Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js library not loaded. Please check your script imports.');
        // Try to load Chart.js dynamically if it's not available
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = function() {
            console.log('Chart.js library loaded dynamically');
            configureChartJs();
        };
        script.onerror = function() {
            console.error('Failed to load Chart.js dynamically');
        };
        document.head.appendChild(script);
        return;
    }
    
    console.log('Chart.js library loaded successfully');
    configureChartJs();
}

// Configure Chart.js defaults
function configureChartJs() {
    if (typeof Chart === 'undefined') {
        console.error('Cannot configure Chart.js - library not loaded');
        return;
    }
    
    // Set default Chart.js configuration
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = '#666';
    Chart.defaults.responsive = true;
    
    // Make sure we have the chart container
    if (!elements.marketShareTrendsChart) {
        elements.marketShareTrendsChart = document.getElementById('market-share-trends-chart');
    }
    
    // Show initial empty state for market share trends chart
    if (elements.marketShareTrendsChart) {
        elements.marketShareTrendsChart.innerHTML = 
            '<div class="no-data-message">Please select premium bands and click Apply to view trends.</div>';
    }
}

// Create a line chart configuration template function
function createLineChartConfig(labels, datasets) {
    return {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    align: 'start',
                    labels: {
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    mode: 'nearest',
                    intersect: true,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            const lender = context.dataset.label || '';
                            const percentage = context.parsed.y !== null ? context.parsed.y.toFixed(1) + '%' : '0.0%';
                            
                            // Get the total lending amount for this lender in this month
                            const monthIndex = context.dataIndex;
                            const monthKey = context.chart.data.monthKeys[monthIndex];
                            const lenderData = context.chart.data.lenderData;
                            
                            if (lenderData && lenderData[monthKey] && lenderData[monthKey][lender]) {
                                const amount = lenderData[monthKey][lender];
                                const formattedAmount = formatCurrency(amount);
                                return `${lender}: ${percentage} (${formattedAmount})`;
                            }
                            
                            return `${lender}: ${percentage}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Market Share (%)',
                        font: {
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    title: {
                        display: false
                    }
                }
            }
        }
    };
}

// Function to generate a random color for chart datasets
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Market Share Trends Functions

// Initialize the premium band selector for market share trends
function initializePremiumBandSelector() {
    console.log('Initializing premium band selector...');
    
    // Re-get the element references to ensure they're up to date
    elements.trendsPremiumBandsContainer = document.getElementById('trends-premium-bands-container');
    elements.trendsPremiumBandsCounter = document.getElementById('trends-premium-bands-counter');
    elements.trendsApplyBtn = document.getElementById('trends-apply-btn');
    elements.trendsExportBtn = document.getElementById('trends-export-btn');
    elements.marketShareTrendsChart = document.getElementById('market-share-trends-chart');
    elements.marketShareTrendsSection = document.getElementById('market-share-trends-section');
    
    console.log('Premium bands container found:', !!elements.trendsPremiumBandsContainer);
    console.log('Premium bands counter found:', !!elements.trendsPremiumBandsCounter);
    console.log('Trends apply button found:', !!elements.trendsApplyBtn);
    console.log('Trends export button found:', !!elements.trendsExportBtn);
    console.log('Market share trends chart found:', !!elements.marketShareTrendsChart);
    console.log('Market share trends section found:', !!elements.marketShareTrendsSection);
    
    // If the trends premium bands container doesn't exist yet, exit
    if (!elements.trendsPremiumBandsContainer) {
        console.warn('Premium bands container element not found');
        return;
    }
    
    // Add event listeners for the Apply and Export buttons
    if (elements.trendsApplyBtn) {
        elements.trendsApplyBtn.addEventListener('click', updateMarketShareTrendsChart);
        console.log('Added click event listener to trends apply button');
    }
    
    if (elements.trendsExportBtn) {
        elements.trendsExportBtn.addEventListener('click', exportTrendsData);
        console.log('Added click event listener to trends export button');
    }
    
    // If we don't have data yet, we'll populate the bands when data is processed
    if (!state.esisData || !state.esisData.length) {
        console.log('No data available yet for premium band selector');
        return;
    }
    
    console.log('Calling populatePremiumBands() with', state.esisData.length, 'records');
    populatePremiumBands();
}

// Update the premium band selector when data changes
function updatePremiumBandSelector() {
    // Make sure we have the element references
    if (!elements.trendsPremiumBandsContainer) {
        elements.trendsPremiumBandsContainer = document.getElementById('trends-premium-bands-container');
    }
    
    if (!elements.trendsPremiumBandsCounter) {
        elements.trendsPremiumBandsCounter = document.getElementById('trends-premium-bands-counter');
    }
    
    if (!elements.marketShareTrendsSection) {
        elements.marketShareTrendsSection = document.getElementById('market-share-trends-section');
    }
    
    if (!elements.marketShareTrendsChart) {
        elements.marketShareTrendsChart = document.getElementById('market-share-trends-chart');
    }
    
    // If we still don't have the elements, exit
    if (!elements.trendsPremiumBandsContainer) {
        console.warn('Premium bands container element not found during update');
        return;
    }
    
    // If we have data, populate the premium bands
    if (state.esisData && state.esisData.length > 0) {
        populatePremiumBands();
    }
    
    // Show the market share trends section
    if (elements.marketShareTrendsSection) {
        elements.marketShareTrendsSection.classList.remove('hidden');
    }
}

// Populate premium bands from the data
function populatePremiumBands() {
    console.log('Populating premium bands...');
    
    // Double-check that we have the element references
    if (!elements.trendsPremiumBandsContainer) {
        elements.trendsPremiumBandsContainer = document.getElementById('trends-premium-bands-container');
        console.log('Re-fetched trends premium bands container:', elements.trendsPremiumBandsContainer ? 'found' : 'not found');
    }
    
    if (!elements.trendsPremiumBandsCounter) {
        elements.trendsPremiumBandsCounter = document.getElementById('trends-premium-bands-counter');
        console.log('Re-fetched trends premium bands counter:', elements.trendsPremiumBandsCounter ? 'found' : 'not found');
    }
    
    // Exit if we still don't have the elements or data
    if (!elements.trendsPremiumBandsContainer || !state.esisData) {
        console.warn('Cannot populate premium bands: missing container element or data');
        return;
    }
    
    // Get all unique premium bands from the data
    const premiumBands = [...new Set(state.esisData.map(r => r.PremiumBand))].sort((a, b) => {
        // Sort numerically by the first number in each band
        const aNum = parseInt(a.split('-')[0]);
        const bNum = parseInt(b.split('-')[0]);
        return aNum - bNum;
    });
    
    console.log(`Found ${premiumBands.length} unique premium bands`);
    
    // Clear the container
    elements.trendsPremiumBandsContainer.innerHTML = '';
    
    // Create chips for each premium band
    premiumBands.forEach(band => {
        const chip = document.createElement('div');
        chip.className = 'premium-band-chip';
        chip.setAttribute('data-band', band);
        
        // Add checkmark span
        const checkmark = document.createElement('span');
        checkmark.className = 'checkmark';
        checkmark.textContent = '✓';
        chip.appendChild(checkmark);
        
        // Add band text
        const text = document.createTextNode(band);
        chip.appendChild(text);
        
        // Add click event listener to toggle selection
        chip.addEventListener('click', function() {
            this.classList.toggle('selected');
            
            // Get all selected bands directly from the UI - specifically from trends container
            const selectedChips = document.querySelectorAll('#trends-premium-bands-container .premium-band-chip.selected');
            const selectedBands = Array.from(selectedChips).map(chip => chip.getAttribute('data-band')).filter(Boolean);
            console.log('Market Share Trends: Premium bands selected after click:', selectedBands);
            
            // Update the trends-specific state with the selected bands
            if (!state.marketShareTrends) {
                state.marketShareTrends = {};
            }
            state.marketShareTrends.selectedPremiumBands = [...selectedBands];
            
            // Update the counter display
            updateSelectedBandsCount();
            
            // No need to call applyMarketShareAnalysis() here as this is for the trends chart
        });
        
        elements.trendsPremiumBandsContainer.appendChild(chip);
    });
    
    // Initialize the selected count
    updateSelectedBandsCount();
    
    // Show the market share trends section
    if (elements.marketShareTrendsSection) {
        elements.marketShareTrendsSection.classList.remove('hidden');
    }
    
    console.log('Premium bands populated successfully');
}

// Update the count of selected premium bands for the Market Share Trends section
function updateSelectedBandsCount() {
    if (!elements.trendsPremiumBandsCounter) return;
    
    const selectedChips = document.querySelectorAll('#trends-premium-bands-container .premium-band-chip.selected');
    const selectedCount = selectedChips.length;
    elements.trendsPremiumBandsCounter.textContent = `${selectedCount} selected`;
    
    // Update the trends-specific state with the selected bands
    const selectedBands = Array.from(selectedChips).map(chip => chip.getAttribute('data-band')).filter(Boolean);
    if (!state.marketShareTrends) {
        state.marketShareTrends = {};
    }
    state.marketShareTrends.selectedPremiumBands = selectedBands;
    
    // Log the count for debugging
    console.log(`DIAGNOSTIC - Updated trends premium bands counter: ${selectedCount} selected`);
    console.log('DIAGNOSTIC - Updated trends premium bands state:', state.marketShareTrends.selectedPremiumBands);
}

// This is a duplicate function that has been removed. The actual resetMarketShareTrends function is defined earlier in the code.

// Update the market share trends chart based on selected premium bands
function updateMarketShareTrendsChart() {
    console.log('Updating market share trends chart...');
    
    // Make sure we have the element references
    if (!elements.marketShareTrendsChart) {
        elements.marketShareTrendsChart = document.getElementById('market-share-trends-chart');
        console.log('Re-fetched market share trends chart element:', elements.marketShareTrendsChart ? 'found' : 'not found');
    }
    
    // Validate state.esisData exists
    if (!state.esisData || !Array.isArray(state.esisData) || state.esisData.length === 0) {
        console.warn('No ESIS data available for market share trends chart');
        if (elements.marketShareTrendsChart) {
            elements.marketShareTrendsChart.innerHTML = 
                '<div class="no-data-message">No data available. Please upload and analyze data files first.</div>';
        }
        return;
    }
    
    // Show loading state
    elements.marketShareTrendsChart.innerHTML = '<div class="loading-message">Loading chart data...</div>';
    
    // Process in next tick to allow UI to update
    setTimeout(() => {
        // Get selected premium bands specifically from the trends container
        const selectedBands = [];
        const chips = document.querySelectorAll('#trends-premium-bands-container .premium-band-chip.selected');
        chips.forEach(chip => {
            const band = chip.getAttribute('data-band');
            if (band) selectedBands.push(band);
        });
        
        // If no bands are selected, select all bands by default
        if (selectedBands.length === 0) {
            console.log('No premium bands selected for trends chart, defaulting to all bands');
            document.querySelectorAll('#trends-premium-bands-container .premium-band-chip').forEach(chip => {
                chip.classList.add('selected');
                const band = chip.getAttribute('data-band');
                if (band) selectedBands.push(band);
            });
            updateSelectedBandsCount();
        }
        
        // Save the selected bands in the trends-specific state
        if (!state.marketShareTrends) {
            state.marketShareTrends = {};
        }
        state.marketShareTrends.selectedPremiumBands = [...selectedBands];
        
        console.log('Market Share Trends using bands:', state.marketShareTrends.selectedPremiumBands);
        
        console.log('Using date range filter:', state.filters.dateRange);
        
        // Get data filtered by the main date range filter, LTV filter, and premium bands (but NOT by lender filter)
        const filteredByDate = state.esisData.filter(record => {
            // Skip records with invalid dates
            if (!record.Month) return false;
            
            // Apply date range filter
            const inDateRange = !state.filters.dateRange || 
                (record.Month >= state.filters.dateRange[0] && 
                 record.Month <= state.filters.dateRange[1]);
            
            // Apply premium band filter
            const inSelectedBands = selectedBands.length === 0 || selectedBands.includes(record.PremiumBand);
            
            // Apply LTV filter
            let ltvFilterPassed = true;
            if (state.filters.ltvRange && state.filters.ltvRange !== 'all') {
                const ltv = parseFloat(record.LTV);
                if (!isNaN(ltv)) {
                    if (state.filters.ltvRange === 'below-80' && ltv >= 80) {
                        ltvFilterPassed = false;
                    } else if (state.filters.ltvRange === 'above-80' && ltv < 80) {
                        ltvFilterPassed = false;
                    }
                }
            }
            
            return inDateRange && inSelectedBands && ltvFilterPassed;
        });
        
        if (filteredByDate.length === 0) {
            if (elements.marketShareTrendsChart) {
                elements.marketShareTrendsChart.innerHTML = 
                    `<div class="no-data-message error-message">
                        <h3>Error</h3>
                        <p>No data matches the selected filters. Please adjust your date range or premium band selection.</p>
                        <button class="btn btn-primary mt-2" onclick="updateMarketShareTrendsChart()">
                            Try Again
                        </button>
                    </div>`;
            }
            return;
        }
        
        // Continue processing with filtered data
        processMarketShareTrendsData(filteredByDate, selectedBands);
    }, 10);
}

// Process data for the market share trends chart
function processMarketShareTrendsData(filteredData, selectedBands) {
    console.log(`Processing ${filteredData.length} records for trends chart with ${selectedBands.length} selected bands`);
    
    // Filter by selected premium bands
    const filteredByBands = filteredData.filter(record => {
        return selectedBands.includes(record.PremiumBand);
    });
    
    if (filteredByBands.length === 0) {
        if (elements.marketShareTrendsChart) {
            elements.marketShareTrendsChart.innerHTML = 
                `<div class="no-data-message error-message">
                    <h3>Error</h3>
                    <p>No data matches the selected premium bands. Please select different bands.</p>
                    <button class="retry-btn" onclick="updateMarketShareTrendsChart()">Retry</button>
                </div>`;
        }
        return;
    }
    
    console.log(`Found ${filteredByBands.length} records matching selected premium bands`);
    
    // Group data by month and lender for the chart
    const monthlyData = groupByMonthAndLender(filteredByBands);
    
    // Find lenders who were in the top 5 by market share at any point
    const topLenders = findTopLenders(monthlyData, 5);
    
    if (topLenders.length === 0) {
        if (elements.marketShareTrendsChart) {
            elements.marketShareTrendsChart.innerHTML = 
                `<div class="no-data-message error-message">
                    <h3>Error</h3>
                    <p>No lenders found with market share in the selected data.</p>
                    <button class="retry-btn" onclick="updateMarketShareTrendsChart()">Retry</button>
                </div>`;
        }
        return;
    }
    
    console.log(`Found ${topLenders.length} top lenders for the trends chart`);
    
    // Render the chart with only the top lenders
    renderTrendsChart(monthlyData, topLenders);
    
    console.log('Market share trends chart updated successfully');
}

// Group data by month and lender for the trends chart
function groupByMonthAndLender(data) {
    // Initialize result structure
    const result = {};
    
    // Format months as 'MMM YY' (e.g., 'Jan 24')
    const formatMonth = date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };
    
    // Track all months for sorting
    const months = [];
    const monthLabels = [];
    
    // Get the date range filter to ensure we only include months within the selected range
    const dateRangeStart = state.filters.dateRange ? new Date(state.filters.dateRange[0]) : null;
    const dateRangeEnd = state.filters.dateRange ? new Date(state.filters.dateRange[1]) : null;
    
    // If we have a date range, set time to beginning/end of month for proper comparison
    if (dateRangeStart) {
        dateRangeStart.setDate(1);
        dateRangeStart.setHours(0, 0, 0, 0);
    }
    
    if (dateRangeEnd) {
        // Set to last day of the month
        dateRangeEnd.setMonth(dateRangeEnd.getMonth() + 1);
        dateRangeEnd.setDate(0);
        dateRangeEnd.setHours(23, 59, 59, 999);
    }
    
    // Group data by month and lender
    data.forEach(record => {
        const date = new Date(record.DocumentDate);
        const monthKey = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0');
        const monthLabel = formatMonth(date);
        const lender = record.Provider;
        
        // Skip if missing essential data
        if (!lender) return;
        
        // Check if this month is within the selected date range
        const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
        if (dateRangeStart && monthDate < dateRangeStart) return;
        if (dateRangeEnd && monthDate > dateRangeEnd) return;
        
        // Add month to tracking array if not already present
        if (!result[monthKey]) {
            result[monthKey] = {
                lenders: {},
                total: 0
            };
            
            months.push({
                key: monthKey,
                label: monthLabel,
                date: monthDate
            });
        }
        
        // Add loan amount to lender's total for this month
        const loan = record.Loan || 0;
        
        if (!result[monthKey].lenders[lender]) {
            result[monthKey].lenders[lender] = 0;
        }
        
        result[monthKey].lenders[lender] += loan;
        result[monthKey].total += loan;
    });
    
    // Sort months chronologically
    months.sort((a, b) => a.date - b.date);
    
    // Calculate market share percentages
    Object.keys(result).forEach(month => {
        const monthData = result[month];
        const totalLoanAmount = monthData.total;
        
        if (totalLoanAmount > 0) {
            Object.keys(monthData.lenders).forEach(lender => {
                const lenderAmount = monthData.lenders[lender];
                monthData.lenders[lender + '_pct'] = (lenderAmount / totalLoanAmount) * 100;
            });
        }
    });
    
    // Log the months being displayed for debugging
    console.log('Displaying months:', months.map(m => m.label).join(', '));
    
    return {
        months: months.map(m => m.key),
        monthLabels: months.map(m => m.label),
        data: result
    };
}

// Find lenders who have market share in any month
function findActiveLenders(monthlyData) {
    // Find all lenders who have market share in any month
    const lenderSet = new Set();
    
    Object.values(monthlyData.data).forEach(month => {
        Object.keys(month.lenders).forEach(lender => {
            // Only include actual lender names, not percentage keys
            if (!lender.endsWith('_pct')) {
                lenderSet.add(lender);
            }
        });
    });
    
    return Array.from(lenderSet).sort();
}

// Find lenders who were in the top 5 by market share at any point during the time range
function findTopLenders(monthlyData, maxLenders = 5) {
    // Track which lenders were in the top N for any month
    const topLendersSet = new Set();
    
    // For each month, find the top lenders
    Object.keys(monthlyData.data).forEach(month => {
        const monthData = monthlyData.data[month];
        const lenderShares = [];
        
        // Get all lenders and their market share percentages for this month
        Object.keys(monthData.lenders).forEach(lender => {
            // Only include actual lender names, not percentage keys
            if (!lender.endsWith('_pct')) {
                lenderShares.push({
                    lender: lender,
                    share: monthData.lenders[lender + '_pct'] || 0
                });
            }
        });
        
        // Sort by market share (descending)
        lenderShares.sort((a, b) => b.share - a.share);
        
        // Add the top N lenders to our set
        lenderShares.slice(0, maxLenders).forEach(item => {
            topLendersSet.add(item.lender);
        });
    });
    
    // Convert set to sorted array
    return Array.from(topLendersSet).sort();
}

// Render the market share trends chart
function renderTrendsChart(monthlyData, lenders) {
    console.log('Rendering trends chart...');
    
    // Make sure we have the chart container
    if (!elements.marketShareTrendsChart) {
        elements.marketShareTrendsChart = document.getElementById('market-share-trends-chart');
    }
        
        if (!elements.marketShareTrendsChart) {
            console.error('Market share trends chart container not found');
            return;
        }
        
        // Validate input data
        if (!monthlyData || !monthlyData.months || !monthlyData.monthLabels || !monthlyData.data) {
            console.error('Invalid monthly data structure:', monthlyData);
            throw new Error('Invalid monthly data structure');
        }
        
        if (!lenders || !Array.isArray(lenders) || lenders.length === 0) {
            console.error('No lenders available to display');
            throw new Error('No lenders available to display');
        }
        
        console.log(`Rendering chart with ${monthlyData.months.length} months and ${lenders.length} top lenders`);
        
        // Create canvas for the chart
        elements.marketShareTrendsChart.innerHTML = '<canvas id="trends-chart"></canvas>';
        const canvas = document.getElementById('trends-chart');
        
        if (!canvas) {
            throw new Error('Failed to create chart canvas element');
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }
        
        // Add a note about showing only top lenders
        const noteDiv = document.createElement('div');
        noteDiv.className = 'chart-note';
        noteDiv.textContent = `Showing lenders who were in the top 5 by market share at any point during the selected time range. Total lenders shown: ${lenders.length}`;
        elements.marketShareTrendsChart.insertBefore(noteDiv, canvas);
        
        // Prepare datasets for each lender
        const datasets = [];
        const colorMap = {};
        
        lenders.forEach((lender, index) => {
            // Generate a color for this lender or use existing one
            if (!colorMap[lender]) {
                colorMap[lender] = getRandomColor();
            }
            const color = colorMap[lender];
            
            // Prepare data points for this lender
            const data = monthlyData.months.map(month => {
                const monthData = monthlyData.data[month];
                if (!monthData || !monthData.lenders) {
                    console.warn(`Missing data for month: ${month}`);
                    return 0;
                }
                return monthData.lenders[lender + '_pct'] || 0;
            });
            
            // Create dataset
            datasets.push({
                label: lender,
                data: data,
                borderColor: color,
                backgroundColor: 'transparent',
                pointBackgroundColor: color,
                pointRadius: 4,
                tension: 0.3 // Makes the line curved
            });
        });
        
        // Prepare lender data for tooltips
        const lenderData = {};
        monthlyData.months.forEach((month) => {
            lenderData[month] = {};
            lenders.forEach(lender => {
                const monthData = monthlyData.data[month];
                if (monthData && monthData.lenders) {
                    // Store the actual loan amount for this lender in this month
                    lenderData[month][lender] = monthData.lenders[lender] || 0;
                }
            });
        });
        
        // Create and render the chart using our template
        const chartConfig = createLineChartConfig(monthlyData.monthLabels, datasets);
        
        // Add the month keys and lender data to the chart config for tooltip access
        chartConfig.data.monthKeys = monthlyData.months;
        chartConfig.data.lenderData = lenderData;
        
        // Attempt to create the chart
        try {
            new Chart(ctx, chartConfig);
            console.log('Chart rendered successfully with', lenders.length, 'top lenders');
        } catch (chartError) {
            // This try-catch block is kept because it's handling a specific Chart.js error with a fallback UI
            // and is not redundant with our general error handling wrapper
            console.error('Error creating Chart.js chart:', chartError);
            
            // Fallback to tabular representation
            const fallbackTable = createFallbackTable(monthlyData, lenders);
            elements.marketShareTrendsChart.innerHTML = '';
            elements.marketShareTrendsChart.appendChild(fallbackTable);
            
            // Show warning about chart rendering failure
            const warningDiv = document.createElement('div');
            warningDiv.className = 'chart-warning';
            warningDiv.textContent = 'Chart rendering failed. Displaying data in tabular format instead.';
            elements.marketShareTrendsChart.insertBefore(warningDiv, fallbackTable);
        }
}

// Create a fallback table for when chart rendering fails
function createFallbackTable(monthlyData, lenders) {
    const table = document.createElement('table');
    table.className = 'fallback-table';
    
    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add Month header
    const monthHeader = document.createElement('th');
    monthHeader.textContent = 'Month';
    headerRow.appendChild(monthHeader);
    
    // Add lender headers
    lenders.forEach(lender => {
        const th = document.createElement('th');
        th.textContent = lender;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Add data rows
    monthlyData.months.forEach((month, index) => {
        const row = document.createElement('tr');
        
        // Add month cell
        const monthCell = document.createElement('td');
        monthCell.textContent = monthlyData.monthLabels[index];
        row.appendChild(monthCell);
        
        // Add lender data cells
        lenders.forEach(lender => {
            const td = document.createElement('td');
            const monthData = monthlyData.data[month];
            const value = monthData && monthData.lenders ? 
                (monthData.lenders[lender + '_pct'] || 0) : 0;
            td.textContent = value.toFixed(1) + '%';
            row.appendChild(td);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    return table;
}

// Export trends data as CSV
function exportTrendsData() {
    // Validate state.esisData exists
    if (!state.esisData || !Array.isArray(state.esisData) || state.esisData.length === 0) {
        showError('No data available. Please upload and analyze data files first.');
        return;
    }
    
    // Get selected premium bands
    const selectedBands = [];
    const chips = document.querySelectorAll('.premium-band-chip.selected');
    chips.forEach(chip => {
        const band = chip.getAttribute('data-band');
        if (band) selectedBands.push(band);
    });
    
    // If no bands are selected, select all bands by default
    if (selectedBands.length === 0) {
        console.log('No premium bands selected, defaulting to all bands');
        document.querySelectorAll('.premium-band-chip').forEach(chip => {
            chip.classList.add('selected');
            const band = chip.getAttribute('data-band');
            if (band) selectedBands.push(band);
        });
        updateSelectedBandsCount();
    }
    
    // Validate date filters
    // Note: state.filters.dateRange stores dates in 'YYYY-MM' format strings, not Date objects
    if (!state.filters.dateRange || !state.filters.dateRange[0] || !state.filters.dateRange[1]) {
        showError('Invalid date range. Please set a valid date range in the filters.');
        return;
    }
    
    // Show loading indicator
    const originalContent = elements.marketShareTrendsChart.innerHTML;
    elements.marketShareTrendsChart.innerHTML = 
        '<div class="no-data-message"><div class="spinner"></div>Preparing export data...</div>';
    
    setTimeout(() => {
        // Get data filtered by the main date range filter
        const filteredByDate = state.esisData.filter(record => {
            // Skip records with invalid dates
            if (!record.Month) return false;
            
            // Filter by month string (YYYY-MM format)
            return record.Month >= state.filters.dateRange[0] && record.Month <= state.filters.dateRange[1];
        });
        
        if (filteredByDate.length === 0) {
            // Restore original chart content
            elements.marketShareTrendsChart.innerHTML = originalContent;
            showError('No data available for the selected date range.');
            return;
        }
        
        // Filter to include only selected premium bands
        const filteredData = filteredByDate.filter(record => 
            selectedBands.includes(record.PremiumBand)
        );
        
        if (filteredData.length === 0) {
            // Restore original chart content
            elements.marketShareTrendsChart.innerHTML = originalContent;
            showError('No data available for the selected premium bands in this date range.');
            return;
        }
        
        // Group data by month and lender
        const monthlyData = groupByMonthAndLender(filteredData);
        
        // Find active lenders
        const lenders = findActiveLenders(monthlyData);
        
        if (lenders.length === 0) {
            // Restore original chart content
            elements.marketShareTrendsChart.innerHTML = originalContent;
            showError('No lenders found with market share in the selected data.');
            return;
        }
        
        // Create CSV content
        let csvContent = 'Month,';
        
        // Add header row with lender names
        lenders.forEach(lender => {
            csvContent += `${lender} (%),`;
        });
        
        csvContent = csvContent.slice(0, -1) + '\n';
        
        // Add data rows
        monthlyData.months.forEach((month, index) => {
            csvContent += monthlyData.monthLabels[index] + ',';
            
            lenders.forEach(lender => {
                const pctValue = monthlyData.data[month].lenders[lender + '_pct'] || 0;
                csvContent += `${pctValue.toFixed(1)},`;
            });
            
            csvContent = csvContent.slice(0, -1) + '\n';
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'market_share_trends.csv');
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Restore original chart content
        elements.marketShareTrendsChart.innerHTML = originalContent;
        
        // Show success message
        showSuccessMessage('Data exported successfully!');
        
        console.log('Market share trends data exported successfully');
    }, 10);
}

// Export Functions
function exportData() {
    if (!state.table) return;
    
    state.table.download("csv", "mortgage_analysis_data.csv");
}

// UI Helper Functions
function showLoading(show) {
    if (show) {
        elements.loadingIndicator.classList.remove('hidden');
        elements.analyzeBtn.disabled = true;
    } else {
        elements.loadingIndicator.classList.add('hidden');
        elements.analyzeBtn.disabled = false;
    }
}

/**
 * Displays an error message to the user and logs it to console
 * @param {string} message - The error message to display
 * @param {Error} [error] - Optional original error object for logging
 */
function showError(message, error) {
  if (error) {
    console.error('Error details:', error);
  }

  // Make sure we have the error container elements
  if (!elements.errorContainer || !elements.errorText) {
    console.warn('Error container elements not found, creating them');
    
    // Create error container if it doesn't exist
    const container = document.createElement('div');
    container.id = 'error-container';
    container.className = 'error-container hidden';
    
    const content = document.createElement('div');
    content.className = 'error-content';
    
    const text = document.createElement('p');
    text.id = 'error-text';
    
    const dismissBtn = document.createElement('button');
    dismissBtn.id = 'dismiss-error';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', dismissError);
    
    content.appendChild(text);
    content.appendChild(dismissBtn);
    container.appendChild(content);
    
    document.body.appendChild(container);
    
    // Update element references
    elements.errorContainer = container;
    elements.errorText = text;
    elements.dismissError = dismissBtn;
  }

  // Set the error message
  elements.errorText.textContent = message;
  elements.errorContainer.classList.remove('hidden');
  
  // Hide loading indicator if it's visible
  showLoading(false);
  
  // Auto-dismiss after 8 seconds
  setTimeout(dismissError, 8000);
}

function dismissError() {
    elements.errorContainer.classList.add('hidden');
}

// Show success message with auto-dismiss after 3 seconds
function showSuccessMessage(message) {
    // Create success message container if it doesn't exist
    let successContainer = document.getElementById('success-container');
    if (!successContainer) {
        successContainer = document.createElement('div');
        successContainer.id = 'success-container';
        successContainer.className = 'success-message hidden';
        
        const successContent = document.createElement('div');
        successContent.className = 'success-content';
        
        const successIcon = document.createElement('span');
        successIcon.className = 'success-icon';
        successIcon.innerHTML = '✓';
        
        const successText = document.createElement('p');
        successText.id = 'success-text';
        
        const dismissBtn = document.createElement('button');
        dismissBtn.id = 'dismiss-success';
        dismissBtn.textContent = 'Dismiss';
        dismissBtn.addEventListener('click', dismissSuccessMessage);
        
        successContent.appendChild(successIcon);
        successContent.appendChild(successText);
        successContent.appendChild(dismissBtn);
        successContainer.appendChild(successContent);
        
        document.body.appendChild(successContainer);
    }
    
    // Set message and show
    document.getElementById('success-text').textContent = message;
    successContainer.classList.remove('hidden');
    
    // Auto-dismiss after 3 seconds
    setTimeout(dismissSuccessMessage, 3000);
}

function dismissSuccessMessage() {
    const successContainer = document.getElementById('success-container');
    if (successContainer) {
        successContainer.classList.add('hidden');
    }
}

function formatMonth(monthStr) {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function validatePremiumRange() {
    const min = parseInt(elements.premiumMin.value);
    const max = parseInt(elements.premiumMax.value);
    
    if (min > max) {
        elements.premiumMax.value = min;
    }
}

/**
 * Centralizes all filter-related event handling
 * Sets up event listeners for all filter controls with proper null checks
 * Prevents duplicate listeners by removing any existing ones first
 */
function setupFilterListeners() {
    // Define all filter controls and their event handlers
    const filterControls = [
        // Standard filters that trigger applyFilters
        { element: 'productTermFilter', event: 'change', handler: applyFilters },
        { element: 'ltvFilter', event: 'change', handler: applyFilters },
        { element: 'lenderFilter', event: 'change', handler: applyFilters },
        { element: 'productType', event: 'change', handler: applyFilters },
        { element: 'purchaseType', event: 'change', handler: applyFilters },
        { element: 'dateStart', event: 'change', handler: applyFilters },
        { element: 'dateEnd', event: 'change', handler: applyFilters },
        
        // Special filter controls with custom handlers
        { element: 'premiumMin', event: 'change', handler: validatePremiumRange },
        { element: 'premiumMax', event: 'change', handler: validatePremiumRange }
    ];
    
    // Set up each filter control's event listener
    filterControls.forEach(({ element, event, handler }) => {
        if (elements[element]) {
            // Remove any existing listeners to prevent duplicates
            // Note: We create a clone to effectively remove all listeners
            const originalElement = elements[element];
            const newElement = originalElement.cloneNode(true);
            originalElement.parentNode.replaceChild(newElement, originalElement);
            
            // Update the reference in the elements object
            elements[element] = newElement;
            
            // Add the new listener
            elements[element].addEventListener(event, handler);
            
            // Log for debugging
            console.log(`Added ${event} listener to filter control: ${element}`);
        } else {
            console.warn(`Filter control not found: ${element}`);
        }
    });
}
