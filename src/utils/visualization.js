/**
 * Visualization Utility Functions
 * 
 * This file contains functions for preparing data for visualization in the
 * Mortgage Market Analysis Tool.
 */

/**
 * Formats data for table display
 * @param {Array} data - Raw mortgage data
 * @returns {Array} - Formatted data for table display
 */
function prepareTableData(data) {
  if (!data || data.length === 0) {
    return [];
  }
  
  return data.map(item => ({
    lender: item.Provider,
    rate: `${item.Rate}%`,
    ltv: `${item.LTV}%`,
    premiumBand: item.PremiumBand
  }));
}

/**
 * Calculates and formats market share data for table display
 * @param {Array} data - Raw mortgage data
 * @returns {Array} - Formatted market share data
 */
function prepareMarketShareTable(data) {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Count occurrences of each lender
  const lenderCounts = {};
  data.forEach(item => {
    const lender = item.Provider;
    lenderCounts[lender] = (lenderCounts[lender] || 0) + 1;
  });
  
  // Calculate percentages
  const totalItems = data.length;
  const result = Object.entries(lenderCounts).map(([lender, count]) => {
    const share = (count / totalItems) * 100;
    return {
      lender,
      count,
      share: `${share.toFixed(1)}%`
    };
  });
  
  // Sort by count (descending)
  return result.sort((a, b) => b.count - a.count);
}

/**
 * Prepares data for heatmap visualization
 * @param {Array} data - Raw mortgage data
 * @returns {Object} - Structured data for heatmap
 */
function prepareHeatmapData(data) {
  if (!data || data.length === 0) {
    return { lenders: [], premiumBands: [], data: [] };
  }
  
  // Extract unique lenders and premium bands
  const lenders = [...new Set(data.map(item => item.Provider))];
  const premiumBands = [...new Set(data.map(item => item.PremiumBand))];
  
  // Count occurrences for each lender and premium band combination
  const heatmapData = [];
  
  lenders.forEach(lender => {
    premiumBands.forEach(premiumBand => {
      const count = data.filter(
        item => item.Provider === lender && item.PremiumBand === premiumBand
      ).length;
      
      if (count > 0) {
        heatmapData.push({
          lender,
          premiumBand,
          count
        });
      }
    });
  });
  
  return {
    lenders,
    premiumBands,
    data: heatmapData
  };
}

/**
 * Prepares data for trends chart visualization
 * @param {Array} data - Raw mortgage data with dates
 * @returns {Object} - Structured data for trends chart
 */
function prepareTrendsChartData(data) {
  if (!data || data.length === 0) {
    return { labels: [], datasets: [] };
  }
  
  // Group data by month
  const monthlyData = {};
  data.forEach(item => {
    const date = new Date(item.DocumentDate);
    const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    
    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = {};
    }
    
    const lender = item.Provider;
    if (!monthlyData[monthYear][lender]) {
      monthlyData[monthYear][lender] = [];
    }
    
    monthlyData[monthYear][lender].push(item.Rate);
  });
  
  // Get unique lenders and sorted months
  const lenders = [...new Set(data.map(item => item.Provider))];
  const months = Object.keys(monthlyData).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA - dateB;
  });
  
  // Calculate average rates for each lender by month
  const datasets = lenders.map(lender => {
    const monthlyRates = months.map(month => {
      const rates = monthlyData[month][lender] || [];
      if (rates.length === 0) return null;
      
      const sum = rates.reduce((acc, rate) => acc + rate, 0);
      return parseFloat((sum / rates.length).toFixed(2));
    });
    
    return {
      label: lender,
      data: monthlyRates
    };
  });
  
  return {
    labels: months,
    datasets
  };
}

/**
 * Renders a standard HTML table with the provided data
 * @param {Array} tableData - Formatted data for table display
 * @param {string} containerId - ID of the container element (default: 'dataTable')
 */
function renderTable(tableData, containerId = 'dataTable') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Create table element
  const table = document.createElement('table');
  table.className = 'data-table';
  
  // Create table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  if (tableData.length > 0) {
    // Get column names from the first data item
    const columns = Object.keys(tableData[0]);
    
    columns.forEach(column => {
      const th = document.createElement('th');
      // Convert camelCase to Title Case
      th.textContent = column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, ' $1');
      headerRow.appendChild(th);
    });
  } else {
    // Default headers if no data
    const defaultHeaders = ['Lender', 'Rate', 'LTV'];
    defaultHeaders.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
  }
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  tableData.forEach(item => {
    const row = document.createElement('tr');
    
    Object.values(item).forEach(value => {
      const td = document.createElement('td');
      td.textContent = value;
      row.appendChild(td);
    });
    
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  
  // Clear container and append table
  container.innerHTML = '';
  container.appendChild(table);
}

/**
 * Populates a select element with premium band options
 * @param {Array} premiumBands - Array of premium band values
 * @param {string} selectId - ID of the select element (default: 'premiumBandSelect')
 */
function populatePremiumBandSelect(premiumBands, selectId = 'premiumBandSelect') {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  // Clear existing options
  select.innerHTML = '';
  
  // Add 'All' option
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All Premium Bands';
  select.appendChild(allOption);
  
  // Add premium band options
  premiumBands.forEach(band => {
    const option = document.createElement('option');
    option.value = band;
    option.textContent = band;
    select.appendChild(option);
  });
}

/**
 * Renders a heatmap chart using Chart.js
 * @param {Object} heatmapData - Structured data for heatmap
 * @param {string} canvasId - ID of the canvas element (default: 'heatmapChart')
 */
function renderHeatmap(heatmapData, canvasId = 'heatmapChart') {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  
  // Prepare data for Chart.js
  const chartData = {
    labels: heatmapData.lenders,
    datasets: heatmapData.premiumBands.map((band, index) => {
      // Filter data for this premium band
      const bandData = heatmapData.lenders.map(lender => {
        const dataPoint = heatmapData.data.find(
          item => item.lender === lender && item.premiumBand === band
        );
        return dataPoint ? dataPoint.count : 0;
      });
      
      return {
        label: band,
        data: bandData,
        backgroundColor: getColorForIndex(index)
      };
    })
  };
  
  // Create chart
  new Chart(canvas, {
    type: 'heatmap',
    data: chartData,
    options: {
      responsive: true,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Lenders'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Premium Bands'
          }
        }
      }
    }
  });
}

/**
 * Helper function to generate colors for chart elements
 * @param {number} index - Index of the element
 * @returns {string} - RGBA color string
 */
function getColorForIndex(index) {
  const colors = [
    'rgba(255, 99, 132, 0.7)',   // Red
    'rgba(54, 162, 235, 0.7)',    // Blue
    'rgba(255, 206, 86, 0.7)',    // Yellow
    'rgba(75, 192, 192, 0.7)',    // Green
    'rgba(153, 102, 255, 0.7)',   // Purple
    'rgba(255, 159, 64, 0.7)'     // Orange
  ];
  
  return colors[index % colors.length];
}

/**
 * Renders a table using Tabulator library
 * @param {Array} tableData - Formatted data for table display
 * @param {string} containerId - ID of the container element (default: 'dataTable')
 */
function renderTabulatorTable(tableData, containerId = 'dataTable') {
  const container = document.getElementById(containerId);
  if (!container || typeof Tabulator === 'undefined') return;
  
  // Generate columns from data
  const columns = tableData.length > 0 
    ? Object.keys(tableData[0]).map(key => ({
        title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        field: key,
        sorter: 'string'
      }))
    : [];
  
  // Initialize Tabulator
  new Tabulator("#" + containerId, {
    data: tableData,
    columns: columns,
    layout: 'fitColumns',
    pagination: 'local',
    paginationSize: 10,
    paginationSizeSelector: [5, 10, 20, 50],
    movableColumns: true,
    resizableRows: true
  });
}

module.exports = {
  prepareTableData,
  prepareMarketShareTable,
  prepareHeatmapData,
  prepareTrendsChartData,
  renderTable,
  populatePremiumBandSelect,
  renderHeatmap,
  renderTabulatorTable
};
