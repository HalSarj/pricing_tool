/**
 * User Interaction Handlers Tests
 * 
 * This file contains tests for the functions that handle user interactions
 * like filtering, resetting, and exporting data in the Mortgage Market Analysis Tool.
 */

// Import the handlers to test
const {
  applyFilters,
  resetFilters,
  exportData,
  getSelectValue,
  getMultiSelectValues,
  getInputNumberValue,
  resetSelect,
  resetInput
} = require('../src/utils/interactionHandlers');

// Mock dependencies
jest.mock('../src/utils/filtering');
jest.mock('../src/utils/visualization');

// Import mocked dependencies for assertions
const { filterData } = require('../src/utils/filtering');
const { renderTable } = require('../src/utils/visualization');

describe('applyFilters', () => {
  // Mock DOM elements and event handlers
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="lenderSelect"><option value="HSBC UK" selected>HSBC UK</option></select>
      <select id="productTypeSelect"><option value="Fixed Rate" selected>Fixed Rate</option></select>
      <select id="productTermSelect"><option value="2-year" selected>2-year</option></select>
      <input id="ltvMinInput" value="70" />
      <input id="ltvMaxInput" value="80" />
      <select id="premiumBandSelect"><option value="all">All Premium Bands</option></select>
      <div id="dataTable"></div>
      <div id="resultsCount"></div>
    `;
    
    // Reset mocks
    jest.resetAllMocks();
    
    // Mock filterData implementation
    filterData.mockImplementation((data, filters) => {
      return [{ lender: 'HSBC UK', rate: '3.99%' }];
    });
  });
  
  test('should collect filter values from form elements', () => {
    const testData = [{ Provider: 'HSBC UK', Rate: 3.99 }];
    
    applyFilters(testData);
    
    // Check if filterData was called with correct filters
    expect(filterData).toHaveBeenCalledWith(testData, {
      lender: 'HSBC UK',
      productType: 'Fixed Rate',
      productTerm: '2-year',
      ltvMin: 70,
      ltvMax: 80
    });
    
    // Check if renderTable was called with filtered data
    expect(renderTable).toHaveBeenCalled();
  });
  
  test('should update results count element', () => {
    const testData = [
      { Provider: 'HSBC UK', Rate: 3.99 },
      { Provider: 'Barclays', Rate: 4.25 }
    ];
    
    // Mock the filtered data result
    const filteredResult = [{ lender: 'HSBC UK', rate: '3.99%' }];
    filterData.mockReturnValue(filteredResult);
    
    applyFilters(testData);
    
    // Check if results count was updated
    const resultsCount = document.getElementById('resultsCount');
    expect(resultsCount.textContent).toBe('Showing 1 of 2 products');
  });
  
  test('should handle null or undefined data', () => {
    applyFilters(null);
    expect(filterData).not.toHaveBeenCalled();
    expect(renderTable).not.toHaveBeenCalled();
    
    applyFilters(undefined);
    expect(filterData).not.toHaveBeenCalled();
    expect(renderTable).not.toHaveBeenCalled();
  });
});

describe('resetFilters', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="lenderSelect"><option value="all">All Lenders</option><option value="HSBC UK" selected>HSBC UK</option></select>
      <select id="productTypeSelect"><option value="all">All Types</option><option value="Fixed Rate" selected>Fixed Rate</option></select>
      <select id="productTermSelect"><option value="all">All Terms</option><option value="2-year" selected>2-year</option></select>
      <select id="premiumBandSelect"><option value="all">All Bands</option><option value="2-3%" selected>2-3%</option></select>
      <input id="ltvMinInput" value="70" />
      <input id="ltvMaxInput" value="80" />
      <input id="startDateInput" value="2023-01-01" />
      <input id="endDateInput" value="2023-12-31" />
      <div id="dataTable"></div>
      <div id="resultsCount"></div>
    `;
    
    // Reset mocks
    jest.resetAllMocks();
  });
  
  test('should reset all form elements to default values', () => {
    const testData = [
      { Provider: 'HSBC UK', Rate: 3.99 },
      { Provider: 'Barclays', Rate: 4.25 }
    ];
    
    resetFilters(testData);
    
    // Check if select elements were reset
    expect(document.getElementById('lenderSelect').selectedIndex).toBe(0);
    expect(document.getElementById('productTypeSelect').selectedIndex).toBe(0);
    expect(document.getElementById('productTermSelect').selectedIndex).toBe(0);
    expect(document.getElementById('premiumBandSelect').selectedIndex).toBe(0);
    
    // Check if input elements were reset
    expect(document.getElementById('ltvMinInput').value).toBe('');
    expect(document.getElementById('ltvMaxInput').value).toBe('');
    expect(document.getElementById('startDateInput').value).toBe('');
    expect(document.getElementById('endDateInput').value).toBe('');
    
    // Check if renderTable was called with original data
    expect(renderTable).toHaveBeenCalledWith(testData, 'dataTable');
  });
  
  test('should update results count element', () => {
    const testData = [
      { Provider: 'HSBC UK', Rate: 3.99 },
      { Provider: 'Barclays', Rate: 4.25 }
    ];
    
    resetFilters(testData);
    
    // Check if results count was updated
    const resultsCount = document.getElementById('resultsCount');
    expect(resultsCount.textContent).toBe('Showing all 2 products');
  });
  
  test('should handle null or undefined data', () => {
    resetFilters(null);
    expect(renderTable).not.toHaveBeenCalled();
    
    resetFilters(undefined);
    expect(renderTable).not.toHaveBeenCalled();
  });
});

describe('exportData', () => {
  beforeEach(() => {
    // Mock the CSV creation and download functionality
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock document.body.appendChild and removeChild
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    
    // Mock document.createElement and element methods
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn()
    };
    
    document.createElement = jest.fn().mockImplementation((tag) => {
      if (tag === 'a') return mockAnchor;
      return {};
    });
  });
  
  test('should export data to CSV file', () => {
    const testData = [
      { lender: 'HSBC UK', rate: '3.99%', ltv: '75%' },
      { lender: 'Barclays Bank UK PLC', rate: '4.25%', ltv: '90%' }
    ];
    
    exportData(testData, 'mortgage_data.csv');
    
    // Check if Blob was created with correct data
    expect(URL.createObjectURL).toHaveBeenCalled();
    
    // Check if anchor was created and clicked
    const anchor = document.createElement('a');
    expect(anchor.download).toBe('mortgage_data.csv');
    expect(anchor.click).toHaveBeenCalled();
    
    // Check if document methods were called
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
    
    // Check if URL was revoked
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
  
  test('should handle null or empty data', () => {
    exportData(null);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    
    exportData([]);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe('Helper Functions', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="testSelect">
        <option value="option1">Option 1</option>
        <option value="option2" selected>Option 2</option>
      </select>
      <select id="testMultiSelect" multiple>
        <option value="option1" selected>Option 1</option>
        <option value="option2" selected>Option 2</option>
        <option value="option3">Option 3</option>
      </select>
      <input id="testInput" value="42" />
    `;
  });
  
  test('getSelectValue should return selected value', () => {
    expect(getSelectValue('testSelect')).toBe('option2');
    expect(getSelectValue('nonExistentSelect')).toBeNull();
  });
  
  test('getMultiSelectValues should return array of selected values', () => {
    expect(getMultiSelectValues('testMultiSelect')).toEqual(['option1', 'option2']);
    expect(getMultiSelectValues('nonExistentSelect')).toBeNull();
  });
  
  test('getInputNumberValue should return numeric value', () => {
    expect(getInputNumberValue('testInput')).toBe(42);
    expect(getInputNumberValue('nonExistentInput')).toBeNull();
    
    // Test with non-numeric input
    document.getElementById('testInput').value = 'not a number';
    expect(getInputNumberValue('testInput')).toBeNull();
    
    // Test with empty input
    document.getElementById('testInput').value = '';
    expect(getInputNumberValue('testInput')).toBeNull();
  });
  
  test('resetSelect should set selectedIndex to 0', () => {
    resetSelect('testSelect');
    expect(document.getElementById('testSelect').selectedIndex).toBe(0);
    
    // Should not throw error for non-existent element
    expect(() => resetSelect('nonExistentSelect')).not.toThrow();
  });
  
  test('resetInput should clear value', () => {
    resetInput('testInput');
    expect(document.getElementById('testInput').value).toBe('');
    
    // Should not throw error for non-existent element
    expect(() => resetInput('nonExistentInput')).not.toThrow();
  });
});
