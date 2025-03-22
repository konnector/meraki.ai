/**
 * Spreadsheet formula function library
 * Contains implementations of common spreadsheet functions
 */

type FunctionType = (...args: any[]) => any;

// Registry of all available functions
const functions: Record<string, FunctionType> = {};

/**
 * Register a function in the library
 */
function registerFunction(name: string, func: FunctionType): void {
  functions[name.toUpperCase()] = func;
}

/**
 * Get a function by name
 */
export function getFunctionByName(name: string): FunctionType | undefined {
  // Always convert function name to uppercase for case insensitive lookup
  const upperName = name.toUpperCase();
  if (functions[upperName]) {
    console.log(`Function found: ${upperName}`);
  } else {
    console.log(`Function not found: ${upperName}, available functions: ${Object.keys(functions)}`);
  }
  return functions[upperName];
}

/**
 * Get all available function names
 */
export function getAllFunctionNames(): string[] {
  return Object.keys(functions);
}

// Helper to ensure arguments are numbers
function ensureNumbers(args: any[]): number[] {
  console.log('ensureNumbers input:', args);
  
  const result = args.map(arg => {
    // Handle nested arrays (from ranges)
    if (Array.isArray(arg)) {
      // Flatten nested arrays - recursively ensure all elements are numbers
      return ensureNumbers(arg.flat());
    }
    
    if (typeof arg === 'number') return arg;
    if (typeof arg === 'string') {
      const num = Number(arg);
      if (!isNaN(num)) return num;
    }
    
    return 0; // Default for non-numeric values
  }).flat();
  
  console.log('ensureNumbers output:', result);
  return result;
}

// Helper to check if value is numeric
function isNumeric(value: any): boolean {
  if (typeof value === 'number') return true;
  if (typeof value === 'string') {
    return !isNaN(Number(value));
  }
  return false;
}

// Helper for flattening arrays (for range arguments)
function flattenArray(arr: any[]): any[] {
  console.log('Flattening array:', arr);
  // Use Infinity to flatten all levels of nesting
  const result = arr.flat(Infinity);
  console.log('Flattened result:', result);
  return result;
}

// Mathematical Functions

// SUM: Sum of values
registerFunction('SUM', (...args: any[]): number => {
  console.log('SUM function called with args:', args);
  
  // Ensure all nested arrays are flattened and converted to numbers
  const flatArgs = args.map(arg => {
    if (Array.isArray(arg)) {
      return flattenArray(arg);
    }
    return arg;
  });
  
  // Convert to numbers and sum
  const nums = ensureNumbers(flatArgs.flat());
  console.log('SUM: numbers to sum:', nums);
  
  const result = nums.reduce((sum, val) => sum + val, 0);
  console.log('SUM result:', result);
  
  return result;
});

// AVERAGE: Average of values
registerFunction('AVERAGE', (...args: any[]): number => {
  const nums = ensureNumbers(args);
  if (nums.length === 0) return 0;
  return nums.reduce((sum, val) => sum + val, 0) / nums.length;
});

// COUNT: Count of numeric values
registerFunction('COUNT', (...args: any[]): number => {
  const flat = flattenArray(args);
  return flat.filter(isNumeric).length;
});

// COUNTA: Count of non-empty values
registerFunction('COUNTA', (...args: any[]): number => {
  const flat = flattenArray(args);
  return flat.filter(val => val !== null && val !== undefined && val !== '').length;
});

// MAX: Maximum value
registerFunction('MAX', (...args: any[]): number => {
  const nums = ensureNumbers(args);
  if (nums.length === 0) return 0;
  return Math.max(...nums);
});

// MIN: Minimum value
registerFunction('MIN', (...args: any[]): number => {
  const nums = ensureNumbers(args);
  if (nums.length === 0) return 0;
  return Math.min(...nums);
});

// PRODUCT: Product of values
registerFunction('PRODUCT', (...args: any[]): number => {
  const nums = ensureNumbers(args);
  return nums.reduce((product, val) => product * val, 1);
});

// ABS: Absolute value
registerFunction('ABS', (num: any): number => {
  if (!isNumeric(num)) return 0;
  return Math.abs(Number(num));
});

// ROUND: Round to specified number of digits
registerFunction('ROUND', (num: any, digits: any = 0): number => {
  if (!isNumeric(num) || !isNumeric(digits)) return 0;
  const factor = Math.pow(10, Number(digits));
  return Math.round(Number(num) * factor) / factor;
});

// FLOOR: Round down to the nearest multiple
registerFunction('FLOOR', (num: any, multiple: any = 1): number => {
  if (!isNumeric(num) || !isNumeric(multiple)) return 0;
  return Math.floor(Number(num) / Number(multiple)) * Number(multiple);
});

// CEILING: Round up to the nearest multiple
registerFunction('CEILING', (num: any, multiple: any = 1): number => {
  if (!isNumeric(num) || !isNumeric(multiple)) return 0;
  return Math.ceil(Number(num) / Number(multiple)) * Number(multiple);
});

// Logical Functions

// IF: Conditional logic
registerFunction('IF', (condition: any, trueValue: any, falseValue: any): any => {
  return condition ? trueValue : falseValue;
});

// AND: Logical AND
registerFunction('AND', (...args: any[]): boolean => {
  const flat = flattenArray(args);
  return flat.every(Boolean);
});

// OR: Logical OR
registerFunction('OR', (...args: any[]): boolean => {
  const flat = flattenArray(args);
  return flat.some(Boolean);
});

// NOT: Logical NOT
registerFunction('NOT', (value: any): boolean => {
  return !value;
});

// Text Functions

// CONCATENATE: Join strings
registerFunction('CONCATENATE', (...args: any[]): string => {
  const flat = flattenArray(args);
  return flat.join('');
});

// LEFT: Extract characters from the start
registerFunction('LEFT', (text: any, numChars: any = 1): string => {
  if (typeof text !== 'string') text = String(text);
  return text.substring(0, Number(numChars));
});

// RIGHT: Extract characters from the end
registerFunction('RIGHT', (text: any, numChars: any = 1): string => {
  if (typeof text !== 'string') text = String(text);
  return text.substring(text.length - Number(numChars));
});

// MID: Extract characters from the middle
registerFunction('MID', (text: any, start: any, numChars: any): string => {
  if (typeof text !== 'string') text = String(text);
  return text.substring(Number(start) - 1, Number(start) - 1 + Number(numChars));
});

// LEN: Length of text
registerFunction('LEN', (text: any): number => {
  if (typeof text !== 'string') text = String(text);
  return text.length;
});

// UPPER: Convert to uppercase
registerFunction('UPPER', (text: any): string => {
  if (typeof text !== 'string') text = String(text);
  return text.toUpperCase();
});

// LOWER: Convert to lowercase
registerFunction('LOWER', (text: any): string => {
  if (typeof text !== 'string') text = String(text);
  return text.toLowerCase();
});

// TRIM: Remove leading and trailing spaces
registerFunction('TRIM', (text: any): string => {
  if (typeof text !== 'string') text = String(text);
  return text.trim();
});

// Date Functions

// NOW: Current date and time
registerFunction('NOW', (): Date => {
  return new Date();
});

// TODAY: Current date
registerFunction('TODAY', (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
});

// Lookup Functions

// VLOOKUP: Vertical lookup
registerFunction('VLOOKUP', (lookupValue: any, tableRange: any[], colIndex: any, exactMatch: any = false): any => {
  if (!Array.isArray(tableRange) || tableRange.length === 0) {
    return null;
  }
  
  const col = Number(colIndex) - 1;
  
  // Find the matching row
  for (const row of tableRange) {
    if (!Array.isArray(row)) continue;
    
    const firstCell = row[0];
    if (exactMatch ? firstCell === lookupValue : String(firstCell).includes(String(lookupValue))) {
      return row[col] || null;
    }
  }
  
  return null;
});

// HLOOKUP: Horizontal lookup
registerFunction('HLOOKUP', (lookupValue: any, tableRange: any[], rowIndex: any, exactMatch: any = false): any => {
  if (!Array.isArray(tableRange) || tableRange.length === 0) {
    return null;
  }
  
  const row = Number(rowIndex) - 1;
  if (row >= tableRange.length) return null;
  
  // Find the matching column in the first row
  const headerRow = tableRange[0];
  if (!Array.isArray(headerRow)) return null;
  
  // Find the column index
  let colIndex = -1;
  for (let i = 0; i < headerRow.length; i++) {
    if (exactMatch ? headerRow[i] === lookupValue : String(headerRow[i]).includes(String(lookupValue))) {
      colIndex = i;
      break;
    }
  }
  
  if (colIndex === -1) return null;
  
  // Return the value in the found column at the specified row
  return tableRange[row][colIndex] || null;
});

// MATCH: Find position in a range
registerFunction('MATCH', (lookupValue: any, lookupArray: any[], matchType: any = 1): number | null => {
  if (!Array.isArray(lookupArray)) {
    return null;
  }
  
  // Flatten the array if it's multi-dimensional
  const flat = flattenArray(lookupArray);
  
  // Exact match (matchType = 0)
  if (Number(matchType) === 0) {
    const index = flat.findIndex(cell => cell === lookupValue);
    return index >= 0 ? index + 1 : null; // 1-based index for spreadsheet functions
  }
  
  // Less than match (matchType = 1), assumes sorted ascending
  if (Number(matchType) === 1) {
    let lastIndex = null;
    for (let i = 0; i < flat.length; i++) {
      if (flat[i] > lookupValue) break;
      lastIndex = i + 1; // 1-based index
    }
    return lastIndex;
  }
  
  // Greater than match (matchType = -1), assumes sorted descending
  if (Number(matchType) === -1) {
    let lastIndex = null;
    for (let i = 0; i < flat.length; i++) {
      if (flat[i] < lookupValue) break;
      lastIndex = i + 1; // 1-based index
    }
    return lastIndex;
  }
  
  return null;
});

// INDEX: Get value at a specified position in a range
registerFunction('INDEX', (range: any[], row: any, col: any = 1): any => {
  if (!Array.isArray(range)) return null;
  
  // Handle 1D array
  if (!Array.isArray(range[0])) {
    const rowIndex = Number(row) - 1;
    return range[rowIndex] || null;
  }
  
  // Handle 2D array
  const rowIndex = Number(row) - 1;
  const colIndex = Number(col) - 1;
  
  if (rowIndex < 0 || rowIndex >= range.length) return null;
  if (colIndex < 0 || colIndex >= range[rowIndex].length) return null;
  
  return range[rowIndex][colIndex];
});

// Export the functions object for testing
export const allFunctions = functions; 