import { DependencyGraph } from './dependencies';
import { FormulaEvaluator, SpreadsheetData, getCellId } from './evaluator';

/**
 * RecalculationEngine manages the recalculation of formulas when cell values change
 */
export class RecalculationEngine {
  private dependencyGraph: DependencyGraph;
  private evaluator: FormulaEvaluator;
  private spreadsheetData: SpreadsheetData;
  private isRecalculating: boolean = false;
  private pendingRecalculations: Set<string> = new Set();
  private cache: Map<string, { value: any; timestamp: number }> = new Map();
  private CACHE_TTL = 5000; // Cache time-to-live in ms

  constructor(spreadsheetData: SpreadsheetData) {
    this.spreadsheetData = spreadsheetData;
    this.dependencyGraph = new DependencyGraph();
    this.evaluator = new FormulaEvaluator(spreadsheetData);
    console.log("RecalculationEngine initialized");
  }

  /**
   * Update a cell's value and recalculate all dependent cells
   * @param cellId ID of the cell being updated
   * @param value New value for the cell
   * @param isFormula Whether the value is a formula
   * @returns Updated spreadsheet data
   */
  public updateCell(cellId: string, value: string, isFormula: boolean = false): SpreadsheetData {
    console.log(`RecalculationEngine.updateCell: ${cellId} = ${value} (isFormula: ${isFormula})`);
    
    // Clear any existing dependencies for this cell
    this.dependencyGraph.clearDependencies(cellId);
    
    // Clear cache for this cell and its dependents
    this.clearCacheForCell(cellId);
    
    // Update the cell's value
    if (!this.spreadsheetData[cellId]) {
      this.spreadsheetData[cellId] = { value: '' };
    }
    
    // Keep the formula value in both value and formula fields
    this.spreadsheetData[cellId].value = value;
    
    // Set or clear formula
    if (isFormula) {
      this.spreadsheetData[cellId].formula = value;
      delete this.spreadsheetData[cellId].calculatedValue;
      delete this.spreadsheetData[cellId].error;
    } else {
      delete this.spreadsheetData[cellId].formula;
      delete this.spreadsheetData[cellId].calculatedValue;
      delete this.spreadsheetData[cellId].error;
    }
    
    // Recalculate this cell first
    this.recalculateCell(cellId);
    
    // Get all formula cells that depend on this cell
    const dependents = this.dependencyGraph.getDependents(cellId);
    
    // Recalculate each dependent formula cell
    for (const dependent of dependents) {
      if (this.spreadsheetData[dependent]?.formula) {
        // Clear any cached value before recalculation
        delete this.spreadsheetData[dependent].calculatedValue;
        delete this.spreadsheetData[dependent].error;
        
        // Recalculate the dependent cell
        this.recalculateCell(dependent);
      }
    }
    
    return this.spreadsheetData;
  }

  /**
   * Clear cache for a cell and its dependents
   */
  private clearCacheForCell(cellId: string) {
    this.cache.delete(cellId);
    const dependents = this.dependencyGraph.getDependents(cellId);
    for (const dependent of dependents) {
      this.cache.delete(dependent);
    }
  }

  /**
   * Get cached value for a cell if available and not expired
   */
  private getCachedValue(cellId: string): any | undefined {
    const cached = this.cache.get(cellId);
    if (!cached) return undefined;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(cellId);
      return undefined;
    }

    return cached.value;
  }

  /**
   * Set cached value for a cell
   */
  private setCachedValue(cellId: string, value: any) {
    this.cache.set(cellId, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Recalculate a cell's value and its dependents
   */
  private recalculateCell(cellId: string) {
    console.time(`Recalculate ${cellId}`);
    // Prevent circular recalculation
    if (this.isRecalculating) {
      this.pendingRecalculations.add(cellId);
      return;
    }

    this.isRecalculating = true;
    const cellsToUpdate = new Set([cellId]);
    const processed = new Set<string>();

    try {
      while (cellsToUpdate.size > 0) {
        const currentCellId = cellsToUpdate.values().next().value;
        if (!currentCellId) continue; // Skip if undefined
        
        cellsToUpdate.delete(currentCellId);

        if (processed.has(currentCellId)) continue;
        processed.add(currentCellId);

        const cell = this.spreadsheetData[currentCellId];
        if (!cell?.formula) continue;

        // Check cache first
        const cachedValue = this.getCachedValue(currentCellId);
        if (cachedValue !== undefined) {
          cell.calculatedValue = cachedValue;
          continue;
        }

        try {
          // Calculate new value
          const result = this.evaluator.evaluateFormula(cell.formula);
          
          if (result.error) {
            cell.error = result.error;
            cell.calculatedValue = result;
          } else {
            cell.calculatedValue = result.value;
            delete cell.error;
          }

          // Cache the result
          this.setCachedValue(currentCellId, cell.calculatedValue);

          // Add dependents to update queue
          const dependents = this.dependencyGraph.getDependents(currentCellId);
          for (const dependent of dependents) {
            if (!processed.has(dependent)) {
              cellsToUpdate.add(dependent);
            }
          }
        } catch (error) {
          console.error(`Error calculating ${currentCellId}:`, error);
          cell.error = 'ERROR';
          cell.calculatedValue = {
            error: 'ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    } finally {
      this.isRecalculating = false;

      // Process any pending recalculations
      if (this.pendingRecalculations.size > 0) {
        const pending = Array.from(this.pendingRecalculations);
        this.pendingRecalculations.clear();
        for (const cellId of pending) {
          this.recalculateCell(cellId);
        }
      }
    }

    // Log any formula errors
    if (this.spreadsheetData[cellId]?.error) {
      console.error(`Formula error in ${cellId}:`, this.spreadsheetData[cellId].error);
    }
    
    console.timeEnd(`Recalculate ${cellId}`);
  }

  /**
   * Add a dependency between cells
   * @param fromCell Cell that depends on the other cell
   * @param toCell Cell that is depended on
   */
  public addDependency(fromCell: string, toCell: string): void {
    // Check for circular dependencies
    if (this.dependencyGraph.wouldCreateCircularDependency(fromCell, toCell)) {
      throw new Error(`Circular reference detected between ${fromCell} and ${toCell}`);
    }
    
    // Add the dependency
    this.dependencyGraph.addDependency(fromCell, toCell);
  }

  /**
   * Get the value of a cell
   * @param cellId ID of the cell to get the value for
   * @returns The cell's value (calculated if it has a formula)
   */
  public getCellValue(cellId: string): any {
    // Get from cache if available
    const cachedValue = this.getCachedValue(cellId);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    console.time(`Evaluate ${cellId}`);
    
    const cell = this.spreadsheetData[cellId];
    
    // If cell doesn't exist, return 0 (default empty cell value)
    if (!cell) {
      return 0;
    }
    
    // If cell has a formula, return the calculated value
    if (cell.formula) {
      // If already calculated, return the cached value
      if (cell.calculatedValue !== undefined) {
        return cell.calculatedValue;
      }
      
      // Calculate the value (will be cached in the cell)
      this.recalculateCell(cellId);
      return cell.calculatedValue;
    }
    
    // For regular cells (no formula), convert to number if possible
    if (!isNaN(Number(cell.value))) {
      return Number(cell.value);
    }
    
    // Otherwise, return as string
    return cell.value;
  }

  /**
   * Get the raw value of a cell (formula string if it's a formula)
   * @param cellId ID of the cell to get the raw value for
   * @returns The cell's raw value
   */
  public getCellRawValue(cellId: string): string {
    const cell = this.spreadsheetData[cellId];
    return cell ? cell.value : '';
  }

  /**
   * Get the displayed value of a cell (calculation result if it's a formula)
   * @param cellId ID of the cell to get the displayed value for
   * @returns The cell's displayed value
   */
  public getCellDisplayValue(cellId: string): string {
    const cell = this.spreadsheetData[cellId];
    
    // If cell doesn't exist, return empty string
    if (!cell) {
      return '';
    }
    
    // If cell has an error, return the error message
    if (cell.error) {
      return cell.error;
    }
    
    // If cell has a formula, return the calculated value as string
    if (cell.formula) {
      const value = cell.calculatedValue !== undefined ? cell.calculatedValue : this.getCellValue(cellId);
      
      // Handle different types of calculated values
      if (value === null || value === undefined) {
        return '';
      }
      
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      
      if (Array.isArray(value)) {
        return value[0][0] !== undefined ? String(value[0][0]) : '';
      }
      
      if (typeof value === 'object' && value.error) {
        return value.error;
      }
      
      return String(value);
    }
    
    // For regular cells, return the value as is
    return cell.value;
  }

  /**
   * Check if a cell has a formula
   * @param cellId ID of the cell to check
   * @returns True if the cell has a formula
   */
  public cellHasFormula(cellId: string): boolean {
    const cell = this.spreadsheetData[cellId];
    return cell && cell.formula !== undefined;
  }

  /**
   * Check if a cell has an error
   * @param cellId ID of the cell to check
   * @returns True if the cell has an error
   */
  public cellHasError(cellId: string): boolean {
    const cell = this.spreadsheetData[cellId];
    return cell && cell.error !== undefined;
  }

  /**
   * Get a cell's error message
   * @param cellId ID of the cell to get the error for
   * @returns The cell's error message, or undefined if no error
   */
  public getCellError(cellId: string): string | undefined {
    const cell = this.spreadsheetData[cellId];
    return cell ? cell.error : undefined;
  }

  /**
   * Debug function to get the dependency graph
   * @returns The dependency graph
   */
  public getDependencyGraph(): DependencyGraph {
    return this.dependencyGraph;
  }

  /**
   * Get the current spreadsheet data
   * @returns The current spreadsheet data
   */
  public getSpreadsheetData(): SpreadsheetData {
    return this.spreadsheetData;
  }
} 