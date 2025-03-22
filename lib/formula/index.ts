/**
 * Formula system for spreadsheet calculations
 * This module exports all the components needed for formula evaluation
 */

// Import for the create function
import { SpreadsheetData } from './evaluator';
import { RecalculationEngine } from './recalculation';
import { parseFormula } from './parser';
import * as logger from '../logger';

// Export parser components
export {
  TokenType,
  NodeType,
  FormulaLexer,
  FormulaParser,
  parseFormula,
  type ASTNode,
  type Token,
  type NumberNode,
  type StringNode,
  type CellReferenceNode,
  type RangeNode,
  type BinaryOperationNode,
  type FunctionCallNode,
  type ErrorNode
} from './parser';

// Export evaluator components
export {
  FormulaErrorType,
  FormulaEvaluator,
  columnLetterToIndex,
  columnIndexToLetter,
  getCellId,
  getCellPosition,
  type CellData,
  type SpreadsheetData
} from './evaluator';

// Export function library
export {
  getFunctionByName,
  getAllFunctionNames,
  allFunctions
} from './functions';

// Export dependency tracking
export {
  DependencyGraph
} from './dependencies';

// Export recalculation engine
export {
  RecalculationEngine
} from './recalculation';

/**
 * Main formula engine class for spreadsheet formulas
 */
export class FormulaEngine {
  private spreadsheetData: SpreadsheetData = {};
  public recalculationEngine: RecalculationEngine;

  constructor(initialCellCount: number = 0) {
    logger.debug(logger.LogCategory.FORMULA, 'Creating formula engine', { initialCellCount });
    this.recalculationEngine = new RecalculationEngine(this.spreadsheetData);
    
    // Make the formula engine instance globally available for dependency tracking
    if (typeof window !== 'undefined') {
      (window as any)._formulaInstance = this;
    }
  }

  /**
   * Parse and evaluate a formula
   */
  public evaluateFormula(formula: string): any {
    try {
      // Use the correct method from recalculationEngine for evaluating formulas
      return this.recalculationEngine.updateCell('__temp__', formula, true).__temp__?.calculatedValue;
    } catch (error) {
      console.error('Error evaluating formula:', error);
      return { error: '#ERROR!', message: (error as Error).message };
    }
  }

  /**
   * Update a cell's value
   */
  public updateCell(cellId: string, value: string, isFormula: boolean = false): SpreadsheetData {
    return this.recalculationEngine.updateCell(cellId, value, isFormula);
  }

  /**
   * Get the current spreadsheet data
   */
  public getSpreadsheetData(): SpreadsheetData {
    return this.spreadsheetData;
  }
}

/**
 * Create a new formula engine instance
 */
export function createFormulaEngine(initialCellCount: number = 0): FormulaEngine {
  const engine = new FormulaEngine(initialCellCount);
  logger.debug(logger.LogCategory.FORMULA, 'Formula engine created successfully');
  return engine;
} 