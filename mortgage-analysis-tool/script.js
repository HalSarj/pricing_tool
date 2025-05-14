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
        purchaseTypes: []
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
        
        // Enrich state.esisData with PremiumBand and Month
        state.esisData = enrichEsisData(state.esisData);
        
        // Aggregate the enriched data for charts/processed views
        state.processedData = aggregateByPremiumBandAndMonth(state.esisData);

        // Store total market figures from the initial full dataset processing
        if (state.processedData && state.processedData.totals) {
            state.totalMarketByPremiumBand = { ...state.processedData.totals.byPremiumBand }; // Shallow copy
            state.overallTotalMarket = state.processedData.totals.overall;
            console.log('Initial Total Market by Premium Band:', JSON.stringify(state.totalMarketByPremiumBand));
            console.log('Initial Overall Total Market:', state.overallTotalMarket);
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

    return esisDataArray.map(esisRecord => {
        const matchingSwapRate = findMatchingSwapRate(esisRecord); // Relies on state.swapRatesData
        const premiumBps = calculatePremiumOverSwap(esisRecord, matchingSwapRate);
        const premiumBand = assignPremiumBand(premiumBps);
        const month = extractMonth(esisRecord.DocumentDate);
        
        return {
            ...esisRecord,
            SwapRate: matchingSwapRate ? matchingSwapRate.rate : null,
            PremiumOverSwap: premiumBps,
            PremiumBand: premiumBand,
            Month: month
        };
    });
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
            mappedRecord.Loan = parseFloat(record.Loan);
            if (isNaN(mappedRecord.Loan)){
                mappedRecord.Loan = 0; 
            }

            return mappedRecord;
        });
        
        // if (state.esisData.length > 0) { // Optional: for deep debugging
        //     console.log('Field mapping complete. Sample record (after map):', state.esisData[0]);
        // }
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
        return 'RTB Remortgage';
    }
    
    // Default if we can't determine
    return 'Unknown';
}

// Premium Calculation Functions
function findMatchingSwapRate(esisRecord) {
    // Get the document date
    const documentDate = esisRecord.DocumentDate;
    
    // Get the tie-in period (product term) - default to 60 months (5 years) if not available
    const tieInPeriod = esisRecord.TieInPeriod || 60;
    
    // First try to find rates that match the product term
    let matchingRates = [...state.swapRatesData]
        .filter(swap => swap.product_term_in_months === tieInPeriod);
    
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
            .filter(swap => swap.product_term_in_months === closestTerm);
        
        console.log(`No exact match for term ${tieInPeriod}, using closest term ${closestTerm} for ${esisRecord.Provider}`);
    }
    
    // Sort by effective date
    matchingRates.sort((a, b) => a.effective_at - b.effective_at);
    
    // Find the closest preceding swap rate
    let matchingRate = null;
    for (const swap of matchingRates) {
        if (swap.effective_at <= documentDate) {
            matchingRate = swap;
        } else {
            break;
        }
    }
    
    // If no preceding rate found, use the earliest available rate
    if (!matchingRate && matchingRates.length > 0) {
        matchingRate = matchingRates[0];
        console.log(`No preceding rate found for ${esisRecord.Provider}, using earliest available rate`);
    }
    
    return matchingRate;
}

function calculatePremiumOverSwap(esisRecord, swapRate) {
    if (!swapRate) return null;
    
    // Convert InitialRate from percentage to decimal if needed
    const initialRateDecimal = typeof esisRecord.InitialRate === 'number' ? 
        esisRecord.InitialRate / 100 : parseFloat(esisRecord.InitialRate) / 100;
    
    // Calculate premium in basis points (100 basis points = 1%)
    return Math.round((initialRateDecimal - swapRate.rate) * 10000);
}

function assignPremiumBand(premiumBps) {
    if (premiumBps === null) return 'Unknown';
    
    // Floor to nearest 20bps band
    const lowerBound = Math.floor(premiumBps / 20) * 20;
    return `${lowerBound}-${lowerBound + 20}`;
}

function extractMonth(date) {
    return date.toISOString().substring(0, 7); // Format: YYYY-MM
}

function aggregateByPremiumBandAndMonth(records) {
    try {
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
        
        // Aggregate loan amounts
        records.forEach(record => {
            if (record.PremiumBand && record.Month && record.Loan) {
                // Make sure the band and month exist in our structure
                if (aggregatedData.data[record.PremiumBand] && 
                    months.includes(record.Month)) {
                    
                    aggregatedData.data[record.PremiumBand][record.Month] += record.Loan;
                    aggregatedData.totals.byPremiumBand[record.PremiumBand] += record.Loan;
                    aggregatedData.totals.byMonth[record.Month] += record.Loan;
                    aggregatedData.totals.overall += record.Loan;
                }
            }
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
                formatter: "money",
                formatterParams: {
                    precision: 0,
                    thousand: ",",
                    symbol: "£"
                },
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
            formatter: "money",
            formatterParams: {
                precision: 0,
                thousand: ",",
                symbol: "£"
            },
            headerSort: false,
            bottomCalc: "sum",
            bottomCalcFormatter: "money",
            bottomCalcFormatterParams: {
                precision: 0,
                thousand: ",",
                symbol: "£"
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
                return (typeof value === 'number') ? value.toFixed(1) + '%' : 'N/A';
            },
            bottomCalc: function(values, data, calcParams) {
                const totalRowData = data.find(d => d.premiumBand === "Total");
                return totalRowData && typeof totalRowData.percentageOfMarket === 'number' ? totalRowData.percentageOfMarket : null;
            },
            bottomCalcFormatter: function(cell, formatterParams, onRendered){
                const value = cell.getValue();
                return (typeof value === 'number') ? value.toFixed(1) + '%' : 'N/A';
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
    
    // Add rows for each premium band
    currentProcessedData.premiumBands.forEach(band => {
        const filteredBandTotal = currentProcessedData.totals.byPremiumBand[band] || 0;
        const marketBandTotal = state.totalMarketByPremiumBand[band] || 0;
        const percentage = (marketBandTotal > 0) ? (filteredBandTotal / marketBandTotal) * 100 : 0;

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
    const grandMarketTotal = state.overallTotalMarket || 0;
    const grandPercentage = (grandMarketTotal > 0) ? (grandFilteredTotal / grandMarketTotal) * 100 : 0;

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
        const premiumMin = parseInt(elements.premiumMin.value) || 0;
        const premiumMax = parseInt(elements.premiumMax.value) || 500;
        
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
        state.filters = {
            dateRange: [dateStart, dateEnd],
            lenders: selectedLenders.filter(l => l !== ""), // Remove empty selections (All Lenders option)
            premiumRange: [premiumMin, premiumMax],
            productTypes: selectedProductTypes,
            purchaseTypes: selectedPurchaseTypes
        };
        
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
        
        // Process filtered data
        state.processedData = aggregateByPremiumBandAndMonth(state.filteredData);
        
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
            } else if (record.PremiumOverSwap < state.filters.premiumRange[0] || record.PremiumOverSwap > state.filters.premiumRange[1]) {
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
            
            console.log(`filterData PASSED - Record: Month=${record.Month}, PremiumBand=${record.PremiumBand}, Loan=${record.Loan}, Provider=${record.Provider}`);
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
        
        // Reset premium range inputs
        elements.premiumMin.value = 0;
        elements.premiumMax.value = 500;
        
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

// --- MARKET SHARE: Apply market share analysis ---
function applyMarketShareAnalysis() {
    // Get selected bands
    const selectedBands = Array.from(elements.premiumBandSelect.selectedOptions).map(opt => opt.value);
    state.marketShareFilters.selectedPremiumBands = selectedBands;
    // Aggregate and render
    const data = aggregateLenderMarketShare(selectedBands);
    state.lenderMarketShareData = data;
    renderLenderMarketShareTable(data, selectedBands);
}

// --- MARKET SHARE: Aggregate data by lender and premium band ---
function aggregateLenderMarketShare(selectedBands) {
    // Filter data by current filters (date, product, etc)
    const filtered = filterData(state.esisData);
    // Get unique lenders
    const lenders = [...new Set(filtered.map(r => r.BaseLender || r.Provider).filter(Boolean))].sort();
    // Build structure: { lender: { band1: {amount, pct}, band2: ...}, ... }
    const bandTotals = {};
    selectedBands.forEach(band => bandTotals[band] = 0);
    const lenderData = {};
    lenders.forEach(lender => {
        lenderData[lender] = {};
        selectedBands.forEach(band => lenderData[lender][band] = 0);
    });
    // Aggregate
    filtered.forEach(r => {
        const lender = r.BaseLender || r.Provider;
        const band = r.PremiumBand;
        if (lender && selectedBands.includes(band)) {
            lenderData[lender][band] += r.Loan || 0;
            bandTotals[band] += r.Loan || 0;
        }
    });
    // Compute total per lender and grand total
    let marketGrandTotal = 0;
    lenders.forEach(lender => {
        lenderData[lender].Total = selectedBands.reduce((sum, band) => sum + lenderData[lender][band], 0);
        marketGrandTotal += lenderData[lender].Total;
    });
    // Compute %
    lenders.forEach(lender => {
        selectedBands.forEach(band => {
            lenderData[lender][band + '_pct'] = bandTotals[band] > 0 ? (lenderData[lender][band] / bandTotals[band]) * 100 : 0;
        });
        lenderData[lender].Total_pct = marketGrandTotal > 0 ? (lenderData[lender].Total / marketGrandTotal) * 100 : 0;
    });
    // Prepare summary row
    const summary = { Lender: 'Total Market' };
    selectedBands.forEach(band => {
        summary[band] = bandTotals[band];
        summary[band + '_pct'] = 100;
    });
    summary.Total = marketGrandTotal;
    summary.Total_pct = 100;
    return { lenders, lenderData, bandTotals, marketGrandTotal, summary };
}

// --- MARKET SHARE: Render Tabulator table ---
function renderLenderMarketShareTable(data, selectedBands) {
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
            field: band,
            hozAlign: 'right',
            sorter: 'number',
            formatter: function(cell) {
                const amt = cell.getValue();
                const pct = cell.getRow().getData()[band + '_pct'];
                // Visual: horizontal bar
                const barWidth = Math.min(100, pct || 0);
                return `<div style="display:flex;align-items:center;">
                    <div style="background:#b3d1ff;height:16px;width:${barWidth}px;max-width:60px;margin-right:4px;"></div>
                    <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(1) : '0'}%)">
                        £${amt.toLocaleString()}<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(1) : '0'}%</span>
                    </span>
                </div>`;
            },
            headerSort: true,
            tooltip: true
        });
    });
    columns.push({
        title: 'Total', field: 'Total', hozAlign: 'right', sorter: 'number',
        formatter: function(cell) {
            const amt = cell.getValue();
            const pct = cell.getRow().getData().Total_pct;
            return `<div style="display:flex;align-items:center;">
                <div style="background:#b3ffc6;height:16px;width:${Math.min(100, pct || 0)}px;max-width:60px;margin-right:4px;"></div>
                <span title="£${amt.toLocaleString()} (${pct ? pct.toFixed(1) : '0'}%)">
                    £${amt.toLocaleString()}<br><span style='font-size:11px;color:#555;'>${pct ? pct.toFixed(1) : '0'}%</span>
                </span>
            </div>`;
        },
        headerSort: true,
        tooltip: true
    });
    // Prepare data rows
    const rows = data.lenders.map(lender => {
        const row = { Lender: lender };
        selectedBands.forEach(band => {
            row[band] = data.lenderData[lender][band];
            row[band + '_pct'] = data.lenderData[lender][band + '_pct'];
        });
        row.Total = data.lenderData[lender].Total;
        row.Total_pct = data.lenderData[lender].Total_pct;
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
