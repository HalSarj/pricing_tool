Add Heatmap Visualization to Mortgage Analysis Tool
Add a third visualization to our mortgage analysis tool: a heatmap showing lender activity across premium bands. This should integrate with our existing UI and respect all current filters.
Requirements
1. Basic Setup

Create a new section titled "Market Distribution Heatmap" below the existing two tables
The heatmap should show lenders (rows) against premium bands (columns)
Use the same premium bands we're already using throughout the application
The heatmap should respect all filters currently applied (date range, product term, lender filters)

2. Dual Visualization Modes
Add a toggle switch above the heatmap with two options:

Lender-centric mode: "Distribution of Each Lender's Volume"

In this mode, each row (lender) is normalized independently
The darkest cells show where each lender concentrates their own volume
Every lender should have at least one "hot" cell showing their peak activity area


Premium-centric mode: "Market Share Within Premium Bands"

In this mode, each column (premium band) is normalized independently
The darkest cells show which lenders dominate specific premium bands
Some lenders may never appear "hot" if they have small market share overall



3. Data Processing
javascriptfunction prepareHeatmapData(filteredData) {
    // Get unique lenders and premium bands
    const lenders = [...new Set(filteredData.map(r => r.BaseLender || r.Provider))].sort();
    const premiumBands = [...new Set(filteredData.map(r => r.PremiumBand))].sort();
    
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
4. Visualization
Add the following HTML structure:
html<div class="heatmap-container">
    <div class="heatmap-controls">
        <label>Visualization Mode:</label>
        <div class="toggle-switch">
            <input type="radio" id="lender-mode" name="heatmap-mode" value="lender" checked>
            <label for="lender-mode">Distribution of Each Lender's Volume</label>
            
            <input type="radio" id="premium-mode" name="heatmap-mode" value="premium">
            <label for="premium-mode">Market Share Within Premium Bands</label>
        </div>
    </div>
    
    <div id="heatmap-visualization"></div>
</div>
5. Rendering the Heatmap
Use either:

A custom HTML/CSS implementation with color gradients
A simple visualization library compatible with the rest of your application

Example rendering function:
javascriptfunction renderHeatmap(heatmapData, mode = 'lender') {
    const container = document.getElementById('heatmap-visualization');
    container.innerHTML = '';
    
    // Create table element
    const table = document.createElement('table');
    table.className = 'heatmap-table';
    
    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add empty cell for top-left corner
    headerRow.appendChild(document.createElement('th'));
    
    // Add premium band headers
    heatmapData.premiumBands.forEach(band => {
        const th = document.createElement('th');
        th.textContent = band;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Add rows for each lender
    heatmapData.lenders.forEach(lender => {
        const row = document.createElement('tr');
        
        // Add lender name cell
        const lenderCell = document.createElement('th');
        lenderCell.textContent = lender;
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
            
            // Add data attributes for tooltips
            cell.setAttribute('data-value', formatCurrency(value));
            cell.setAttribute('data-percentage', percentage.toFixed(1) + '%');
            
            // Add tooltip event listeners
            cell.addEventListener('mouseover', showTooltip);
            cell.addEventListener('mouseout', hideTooltip);
            
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

// Helper tooltip functions
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
6. CSS Styling
css.heatmap-container {
    margin-top: 30px;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.heatmap-controls {
    margin-bottom: 15px;
}

.toggle-switch {
    display: inline-block;
    margin-left: 10px;
}

.heatmap-table {
    width: 100%;
    border-collapse: collapse;
}

.heatmap-table th, .heatmap-table td {
    padding: 8px;
    text-align: center;
    border: 1px solid #ddd;
}

.heatmap-table th {
    background-color: #f5f5f5;
}

.heatmap-tooltip {
    padding: 5px 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
}
7. Integration with Existing Filters
javascript// Update this function to also update the heatmap
function updateTables() {
    // Existing code for updating other tables
    // ...
    
    // Update heatmap
    updateHeatmap();
}

function updateHeatmap() {
    // Get filtered data based on current filters
    const filteredData = filterData(state.esisData);
    
    // Prepare data for the heatmap
    const heatmapData = prepareHeatmapData(filteredData);
    
    // Get current mode
    const mode = document.querySelector('input[name="heatmap-mode"]:checked').value;
    
    // Render the heatmap
    renderHeatmap(heatmapData, mode);
}

// Add event listeners for heatmap mode toggle
document.querySelectorAll('input[name="heatmap-mode"]').forEach(radio => {
    radio.addEventListener('change', updateHeatmap);
});
8. Implementation Order

Add the HTML structure for the heatmap section
Implement the data processing function
Create the rendering function
Add the CSS styling
Integrate with existing filter system
Test with sample data and verify both modes work correctly
Add tooltips for improved user experience

9. Testing

Test that the heatmap updates correctly when filters are changed
Verify both visualization modes display correctly
Ensure the tooltips show the correct values
Test with a variety of data sets to ensure proper color scaling