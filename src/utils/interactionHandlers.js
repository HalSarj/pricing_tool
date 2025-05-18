/**
 * User Interaction Handlers
 * 
 * This file contains functions for handling user interactions like
 * filtering, resetting, and exporting data in the Mortgage Market Analysis Tool.
 */

const { filterData } = require('./filtering');
const { renderTable } = require('./visualization');

/**
 * Applies filters to the data based on form input values
 * @param {Array} data - The original dataset to filter
 * @param {string} tableContainerId - ID of the table container element (default: 'dataTable')
 */
function applyFilters(data, tableContainerId = 'dataTable') {
  if (!data || !Array.isArray(data)) return;
  
  // Collect filter values from form elements
  const filters = {
    lender: getSelectValue('lenderSelect'),
    productType: getSelectValue('productTypeSelect'),
    productTerm: getSelectValue('productTermSelect'),
    ltvMin: getInputNumberValue('ltvMinInput'),
    ltvMax: getInputNumberValue('ltvMaxInput'),
    premiumBands: getMultiSelectValues('premiumBandSelect')
  };
  
  // Remove undefined or null values
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined || filters[key] === null || filters[key] === 'all') {
      delete filters[key];
    }
  });
  
  // Apply filters and render results
  const filteredData = filterData(data, filters);
  renderTable(filteredData, tableContainerId);
  
  // Update results count if element exists
  const resultsCount = document.getElementById('resultsCount');
  if (resultsCount) {
    resultsCount.textContent = `Showing ${filteredData.length} of ${data.length} products`;
  }
  
  return filteredData;
}

/**
 * Resets all filter form elements to their default values
 * @param {Array} data - The original dataset to display after reset
 * @param {string} tableContainerId - ID of the table container element (default: 'dataTable')
 */
function resetFilters(data, tableContainerId = 'dataTable') {
  if (!data || !Array.isArray(data)) return;
  
  // Reset select elements
  resetSelect('lenderSelect');
  resetSelect('productTypeSelect');
  resetSelect('productTermSelect');
  resetSelect('premiumBandSelect');
  
  // Reset input elements
  resetInput('ltvMinInput');
  resetInput('ltvMaxInput');
  resetInput('startDateInput');
  resetInput('endDateInput');
  
  // Display original data
  renderTable(data, tableContainerId);
  
  // Update results count if element exists
  const resultsCount = document.getElementById('resultsCount');
  if (resultsCount) {
    resultsCount.textContent = `Showing all ${data.length} products`;
  }
  
  return data;
}

/**
 * Exports data to a CSV file and triggers download
 * @param {Array} data - The data to export
 * @param {string} filename - The name of the file to download (default: 'mortgage_data.csv')
 */
function exportData(data, filename = 'mortgage_data.csv') {
  if (!data || !Array.isArray(data) || data.length === 0) return;
  
  // Get headers from first data item
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  data.forEach(item => {
    const row = headers.map(header => {
      // Wrap values with commas in quotes
      const value = item[header] || '';
      return value.toString().includes(',') ? `"${value}"` : value;
    }).join(',');
    
    csvContent += row + '\n';
  });
  
  // Create blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Helper function to get value from a select element
 * @param {string} id - ID of the select element
 * @returns {string|null} - Selected value or null if not found
 */
function getSelectValue(id) {
  const select = document.getElementById(id);
  if (!select) return null;
  return select.value;
}

/**
 * Helper function to get multiple selected values from a select element
 * @param {string} id - ID of the select element
 * @returns {Array|null} - Array of selected values or null if not found
 */
function getMultiSelectValues(id) {
  const select = document.getElementById(id);
  if (!select) return null;
  
  // If it's a single select that's set to 'all', return null
  if (!select.multiple && select.value === 'all') return null;
  
  // For multiple select, get all selected options
  if (select.multiple) {
    return Array.from(select.selectedOptions).map(option => option.value);
  }
  
  // For single select with a specific value
  return [select.value];
}

/**
 * Helper function to get numeric value from an input element
 * @param {string} id - ID of the input element
 * @returns {number|null} - Numeric value or null if not valid
 */
function getInputNumberValue(id) {
  const input = document.getElementById(id);
  if (!input || input.value === '') return null;
  
  const value = parseFloat(input.value);
  return isNaN(value) ? null : value;
}

/**
 * Helper function to reset a select element to its first option
 * @param {string} id - ID of the select element
 */
function resetSelect(id) {
  const select = document.getElementById(id);
  if (!select) return;
  
  if (select.options.length > 0) {
    select.selectedIndex = 0;
  }
}

/**
 * Helper function to reset an input element to empty
 * @param {string} id - ID of the input element
 */
function resetInput(id) {
  const input = document.getElementById(id);
  if (!input) return;
  
  input.value = '';
}

module.exports = {
  applyFilters,
  resetFilters,
  exportData,
  // Export helpers for testing
  getSelectValue,
  getMultiSelectValues,
  getInputNumberValue,
  resetSelect,
  resetInput
};
