// Mortgage Market Analysis Tool - Main JavaScript

// Global state
const state = {
    esisData: null,
    swapRatesData: null,
    processedData: null,
    table: null,
    marketShareTable: null,
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
    totalMarketByPremiumBand: {}, // For % of market calculation
    overallTotalMarket: 0,      // For overall % of market calculation
    lenderMarketShareData: null  // For lender market share analysis
};

// DOM Elements
const elements = {
    esisFileInput: document.getElementById('esis-file'),
    swapFileInput: document.getElementById('swap-file'),
    esisFileInfo: document.getElementById('esis-file-info'),
    swapFileInfo: document.getElementById('swap-file-info'),
    analyzeBtn: document.getElementById('analyze-btn'),
    loadingIndicator: document.getElementById('loading-indicator'),
    filtersSection: document.getElementById('filters-section'),
    resultsSection: document.getElementById('results-section'),
    resultsTable: document.getElementById('results-table'),
    exportBtn: document.getElementById('export-btn'),
    applyFiltersBtn: document.getElementById('apply-filters'),
    resetFiltersBtn: document.getElementById('reset-filters'),
    dateStart: document.getElementById('date-start'),
    dateEnd: document.getElementById('date-end'),
    lenderFilter: document.getElementById('lender-filter'),
    premiumMin: document.getElementById('premium-min'),
    premiumMax: document.getElementById('premium-max'),
    productType: document.getElementById('product-type'),
    purchaseType: document.getElementById('purchase-type'),
    ltvFilter: document.getElementById('ltv-filter'),
    // Market share analysis elements
    marketShareSection: document.getElementById('market-share-section'),
    premiumBandSelect: document.getElementById('premium-band-select'),
    applyMarketShareBtn: document.getElementById('apply-market-share'),
    marketShareTable: document.getElementById('market-share-table'),
    exportMarketShareBtn: document.getElementById('export-market-share-btn'),
    // Error elements
    errorContainer: document.getElementById('error-container'),
    errorText: document.getElementById('error-text'),
    dismissError: document.getElementById('dismiss-error')
};

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    // Set up event listeners
    elements.esisFileInput.addEventListener('change', handleESISFileSelect);
    elements.swapFileInput.addEventListener('change', handleSwapFileSelect);
    elements.analyzeBtn.addEventListener('click', processData);
    elements.exportBtn.addEventListener('click', exportData);
    elements.applyFiltersBtn.addEventListener('click', applyFilters);
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    elements.dismissError.addEventListener('click', dismissError);
    
    // Market share analysis event listeners
    elements.applyMarketShareBtn.addEventListener('click', applyMarketShareAnalysis);
    elements.exportMarketShareBtn.addEventListener('click', exportMarketShareData);
    
    // Initialize filter controls
    elements.premiumMin.addEventListener('change', validatePremiumRange);
    elements.premiumMax.addEventListener('change', validatePremiumRange);
    
    console.log('Mortgage Market Analysis Tool initialized');
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
    try {
        showLoading(true);
        
        // Check if files are selected
        const esisFile = elements.esisFileInput.files[0];
        const swapFile = elements.swapFileInput.files[0];
        
        if (!esisFile || !swapFile) {
            throw new Error('Please select both ESIS data and Swap Rates files');
        }
        
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

        // Update UI with results
        updateFilters();
        renderTable();

        // --- Ensure premium bands are always populated after data load ---
        if (state.processedData && state.processedData.premiumBands) {
            populatePremiumBandSelect(state.processedData.premiumBands);
            elements.marketShareSection.classList.remove('hidden');
        } else {
            elements.marketShareSection.classList.add('hidden');
        }
        resetMarketShareTable();
        // Show filters and results sections
        elements.filtersSection.classList.remove('hidden');
        elements.resultsSection.classList.remove('hidden');
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        showError(error.message);
        console.error('Error processing data:', error);
    }
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

    // Process each record and filter out those with no matching swap rate
    const enrichedData = esisDataArray
        .map(esisRecord => {
            // Find matching swap rate - may return null if no suitable match within tolerance
            const matchingSwapRate = findMatchingSwapRate(esisRecord);
            
            // If no matching swap rate found, return null to filter out this record
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
        .filter(record => record !== null); // Remove records with no matching swap rate

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
    try {
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
            try {
                mappedRecord.Month = extractMonth(mappedRecord.DocumentDate);
            } catch (e) {
                console.error(`Error extracting month for record ${index}:`, e, mappedRecord.DocumentDate);
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
    } catch (error) {
        console.error('Error mapping field names:', error);
        showError(`Error mapping field names: ${error.message}`);
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
            console.log(`Using swap rate from ${closestRate.effective_at.toISOString().split('T')[0]} for ${esisRecord.Provider} document dated ${documentDate.toISOString().split('T')[0]} (${diffDays} days difference)`);
        } else {
            // Track missing date ranges
            const yearMonth = documentDate.toISOString().substring(0, 7); // YYYY-MM format
            if (!state.swapRateTracking.missingDateRanges[yearMonth]) {
                state.swapRateTracking.missingDateRanges[yearMonth] = 0;
            }
            state.swapRateTracking.missingDateRanges[yearMonth]++;
            
            // Log the exclusion
            console.log(`No suitable swap rate found for ${esisRecord.Provider} on ${documentDate.toISOString().split('T')[0]}, excluding from analysis`);
            state.swapRateTracking.excludedRecords++;
            state.swapRateTracking.excludedLoanAmount += (esisRecord.Loan || 0);
            return null;
        }
    }
    
    // Log a few examples of date comparisons for verification
    if (Math.random() < 0.001) { // Log approximately 0.1% of comparisons
        console.log('Date comparison example:', {
            Provider: esisRecord.Provider,
            DaysDifference: matchingRate ? 
                Math.round((documentDate.getTime() - matchingRate.effective_at.getTime()) / (1000 * 60 * 60 * 24)) : 
                'N/A'
        });
    }
    
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
        console.log(`Applying Nationwide rate correction: ${esisRate} -> ${esisRate / 10}`);
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
    }
    
    return premiumBps;
}

function assignPremiumBand(premiumBps) {
    if (premiumBps === null) return 'Unknown';
    
    // Add validation for extreme negative values
    // Limit to a reasonable range (-60 to +560 bps)
    if (premiumBps < -60) {
        console.warn(`Unusually low premium detected: ${premiumBps}bps. Capping at -60bps.`);
        premiumBps = -60;
    } else if (premiumBps > 560) {
        console.warn(`Unusually high premium detected: ${premiumBps}bps. Capping at 560bps.`);
        premiumBps = 560;
    }
    
    // Floor to nearest 20bps band
    const lowerBound = Math.floor(premiumBps / 20) * 20;
    return `${lowerBound}-${lowerBound + 20}`;
}

function extractMonth(date) {
    return date.toISOString().substring(0, 7); // Format: YYYY-MM
}

function aggregateByPremiumBandAndMonth(records) {
    try {
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
            try {
                // Sort premium bands numerically
                const aLower = parseInt(a.split('-')[0]);
                const bLower = parseInt(b.split('-')[0]);
                return aLower - bLower;
            } catch (error) {
                console.error('Error sorting premium bands:', error, a, b);
                return 0;
            }
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
    } catch (error) {
        console.error('Error aggregating data:', error);
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
}

// Table Rendering Functions
function renderTable() {
    // Show/hide market share section in sync with results
    if (state.processedData && state.processedData.premiumBands && state.processedData.premiumBands.length > 0) {
        elements.marketShareSection.classList.remove('hidden');
    } else {
        elements.marketShareSection.classList.add('hidden');
    }

    try {
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
                    return `£${valueInMillions}m`;
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
                return `£${valueInMillions}m`;
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
                return `£${valueInMillions}m`;
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
    } catch (error) {
        console.error('Error rendering table:', error);
        showError(`Error rendering table: ${error.message}`);
    }
}

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
    try {
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
        
        // Clear the existing dropdown options
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
        
        console.log(`Added ${elements.lenderFilter.options.length} lender options to dropdown`);
        console.log('First few lender options:', Array.from(elements.lenderFilter.options).slice(0, 5).map(opt => opt.value));
        
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
        
        console.log('Filter options updated successfully:', {
            lenders: lenders.length,
            productTypes: productTypes.length,
            purchaseTypes: purchaseTypes.length
        });
    } catch (error) {
        console.error('Error updating filters:', error);
        showError(`Error updating filters: ${error.message}`);
    }
}

function applyFilters() {
    try {
        showLoading(true);
        
        // Get filter values
        const dateStart = elements.dateStart.value;
        const dateEnd = elements.dateEnd.value;
        // Premium range filter removed from UI but maintained in state
        const premiumMin = 0;
        const premiumMax = 500;
        // Get LTV filter value
        const ltvRange = elements.ltvFilter.value;
        
        console.log('Total lender options:', elements.lenderFilter.options.length);
        console.log('Selected lender options:', elements.lenderFilter.selectedOptions.length);
        
        const selectedLenders = Array.from(elements.lenderFilter.selectedOptions).map(option => option.value);
        const selectedProductTypes = Array.from(elements.productType.selectedOptions).map(option => option.value);
        const selectedPurchaseTypes = Array.from(elements.purchaseType.selectedOptions).map(option => option.value);
        
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
        
        // Log lender filter state for debugging
        console.log('Lender filter state after processing:', {
            originalSelection: selectedLenders,
            filteredSelection: state.filters.lenders,
            lenderCount: elements.lenderFilter.options.length,
            selectedCount: elements.lenderFilter.selectedOptions.length
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

        // Apply filters to the data
        state.filteredData = filterData(state.esisData);
        
        // Log filtering results
        console.log(`Filtering complete: ${state.filteredData.length} records match the criteria out of ${state.esisData.length} total records`);
        
        // DEBUG: Calculate total loan amount after filtering
        const postFilterTotal = state.filteredData.reduce((sum, record) => sum + (record.Loan || 0), 0);
        console.log('DEBUG - Total loan amount after filtering:', postFilterTotal.toLocaleString());
        
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
        } else {
            elements.marketShareSection.classList.add('hidden');
        }
        resetMarketShareTable();
        // Update charts
        // updateCharts();
        
        console.log('Filters applied successfully. Filtered data count:', state.filteredData.length);
        showLoading(false);
    } catch (error) {
        console.error('Error applying filters:', error);
        showError(`Error applying filters: ${error.message}`);
        showLoading(false);
    }
}

function filterData(data) {
    if (!data || !Array.isArray(data)) {
        console.error('Invalid data provided to filterData:', data);
        return [];
    }
    
    return data.filter(record => {
        try {
            // Skip invalid records
            if (!record || typeof record !== 'object') {
                return false;
            }
            
            // Filter by date range
            if (state.filters.dateRange[0] && state.filters.dateRange[1]) {
                if (!record.DocumentDate || !record.Month) { 
                    return false;
                }
                const recordMonth = record.Month; 
                if (recordMonth < state.filters.dateRange[0] || recordMonth > state.filters.dateRange[1]) {
                    return false;
                }
            }
            
            // Filter by lender
            if (state.filters.lenders && state.filters.lenders.length > 0) {
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
            if (record.PremiumBand === 'N/A') {
                if (state.filters.premiumRange[0] > -50 || state.filters.premiumRange[1] < 250) { 
                     return false;
                }
            } else if (record.PremiumOverSwap === null || record.PremiumOverSwap === undefined) {
                // Potentially skip or handle records where PremiumOverSwap is not defined but PremiumBand might be if derived differently
                // If we have a valid PremiumBand, let's keep the record
                if (record.PremiumBand) {
                    // Extract the lower bound of the premium band
                    const bandLowerBound = parseInt(record.PremiumBand.split('-')[0]);
                    if (!isNaN(bandLowerBound)) {
                        // Check if it falls within the filter range
                        if (bandLowerBound < state.filters.premiumRange[0] || bandLowerBound > state.filters.premiumRange[1]) {
                            return false;
                        }
                        // Otherwise keep it
                        return true;
                    }
                }
            } else if (record.PremiumOverSwap < state.filters.premiumRange[0] || record.PremiumOverSwap > state.filters.premiumRange[1]) {
                // DIAGNOSTIC: Check if we're filtering out 500-520 band records
                if (record.PremiumBand === '500-520') {
                    console.log(`DIAGNOSTIC - Filtering out 500-520 record with PremiumOverSwap=${record.PremiumOverSwap}, filter range: [${state.filters.premiumRange[0]}-${state.filters.premiumRange[1]}]`);
                }
                return false;
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
            
            // Filter by LTV range
            if (state.filters.ltvRange !== 'all') {
                // Use our standardized LTV field from mapping
                let ltv = record.StandardizedLTV;
                
                // If LTV is available, filter by it
                if (ltv !== undefined && ltv !== null && !isNaN(ltv)) {
                    if (state.filters.ltvRange === 'below-80' && ltv >= 80) {
                        // DEBUG: Log some filtered records for verification
                        if (Math.random() < 0.01) { // Log ~1% of filtered records to avoid console spam
                            console.log(`LTV Filter: Excluding record with LTV=${ltv}% (≥80%) from below-80 filter`, 
                                      { provider: record.Provider, loan: record.Loan, ltv: ltv });
                        }
                        return false;
                    } else if (state.filters.ltvRange === 'above-80' && ltv < 80) {
                        // DEBUG: Log some filtered records for verification
                        if (Math.random() < 0.01) { // Log ~1% of filtered records to avoid console spam
                            console.log(`LTV Filter: Excluding record with LTV=${ltv}% (<80%) from above-80 filter`, 
                                      { provider: record.Provider, loan: record.Loan, ltv: ltv });
                        }
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
                    
                    // Log every 100th missing record to avoid console spam
                    if (state.ltvFilterStats.missingLtvCount % 100 === 0) {
                        console.log(`LTV Filter: ${state.ltvFilterStats.missingLtvCount} records missing LTV data out of ${state.ltvFilterStats.totalProcessed} processed`);
                    }
                }
            }
            
            // Debug statement removed to improve performance
            return true;
        } catch (error) {
            console.error('Error filtering record:', error, record);
            return false;
        }
    });
}

function resetFilters() {
    try {
        showLoading(true);
        
        // Reset filter controls
        if (state.processedData && state.processedData.months && state.processedData.months.length > 0) {
            elements.dateStart.value = state.processedData.months[0];
            elements.dateEnd.value = state.processedData.months[state.processedData.months.length - 1];
        }
        
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
        
        console.log('Filters reset successfully');
        showLoading(false);
    } catch (error) {
        console.error('Error resetting filters:', error);
        showError(`Error resetting filters: ${error.message}`);
        showLoading(false);
    }
}

// --- MARKET SHARE: Populate premium band multi-select ---
function populatePremiumBandSelect(bands) {
    elements.premiumBandSelect.innerHTML = '';
    bands.forEach(band => {
        const option = document.createElement('option');
        option.value = band;
        option.textContent = band;
        elements.premiumBandSelect.appendChild(option);
    });
}

// --- MARKET SHARE: Reset market share table and filters ---
function resetMarketShareTable() {
    state.marketShareFilters.selectedPremiumBands = [];
    if (state.marketShareTable) {
        state.marketShareTable.destroy();
        state.marketShareTable = null;
    }
    elements.premiumBandSelect.selectedIndex = -1;
    elements.marketShareTable.innerHTML = '';
}

// --- MARKET SHARE: Aggregate data by lender and premium band ---
function aggregateLenderMarketShare(selectedBands) {
    // Create a custom filter function that ignores the lender filter
    // but respects date range, product type, and purchase type filters
    function customFilterForMarketShare(data) {
        if (!data || !Array.isArray(data)) {
            console.error('Invalid data provided to customFilterForMarketShare:', data);
            return [];
        }
        
        return data.filter(record => {
            try {
                // Skip invalid records
                if (!record || typeof record !== 'object') {
                    return false;
                }
                
                // Filter by date range
                if (state.filters.dateRange[0] && state.filters.dateRange[1]) {
                    if (!record.DocumentDate || !record.Month) { 
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
                
                // Ignore lender filter - include all lenders
                
                return true;
            } catch (error) {
                console.error('Error in customFilterForMarketShare:', error, record);
                return false;
            }
        });
    }
    
    // Temporarily adjust premium range to include 500-520 band if it's selected
    const originalPremiumRange = [...state.filters.premiumRange];
    
    // If 500-520 band is selected, ensure the premium range includes it
    if (selectedBands.includes('500-520') && state.filters.premiumRange[1] < 520) {
        console.log(`DIAGNOSTIC - Adjusting premium range from [${state.filters.premiumRange[0]}-${state.filters.premiumRange[1]}] to [${state.filters.premiumRange[0]}-520] to include 500-520 band`);
        state.filters.premiumRange[1] = 520;
    }
    
    // Filter data using our custom filter that ignores lender filter
    const filtered = customFilterForMarketShare(state.esisData);
    console.log(`Market Share Analysis: Using ${filtered.length} records (ignoring lender filter)`);
    
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
    // Get selected bands
    const selectedBands = Array.from(elements.premiumBandSelect.selectedOptions).map(opt => opt.value);
    
    // DIAGNOSTIC: Check if 500-520 band is selected
    console.log('DIAGNOSTIC - Selected premium bands for market share analysis:', selectedBands);
    console.log('DIAGNOSTIC - 500-520 band is selected:', selectedBands.includes('500-520'));
    
    // Filter data by current filters (date, product, etc)
    const data = filterData(state.esisData);
    
    // DIAGNOSTIC: Check for records in the 500-520 band
    const highPremiumRecords = data.filter(item => item.PremiumBand === '500-520');
    console.log(`DIAGNOSTIC - Records in 500-520 band after filtering: ${highPremiumRecords.length}`);
    
    if (highPremiumRecords.length > 0) {
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
    
    state.marketShareFilters.selectedPremiumBands = selectedBands;
    // Aggregate and render
    const dataForRender = aggregateLenderMarketShare(selectedBands);
    state.lenderMarketShareData = dataForRender;
    
    // DIAGNOSTIC: Check if 500-520 band data is in the aggregated data
    if (dataForRender.bandTotals && dataForRender.bandTotals['500-520']) {
        console.log(`DIAGNOSTIC - 500-520 band total in aggregated data: £${dataForRender.bandTotals['500-520'].toLocaleString()}`);
    } else {
        console.log('DIAGNOSTIC - 500-520 band is missing from aggregated data bandTotals');
    }
    
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
    selectedBands.forEach(band => {
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
                        return `<div style="display:flex;align-items:center;">
                            <div style="background:#b3d1ff;height:16px;width:${barWidth}px;max-width:60px;margin-right:4px;"></div>
                            <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(2) : '0.00'}%)">
                                £${amtInMillions}m<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(2) : '0.00'}%</span>
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
                        return `<div style="display:flex;align-items:center;">
                            <div style="background:#d1e6ff;height:16px;width:${barWidth}px;max-width:60px;margin-right:4px;"></div>
                            <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(2) : '0.00'}%)">
                                £${amtInMillions}m<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(2) : '0.00'}%</span>
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
                        return `<div style="display:flex;align-items:center;">
                            <div style="background:#80b3ff;height:16px;width:${barWidth}px;max-width:60px;margin-right:4px;"></div>
                            <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(2) : '0.00'}%)">
                                £${amtInMillions}m<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(2) : '0.00'}%</span>
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
                    return `<div style="display:flex;align-items:center;">
                        <div style="background:#b3ffc6;height:16px;width:${Math.min(100, pct || 0)}px;max-width:60px;margin-right:4px;"></div>
                        <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(2) : '0.00'}%)">
                            £${amtInMillions}m<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(2) : '0.00'}%</span>
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
                    return `<div style="display:flex;align-items:center;">
                        <div style="background:#d1ffdb;height:16px;width:${Math.min(100, pct || 0)}px;max-width:60px;margin-right:4px;"></div>
                        <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(2) : '0.00'}%)">
                            £${amtInMillions}m<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(2) : '0.00'}%</span>
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
                    return `<div style="display:flex;align-items:center;">
                        <div style="background:#80e699;height:16px;width:${Math.min(100, pct || 0)}px;max-width:60px;margin-right:4px;"></div>
                        <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(2) : '0.00'}%)">
                            £${amtInMillions}m<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(2) : '0.00'}%</span>
                        </span>
                    </div>`;
                },
                headerSort: true,
                tooltip: true
            }
        ]
    });
    // Prepare data rows
    const rows = data.lenders.map(lender => {
        const row = { Lender: lender };
        selectedBands.forEach(band => {
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
        row.Total_above80 = data.lenderData[lender].Total_above80;
        row.Total_above80_pct = data.lenderData[lender].Total_above80_pct;
        return row;
    });
    // Add summary row
    rows.push(data.summary);
    // Render
    state.marketShareTable = new Tabulator(elements.marketShareTable, {
        data: rows,
        columns: columns,
        layout: 'fitColumns',
        height: '450px',
        movableColumns: true,
        initialSort: [{ column: selectedBands[0], dir: 'desc' }],
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

function showError(message) {
    elements.errorText.textContent = message;
    elements.errorContainer.classList.remove('hidden');
}

function dismissError() {
    elements.errorContainer.classList.add('hidden');
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
