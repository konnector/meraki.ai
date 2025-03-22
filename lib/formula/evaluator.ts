import { ASTNode, NodeType, ErrorNode, NumberNode, StringNode, CellReferenceNode, RangeNode, BinaryOperationNode, FunctionCallNode } from './parser';
import { getFunctionByName } from './functions';

// Custom error types
export enum FormulaErrorType {
  DIV_ZERO = '#DIV/0!',
  NAME = '#NAME?',
  VALUE = '#VALUE!',
  REF = '#REF!',
  NUM = '#NUM!',
  NA = '#N/A',
  ERROR = '#ERROR!'
}

// Interface to represent a cell's data
export interface CellData {
  value: string;
  formula?: string;
  calculatedValue?: any;
  error?: string;
}

// Interface for the spreadsheet grid data
export interface SpreadsheetData {
  [cellId: string]: CellData;
}

// Helper function to convert column letter to index (A -> 0, B -> 1, etc.)
export function columnLetterToIndex(column: string): number {
  let index = 0;
  const length = column.length;
  
  for (let i = 0; i < length; i++) {
    index = index * 26 + column.charCodeAt(i) - 64; // 'A' is ASCII 65
  }
  
  return index - 1; // Convert to 0-based index
}

// Helper function to convert column index to letter (0 -> A, 1 -> B, etc.)
export function columnIndexToLetter(index: number): string {
  let column = '';
  index += 1; // Convert to 1-based index
  
  while (index > 0) {
    const remainder = (index - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    index = Math.floor((index - 1) / 26);
  }
  
  return column;
}

// Helper function to get cell ID from row and column indices
export function getCellId(row: number, col: number): string {
  return `${columnIndexToLetter(col)}${row + 1}`;
}

// Helper function to get row and column indices from cell ID
export function getCellPosition(cellId: string): { row: number; col: number } {
  const match = cellId.match(/([A-Z]+)(\d+)/);
  if (!match) {
    throw new Error(`Invalid cell ID: ${cellId}`);
  }
  
  const colLetters = match[1];
  const rowIndex = parseInt(match[2], 10) - 1; // Convert to 0-based index
  
  return {
    row: rowIndex,
    col: columnLetterToIndex(colLetters)
  };
}

/**
 * Main evaluator class for formula expressions
 */
export class FormulaEvaluator {
  private spreadsheetData: SpreadsheetData;
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private currentEvaluatingCell: string | null = null;
  private evaluationStack: Set<string> = new Set();

  constructor(spreadsheetData: SpreadsheetData) {
    this.spreadsheetData = spreadsheetData;
  }

  /**
   * Add a dependency between cells
   */
  private addDependency(fromCell: string, toCell: string): void {
    if (!this.dependencyGraph.has(toCell)) {
      this.dependencyGraph.set(toCell, new Set());
    }
    
    this.dependencyGraph.get(toCell)!.add(fromCell);
    
    // Signal to recalculation engine about this dependency
    if (typeof window !== 'undefined') {
      // Get recalculation engine from formula instance
      const formulaInstance = (window as any)._formulaInstance;
      if (formulaInstance && formulaInstance.recalculationEngine) {
        formulaInstance.recalculationEngine.addDependency(fromCell, toCell);
      }
    }
  }

  /**
   * Get all cells that depend on the given cell
   */
  public getDependentCells(cellId: string): string[] {
    return this.dependencyGraph.has(cellId) 
      ? Array.from(this.dependencyGraph.get(cellId)!)
      : [];
  }

  /**
   * Check if there's a circular dependency
   */
  private checkCircularDependency(cellId: string, target: string, visited: Set<string> = new Set()): boolean {
    if (cellId === target) return true;
    if (visited.has(cellId)) return false;
    
    visited.add(cellId);
    
    const dependencies = this.dependencyGraph.get(cellId);
    if (!dependencies) return false;
    
    for (const dependency of dependencies) {
      if (this.checkCircularDependency(dependency, target, visited)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get value for a cell, taking into account formulas, cell references, etc.
   */
  public getCellValue(cellId: string): any {
    // Check for circular reference
    if (this.evaluationStack.has(cellId)) {
      return {
        error: FormulaErrorType.REF,
        message: 'Circular reference detected'
      };
    }
    
    // Add cell to evaluation stack to detect circular references
    this.evaluationStack.add(cellId);
    
    // If evaluating from within a specific cell, add dependency
    if (this.currentEvaluatingCell && this.currentEvaluatingCell !== cellId) {
      this.addDependency(this.currentEvaluatingCell, cellId);
    }
    
    // If cell doesn't exist, return 0 (default empty cell value)
    if (!this.spreadsheetData[cellId]) {
      this.evaluationStack.delete(cellId);
      return 0;
    }
    
    const cell = this.spreadsheetData[cellId];
    
    try {
      // If cell has a formula, evaluate it
      if (cell.formula) {
        console.log(`Cell ${cellId} contains formula: ${cell.formula}`);
        
        // Return calculated value if available
        if (cell.calculatedValue !== undefined) {
          this.evaluationStack.delete(cellId);
          return cell.calculatedValue;
        }
        
        console.log(`Evaluating formula for ${cellId}: ${cell.formula}`);
        
        // Store the evaluating cell to track dependencies
        const previousEvaluatingCell = this.currentEvaluatingCell;
        this.currentEvaluatingCell = cellId;
        
        // Evaluate the formula
        const result = this.evaluateFormula(cell.formula);
        
        // Restore the previous evaluating cell
        this.currentEvaluatingCell = previousEvaluatingCell;
        
        console.log(`Formula evaluation result for ${cellId}: ${result.error ? result.error : result.value}`);
        
        this.evaluationStack.delete(cellId);
        return result.error ? result : result.value;
      }
      
      // For numeric cells, convert to number
      if (!isNaN(Number(cell.value))) {
        console.log(`Cell ${cellId} contains numeric value: ${cell.value}`);
        this.evaluationStack.delete(cellId);
        return Number(cell.value);
      }
      
      // For other cells, return as is
      this.evaluationStack.delete(cellId);
      return cell.value;
    } catch (error) {
      // Make sure to always remove from evaluation stack even if error occurs
      this.evaluationStack.delete(cellId);
      throw error;
    }
  }

  /**
   * Main entry point to evaluate a formula
   */
  public evaluateFormula(formula: string): any {
    try {
      // Import parser dynamically to avoid circular dependencies
      const { parseFormula } = require('./parser');
      const ast = parseFormula(formula);
      
      // Evaluate the AST
      return this.evaluateNode(ast);
    } catch (error) {
      return {
        error: FormulaErrorType.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Evaluate a node in the AST
   */
  private evaluateNode(node: ASTNode): any {
    switch (node.type) {
      case NodeType.Number:
        return { value: (node as NumberNode).value };
        
      case NodeType.String:
        return { value: (node as StringNode).value };
        
      case NodeType.CellReference:
        return this.evaluateCellReference(node as CellReferenceNode);
        
      case NodeType.Range:
        return this.evaluateRange(node as RangeNode);
        
      case NodeType.BinaryOperation:
        return this.evaluateBinaryOperation(node as BinaryOperationNode);
        
      case NodeType.FunctionCall:
        return this.evaluateFunctionCall(node as FunctionCallNode);
        
      case NodeType.Error:
        return {
          error: FormulaErrorType.ERROR,
          message: (node as ErrorNode).message
        };
        
      default:
        return {
          error: FormulaErrorType.ERROR,
          message: `Unknown node type: ${node.type}`
        };
    }
  }

  /**
   * Evaluate a cell reference node
   */
  private evaluateCellReference(node: CellReferenceNode): any {
    const { column, row } = node;
    const colIndex = columnLetterToIndex(column);
    const cellId = getCellId(row - 1, colIndex); // row is 1-based in the node
    
    // Add dependency
    if (this.currentEvaluatingCell) {
      this.addDependency(this.currentEvaluatingCell, cellId);
    }
    
    return { value: this.getCellValue(cellId) };
  }

  /**
   * Evaluate a range node (e.g., A1:B5)
   */
  private evaluateRange(node: RangeNode): any {
    const startCell = node.start;
    const endCell = node.end;
    console.log(`Evaluating range from ${startCell.reference} to ${endCell.reference}`);
    
    const startColIndex = columnLetterToIndex(startCell.column);
    const endColIndex = columnLetterToIndex(endCell.column);
    const startRowIndex = startCell.row - 1; // Convert to 0-based
    const endRowIndex = endCell.row - 1; // Convert to 0-based
    
    // Calculate range bounds, handling cases where end < start
    const minRow = Math.min(startRowIndex, endRowIndex);
    const maxRow = Math.max(startRowIndex, endRowIndex);
    const minCol = Math.min(startColIndex, endColIndex);
    const maxCol = Math.max(startColIndex, endColIndex);
    
    console.log(`Range bounds: minRow=${minRow}, maxRow=${maxRow}, minCol=${minCol}, maxCol=${maxCol}`);
    
    // Build array of values in the range
    const values = [];
    
    for (let row = minRow; row <= maxRow; row++) {
      const rowValues = [];
      
      for (let col = minCol; col <= maxCol; col++) {
        const cellId = getCellId(row, col);
        console.log(`Processing cell ${cellId} in range`);
        
        // Add dependency
        if (this.currentEvaluatingCell) {
          this.addDependency(this.currentEvaluatingCell, cellId);
        }
        
        // Get the raw value and convert to number if possible
        const cellValue = this.getCellValue(cellId);
        console.log(`Cell ${cellId} value:`, cellValue);
        
        // For numeric strings, convert to numbers for calculations
        if (typeof cellValue === 'string' && !isNaN(Number(cellValue))) {
          const numValue = Number(cellValue);
          console.log(`Converted ${cellId} string value to number:`, numValue);
          rowValues.push(numValue);
        } else if (typeof cellValue === 'number') {
          rowValues.push(cellValue);
        } else {
          rowValues.push(cellValue || 0); // Push 0 for empty cells or null/undefined
        }
      }
      
      values.push(rowValues);
    }
    
    console.log(`Range evaluation result:`, values);
    return { value: values };
  }

  /**
   * Evaluate a binary operation node
   */
  private evaluateBinaryOperation(node: BinaryOperationNode): any {
    const left = this.evaluateNode(node.left);
    const right = this.evaluateNode(node.right);
    
    // Check for errors in operands
    if (left.error) return left;
    if (right.error) return right;
    
    // Check for numeric operands
    const leftValue = left.value;
    const rightValue = right.value;
    
    if (typeof leftValue !== 'number' || typeof rightValue !== 'number') {
      return {
        error: FormulaErrorType.VALUE,
        message: 'Binary operation requires numeric operands'
      };
    }
    
    // Perform the operation
    switch (node.operator) {
      case '+':
        return { value: leftValue + rightValue };
        
      case '-':
        return { value: leftValue - rightValue };
        
      case '*':
        return { value: leftValue * rightValue };
        
      case '/':
        if (rightValue === 0) {
          return { 
            error: FormulaErrorType.DIV_ZERO,
            message: 'Division by zero'
          };
        }
        return { value: leftValue / rightValue };
        
      case '^':
        return { value: Math.pow(leftValue, rightValue) };
        
      case '%':
        return { value: leftValue % rightValue };
        
      default:
        return {
          error: FormulaErrorType.ERROR,
          message: `Unknown operator: ${node.operator}`
        };
    }
  }

  /**
   * Evaluate a function call node
   */
  private evaluateFunctionCall(node: FunctionCallNode): any {
    const funcName = node.name;
    console.log(`Evaluating function: ${funcName} with arguments:`, node.arguments);
    const func = getFunctionByName(funcName);
    
    if (!func) {
      console.error(`Function not found: ${funcName}`);
      return {
        error: FormulaErrorType.NAME,
        message: `Unknown function: ${funcName}`
      };
    }
    
    // Evaluate function arguments
    const evaluatedArgs = [];
    
    for (const arg of node.arguments) {
      const evaluatedArg = this.evaluateNode(arg);
      console.log(`Argument evaluated:`, evaluatedArg);
      
      // If argument evaluation resulted in an error, propagate it
      if (evaluatedArg.error) {
        console.error(`Error evaluating argument:`, evaluatedArg.error);
        return evaluatedArg;
      }
      
      evaluatedArgs.push(evaluatedArg.value);
    }
    
    console.log(`Calling function ${funcName} with evaluatedArgs:`, evaluatedArgs);
    
    // Call the function with evaluated arguments
    try {
      const result = func(...evaluatedArgs);
      console.log(`Function ${funcName} result:`, result);
      return { value: result };
    } catch (error) {
      console.error(`Error in function ${funcName}:`, error);
      return {
        error: FormulaErrorType.ERROR,
        message: error instanceof Error ? error.message : 'Error in function call'
      };
    }
  }

  /**
   * Recalculate all cells that depend on the given cell
   */
  public recalculateDependents(cellId: string): void {
    const dependents = this.getDependentCells(cellId);
    
    for (const dependent of dependents) {
      const cell = this.spreadsheetData[dependent];
      
      if (cell && cell.formula) {
        // Clear cached calculated value
        delete cell.calculatedValue;
        delete cell.error;
        
        // Recalculate cell
        this.getCellValue(dependent);
        
        // Recursively recalculate cells that depend on this one
        this.recalculateDependents(dependent);
      }
    }
  }
} 