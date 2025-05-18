Add Market Share Trends Chart to Mortgage Analysis Tool
Add a fourth visualization to our mortgage analysis tool: a line chart showing lender market share over time for selected premium bands. This visualization should provide users insights into how different lenders' market positions evolve over the selected time period.
Requirements
1. Basic Setup

Create a new section titled "Market Share Trends" below the existing visualizations
Add premium band selection UI similar to the screenshot provided
Include an "Apply" button to update the chart after selections
Add an "Export Data" button to download the chart data

2. Premium Band Selection UI
html<div class="premium-band-selector">
  <h3>Price premium over swaps</h3>
  <div class="premium-bands-container">
    <!-- Generate buttons for all premium bands dynamically -->
    <div class="premium-bands-grid">
      <!-- Each band should be a selectable button -->
      <button class="premium-band-btn" data-band="0-20">0-20</button>
      <button class="premium-band-btn" data-band="20-40">20-40</button>
      <!-- More buttons will be generated dynamically -->
    </div>
  </div>
  
  <div class="selection-controls">
    <div class="selection-count"><span id="bands-selected-count">0</span> selected</div>
    <button id="trends-apply-btn" class="apply-btn">Apply</button>
    <button id="trends-export-btn" class="export-btn">Export Data</button>
  </div>
</div>

<div id="market-share-trends-chart" class="trends-chart-container"></div>
3. JavaScript for Premium Band Selection
javascriptfunction initializePremiumBandSelector() {
  // Get all premium bands from the data
  const premiumBands = [...new Set(state.esisData.map(r => r.PremiumBand))].sort();
  
  // Create the selection buttons
  const container = document.querySelector('.premium-bands-grid');
  container.innerHTML = '';
  
  premiumBands.forEach(band => {
    const button = document.createElement('button');
    button.className = 'premium-band-btn';
    button.setAttribute('data-band', band);
    button.textContent = band;
    
    button.addEventListener('click', function() {
      this.classList.toggle('selected');
      updateSelectedCount();
    });
    
    container.appendChild(button);
  });
  
  // Update the selected count display
  function updateSelectedCount() {
    const selectedCount = document.querySelectorAll('.premium-band-btn.selected').length;
    document.getElementById('bands-selected-count').textContent = selectedCount;
  }
  
  // Add event listener for the Apply button
  document.getElementById('trends-apply-btn').addEventListener('click', function() {
    updateMarketShareTrendsChart();
  });
  
  // Add event listener for the Export button
  document.getElementById('trends-export-btn').addEventListener('click', function() {
    exportTrendsData();
  });
}
4. Data Processing for the Chart
javascriptfunction updateMarketShareTrendsChart() {
  // Get selected premium bands
  const selectedBands = Array.from(
    document.querySelectorAll('.premium-band-btn.selected')
  ).map(btn => btn.getAttribute('data-band'));
  
  // If no bands are selected, show a message and return
  if (selectedBands.length === 0) {
    document.getElementById('market-share-trends-chart').innerHTML = 
      '<div class="no-data-message">Please select at least one premium band to view trends.</div>';
    return;
  }
  
  // Get data filtered by the main date range filter (but NOT by lender filter)
  const filteredByDate = state.esisData.filter(record => {
    // Apply only date range filter, not lender filter
    const recordDate = new Date(record.DocumentDate);
    return recordDate >= state.filters.startDate && recordDate <= state.filters.endDate;
  });
  
  // Filter to include only selected premium bands
  const filteredData = filteredByDate.filter(record => 
    selectedBands.includes(record.PremiumBand)
  );
  
  // Group data by month and lender
  const monthlyData = groupByMonthAndLender(filteredData);
  
  // Find lenders who have market share in any month
  const activeLenders = findActiveLenders(monthlyData);
  
  // Render the chart
  renderTrendsChart(monthlyData, activeLenders);
}

function groupByMonthAndLender(data) {
  // Initialize result structure
  const result = {};
  
  // Format months as 'MMM YY' (e.g., 'Jan 24')
  const formatMonth = date => {
    const d = new Date(date);
    return `${d.toLocaleString('default', {month: 'short'})} ${String(d.getFullYear()).slice(2)}`;
  };
  
  // Get all unique months in the data
  const allMonths = [...new Set(data.map(record => {
    const date = new Date(record.DocumentDate);
    return `${date.getFullYear()}-${date.getMonth()+1}`;
  }))].sort();
  
  // Create a map of all months with formatted labels
  const months = allMonths.map(m => {
    const [year, month] = m.split('-');
    const date = new Date(parseInt(year), parseInt(month)-1, 1);
    return {
      key: m,
      label: formatMonth(date),
      date: date
    };
  });
  
  // Initialize data structure with all months
  months.forEach(month => {
    result[month.key] = {
      label: month.label,
      date: month.date,
      lenders: {},
      total: 0
    };
  });
  
  // Sum loan amounts by month and lender
  data.forEach(record => {
    const date = new Date(record.DocumentDate);
    const monthKey = `${date.getFullYear()}-${date.getMonth()+1}`;
    const lender = record.BaseLender || record.Provider;
    const loan = record.Loan || 0;
    
    if (!result[monthKey].lenders[lender]) {
      result[monthKey].lenders[lender] = 0;
    }
    
    result[monthKey].lenders[lender] += loan;
    result[monthKey].total += loan;
  });
  
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
  
  return {
    months: months.map(m => m.key),
    monthLabels: months.map(m => m.label),
    data: result
  };
}

function findActiveLenders(monthlyData) {
  // Find all lenders who have market share in any month
  const lenderSet = new Set();
  
  Object.values(monthlyData.data).forEach(month => {
    Object.keys(month.lenders).forEach(lender => {
      if (!lender.endsWith('_pct') && month.lenders[lender] > 0) {
        lenderSet.add(lender);
      }
    });
  });
  
  return Array.from(lenderSet).sort();
}
5. Chart Rendering
Use a line chart to visualize the data. This can be implemented with a library like Chart.js:
javascriptfunction renderTrendsChart(monthlyData, lenders) {
  const chartContainer = document.getElementById('market-share-trends-chart');
  chartContainer.innerHTML = '<canvas id="trends-chart"></canvas>';
  
  const ctx = document.getElementById('trends-chart').getContext('2d');
  
  // Define colors for lenders (you can expand this array)
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#8AC249', '#EA5545', '#27AEEF', '#87BC45'
  ];
  
  // Create datasets for each lender
  const datasets = lenders.map((lender, index) => {
    // Get color from the array, or generate one if we run out
    const color = colors[index % colors.length];
    
    // Create dataset with percentage values for each month
    const data = monthlyData.months.map(month => {
      const monthData = monthlyData.data[month];
      return monthData.lenders[lender + '_pct'] || 0;
    });
    
    return {
      label: lender,
      data: data,
      borderColor: color,
      backgroundColor: 'transparent',
      pointBackgroundColor: color,
      pointRadius: 4,
      tension: 0.3 // Makes the line curved
    };
  });
  
  // Create and render the chart
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthlyData.monthLabels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'Market share'
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
  });
}
6. Data Export Functionality
javascriptfunction exportTrendsData() {
  // Get selected premium bands
  const selectedBands = Array.from(
    document.querySelectorAll('.premium-band-btn.selected')
  ).map(btn => btn.getAttribute('data-band'));
  
  // Get the monthly data (reusing the same function used for the chart)
  const filteredByDate = state.esisData.filter(record => {
    const recordDate = new Date(record.DocumentDate);
    return recordDate >= state.filters.startDate && recordDate <= state.filters.endDate;
  });
  
  const filteredData = filteredByDate.filter(record => 
    selectedBands.includes(record.PremiumBand)
  );
  
  const monthlyData = groupByMonthAndLender(filteredData);
  const lenders = findActiveLenders(monthlyData);
  
  // Create CSV content
  let csvContent = 'Month,';
  
  // Add lender headers
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
}
7. CSS Styling
css.premium-band-selector {
  margin-top: 30px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.premium-bands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  margin: 15px 0;
}

.premium-band-btn {
  padding: 8px 5px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.premium-band-btn.selected {
  background-color: #0078d4;
  color: white;
  border-color: #0078d4;
}

.selection-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}

.apply-btn, .export-btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.apply-btn {
  background-color: #0078d4;
  color: white;
  border: none;
}

.export-btn {
  background-color: white;
  color: #0078d4;
  border: 1px solid #0078d4;
}

.trends-chart-container {
  height: 400px;
  margin: 20px 0;
}

.no-data-message {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: #666;
  font-style: italic;
}
8. Integration with Main Page
Update your initialization code to set up the trends chart when the page loads:
javascript// In your main initialization function
function initializeApp() {
  // Existing initialization code
  // ...
  
  // Initialize the trends chart components
  initializePremiumBandSelector();
  
  // Show initial empty state
  document.getElementById('market-share-trends-chart').innerHTML = 
    '<div class="no-data-message">Please select premium bands and click Apply to view trends.</div>';
}

// Update your main filter handling to reset the trends chart section
function updateAllVisualizationsAfterFiltering() {
  // Update existing tables/charts
  // ...
  
  // Reset premium band selection for trends chart
  document.querySelectorAll('.premium-band-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  document.getElementById('bands-selected-count').textContent = '0';
  
  document.getElementById('market-share-trends-chart').innerHTML = 
    '<div class="no-data-message">Please select premium bands and click Apply to view trends.</div>';
}
9. Implementation Order

Add the HTML structure for the premium band selector and chart container
Add the CSS for styling these elements
Implement the premium band selection UI functionality
Implement the data processing functions for monthly market share calculation
Create the chart rendering function using Chart.js
Add the export functionality
Integrate with the rest of the application
Test with different premium band selections and date ranges

10. Required Dependencies
Make sure to include Chart.js in your HTML:
html<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
Testing Checklist

Verify the premium band selection UI works correctly
Test that the chart updates when Apply is clicked
Confirm that only lenders with market share in the selected bands appear in the chart
Check that the date range filter affects the chart correctly
Test the export functionality
Ensure the chart is responsive and displays well on different screen sizes