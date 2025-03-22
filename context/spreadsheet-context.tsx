"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { createFormulaEngine, FormulaEngine, SpreadsheetData as FormulaData } from "@/lib/formula"
import debounce from 'lodash/debounce'
import * as logger from '@/lib/logger'

// Maximum number of cells to update in a single operation to prevent freezing
const MAX_FORMULA_ITERATIONS = 100;
const FORMULA_UPDATE_DELAY = 300; // ms delay for debouncing

type CellFormat = {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  align?: "left" | "center" | "right"
  fontFamily?: string
  fontSize?: string
  type?: "text" | "number" | "formula"
  textColor?: string
  fillColor?: string
}

type Cell = {
  value: string
  formula?: string
  calculatedValue?: any
  error?: string
  format?: CellFormat
}

type Cells = {
  [key: string]: Cell
}

type CellPosition = {
  row: number
  col: number
}

type Selection = {
  start: CellPosition
  end: CellPosition
}

type ClipboardData = {
  cells: Cells
  selection: Selection
}

type SpreadsheetContextType = {
  cells: Cells
  activeCell: string | null
  selection: Selection | null
  clipboard: ClipboardData | null
  title: string
  setTitle: (title: string) => void
  updateCell: (cellId: string, value: string) => void
  updateCellFormat: (cellId: string, format: string, value: any) => void
  updateMultipleCellsFormat: (format: string, value: any) => void
  setActiveCell: (cellId: string | null) => void
  setSelection: (selection: Selection | null) => void
  copySelection: () => void
  cutSelection: () => void
  pasteSelection: () => void
  deleteSelection: () => void
  getCellId: (position: CellPosition) => string
  getCellPosition: (cellId: string) => CellPosition
  getSelectedCells: () => string[]
  // Formula-related methods
  isCellFormula: (cellId: string) => boolean
  getCellDisplayValue: (cellId: string) => string
  getCellError: (cellId: string) => string | undefined
  // Debug mode
  debugMode: boolean
  toggleDebugMode: () => void
}

const SpreadsheetContext = createContext<SpreadsheetContextType | undefined>(undefined)

export function SpreadsheetProvider({ children }: { children: ReactNode }) {
  const [cells, setCells] = useState<Cells>({})
  const [activeCell, setActiveCell] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null)
  const [title, setTitle] = useState<string>("Untitled Spreadsheet")
  const [debugMode, setDebugMode] = useState<boolean>(false)
  
  // Formula engine reference
  const formulaEngineRef = useRef<FormulaEngine | null>(null)
  
  // Initialize formula engine when component mounts
  useEffect(() => {
    logger.info(logger.LogCategory.FORMULA, 'Initializing formula engine');
    formulaEngineRef.current = createFormulaEngine(0);
  }, []);
  
  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => {
      const newValue = !prev;
      logger.setDebugMode(newValue);
      logger.info(`Debug mode ${newValue ? 'enabled' : 'disabled'}`);
      return newValue;
    });
  }, []);

  // Helper function to convert between cell ID (e.g., "A1") and position ({row: 0, col: 0})
  const getCellId = useCallback((position: CellPosition): string => {
    const colLetter = String.fromCharCode(65 + position.col)
    return `${colLetter}${position.row + 1}`
  }, []);

  const getCellPosition = useCallback((cellId: string): CellPosition => {
    const match = cellId.match(/([A-Z]+)(\d+)/)
    if (!match) return { row: 0, col: 0 }

    const colLetter = match[1]
    const rowNum = Number.parseInt(match[2])

    const col = colLetter.charCodeAt(0) - 65
    const row = rowNum - 1

    return { row, col }
  }, []);

  // Get all cell IDs in the current selection
  const getSelectedCells = useCallback((): string[] => {
    if (!selection) return activeCell ? [activeCell] : []

    const selectedCells: string[] = []
    const startRow = Math.min(selection.start.row, selection.end.row)
    const endRow = Math.max(selection.start.row, selection.end.row)
    const startCol = Math.min(selection.start.col, selection.end.col)
    const endCol = Math.max(selection.start.col, selection.end.col)

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        selectedCells.push(getCellId({ row, col }))
      }
    }

    return selectedCells
  }, [selection, activeCell, getCellId]);

  // Process formula - debounced to avoid excessive recalculations
  const processFormula = useCallback((cellId: string, formula: string) => {
    logger.debug(logger.LogCategory.FORMULA, `Processing formula for ${cellId}: ${formula}`);
    
    if (!formulaEngineRef.current) {
      logger.error(logger.LogCategory.FORMULA, 'Formula engine not initialized');
      return;
    }
    
    try {
      // Update the cell in the formula engine
      const updatedData = formulaEngineRef.current.updateCell(cellId, formula, true);
      
      // Get the calculated value from the updated data
      const calculatedValue = updatedData[cellId]?.calculatedValue;
      const error = updatedData[cellId]?.error;
      
      // Update the cell in the grid
      setCells(prev => ({
        ...prev,
        [cellId]: {
          ...prev[cellId],
          formula,
          calculatedValue,
          error,
          format: {
            ...prev[cellId]?.format,
            type: "formula"
          }
        }
      }));
      
      // Update any dependent cells that might have changed
      Object.entries(updatedData).forEach(([id, cellData]) => {
        // Skip the cell we just updated directly
        if (id === cellId) return;
        
        // Type assertion to access formula engine cell data
        const engineCell = cellData as { 
          value: string; 
          formula?: string; 
          calculatedValue?: any; 
          error?: string;
        };
        
        // Only update cells that have formulas
        if (engineCell.formula) {
          // Get the current UI cell state to merge with engine updates
          const currentCell = cells[id] || {};
          
          // Update the UI state for this dependent cell
          setCells(prev => ({
            ...prev,
            [id]: {
              ...currentCell,
              // Ensure formula is preserved
              formula: engineCell.formula,
              // Update with the new calculated value
              calculatedValue: engineCell.calculatedValue,
              error: engineCell.error,
              // Ensure format shows this is a formula
              format: {
                ...currentCell.format,
                type: "formula"
              }
            }
          }));
        }
      });
    } catch (error) {
      // Handle formula parsing errors
      logger.error(logger.LogCategory.FORMULA, `Error processing formula for ${cellId}:`, error);
      
      setCells(prev => ({
        ...prev,
        [cellId]: {
          ...prev[cellId],
          formula,
          error: '#ERROR!',
          format: {
            ...prev[cellId]?.format,
            type: "formula"
          }
        }
      }));
    }
  }, [cells]);
  
  // Debounce the formula calculation to avoid excessive recalculations
  const debouncedFormulaCalculation = useCallback(
    debounce(processFormula, 100),
    [processFormula]
  );

  // Update cell value
  const updateCell = useCallback((cellId: string, value: string) => {
    logger.debug(logger.LogCategory.STATE, `Updating cell ${cellId} with value: ${value}`);
    
    // Check if it's a formula (starts with '=')
    const isFormula = value.startsWith('=');
    
    // Create a batch update for all cells that need to change
    const cellUpdates: Cells = {};
    
    // Add the direct cell update first
    if (!cells[cellId]) {
      // Create a new cell
      cellUpdates[cellId] = {
        value: value,
        ...(isFormula && { 
          formula: value,
          format: { type: "formula" }
        })
      };
    } else {
      // Update existing cell
      if (isFormula) {
        // Formula cell
        cellUpdates[cellId] = {
          ...cells[cellId],
          value,
          formula: value,
          // Clear previous calculation results until recalculated
          calculatedValue: undefined,
          error: undefined,
          format: {
            ...cells[cellId]?.format,
            type: "formula"
          }
        };
      } else {
        // Regular cell - remove formula properties if they existed
        const { formula, calculatedValue, error, ...restCell } = cells[cellId];
        cellUpdates[cellId] = {
          ...restCell,
          value,
          format: {
            ...cells[cellId]?.format,
            type: cells[cellId]?.format?.type === "formula" ? undefined : cells[cellId]?.format?.type
          }
        };
      }
    }
    
    // First update with just the direct cell change - don't wait for formula calculation
    setCells(prev => ({
      ...prev,
      ...cellUpdates
    }));
    
    // Update formula engine with the new value regardless of whether it's a formula or not
    if (formulaEngineRef.current) {
      if (isFormula) {
        // Process formula with formula engine
        debouncedFormulaCalculation(cellId, value);
      } else {
        // Update non-formula cell value in the formula engine
        // This ensures the formula engine has access to the latest cell values
        const updatedData = formulaEngineRef.current.updateCell(cellId, value, false);
        
        // Find and update all cells that have been recalculated 
        const formulaUpdates: Cells = {};
        
        Object.entries(updatedData).forEach(([id, cellData]) => {
          // Skip the cell we just updated directly
          if (id === cellId) return;
          
          // Type assertion to access formula engine cell data
          const engineCell = cellData as { 
            value: string; 
            formula?: string; 
            calculatedValue?: any; 
            error?: string;
          };
          
          // Only update cells that have formulas
          if (engineCell.formula) {
            // Get the current UI cell state to merge with engine updates
            const currentCell = cells[id] || {};
            
            formulaUpdates[id] = {
              ...currentCell,
              // Ensure formula is preserved
              formula: engineCell.formula,
              // Update with the new calculated value
              calculatedValue: engineCell.calculatedValue,
              error: engineCell.error,
              // Ensure format shows this is a formula
              format: {
                ...currentCell.format,
                type: "formula"
              }
            };
          }
        });
        
        // Apply all formula updates in a single state update
        if (Object.keys(formulaUpdates).length > 0) {
          logger.debug(logger.LogCategory.STATE, 
            `Updating ${Object.keys(formulaUpdates).length} formula cells after changing ${cellId}`);
          
          setCells(prev => ({
            ...prev,
            ...formulaUpdates
          }));
        }
      }
    }
  }, [cells, debouncedFormulaCalculation]);

  const updateCellFormat = useCallback((cellId: string, format: string, value: any) => {
    setCells((prev) => ({
      ...prev,
      [cellId]: {
        ...prev[cellId],
        value: prev[cellId]?.value || "",
        format: {
          ...prev[cellId]?.format,
          [format]: value,
        },
      },
    }))
  }, []);

  // Update format for all cells in the current selection
  const updateMultipleCellsFormat = useCallback((format: string, value: any) => {
    const selectedCellIds = getSelectedCells()
    if (selectedCellIds.length === 0) return

    setCells((prev) => {
      const newCells = { ...prev }
      
      selectedCellIds.forEach((cellId) => {
        newCells[cellId] = {
          ...newCells[cellId],
          value: newCells[cellId]?.value || "",
          format: {
            ...newCells[cellId]?.format,
            [format]: value,
          },
        }
      })
      
      return newCells
    })
  }, [getSelectedCells]);

  // Copy the current selection to clipboard
  const copySelection = useCallback(() => {
    if (!selection) return;
    
    logger.debug(logger.LogCategory.UI, "Copying selection", selection);
    
    const selectedCellIds = getSelectedCells();
    const clipboardCells: Cells = {};
    
    selectedCellIds.forEach((cellId) => {
      if (cells[cellId]) {
        clipboardCells[cellId] = { ...cells[cellId] }
      }
    })

    setClipboard({
      cells: clipboardCells,
      selection: selection || {
        start: getCellPosition(activeCell!),
        end: getCellPosition(activeCell!),
      },
    })
  }, [selection, activeCell, cells, getSelectedCells, getCellPosition]);

  // Delete content from selected cells
  const deleteSelection = useCallback(() => {
    if (!selection && !activeCell) return

    const selectedCellIds = getSelectedCells()

    setCells((prev) => {
      const newCells = { ...prev }

      selectedCellIds.forEach((cellId) => {
        if (newCells[cellId]) {
          const { formula, calculatedValue, error, ...rest } = newCells[cellId];
          newCells[cellId] = {
            ...rest,
            value: "",
            format: {
              ...newCells[cellId].format,
              type: newCells[cellId].format?.type === "formula" ? undefined : newCells[cellId].format?.type
            }
          }
        }
      })

      return newCells
    })
  }, [selection, activeCell, getSelectedCells]);

  // Cut the current selection (copy and then clear)
  const cutSelection = useCallback(() => {
    if (!selection && !activeCell) return

    copySelection()
    deleteSelection()
  }, [selection, activeCell, copySelection, deleteSelection]);

  // Paste clipboard content to the current position
  const pasteSelection = useCallback(() => {
    if (!clipboard || !activeCell) return;
    
    logger.debug(logger.LogCategory.UI, "Pasting from clipboard at cell", activeCell);
    
    const targetPosition = selection ? selection.start : getCellPosition(activeCell!)
    const clipboardSize = {
      rows: Math.abs(clipboard.selection.end.row - clipboard.selection.start.row) + 1,
      cols: Math.abs(clipboard.selection.end.col - clipboard.selection.start.col) + 1,
    }

    const clipboardStartRow = Math.min(clipboard.selection.start.row, clipboard.selection.end.row)
    const clipboardStartCol = Math.min(clipboard.selection.start.col, clipboard.selection.end.col)

    setCells((prev) => {
      const newCells = { ...prev }

      // Map each cell in the clipboard to a new position
      Object.entries(clipboard.cells).forEach(([cellId, cell]) => {
        const position = getCellPosition(cellId)
        const relativeRow = position.row - clipboardStartRow
        const relativeCol = position.col - clipboardStartCol

        const newPosition = {
          row: targetPosition.row + relativeRow,
          col: targetPosition.col + relativeCol,
        }

        // Ensure we're not pasting outside the grid
        if (newPosition.row >= 0 && newPosition.row < 100 && newPosition.col >= 0 && newPosition.col < 26) {
          const newCellId = getCellId(newPosition)
          newCells[newCellId] = { ...cell }
        }
      })

      return newCells
    })
    
    // Recalculate formulas in the pasted content
    if (formulaEngineRef.current) {
      // Get all cells that were just pasted
      // This could be optimized to only recalculate formulas
      setTimeout(() => {
        Object.entries(clipboard.cells).forEach(([cellId, cell]) => {
          if (cell.formula) {
            const position = getCellPosition(cellId)
            const relativeRow = position.row - clipboardStartRow
            const relativeCol = position.col - clipboardStartCol
            
            const newPosition = {
              row: targetPosition.row + relativeRow,
              col: targetPosition.col + relativeCol,
            }
            
            if (newPosition.row >= 0 && newPosition.row < 100 && newPosition.col >= 0 && newPosition.col < 26) {
              const newCellId = getCellId(newPosition)
              updateCell(newCellId, cell.formula);
            }
          }
        });
      }, 0);
    }
  }, [clipboard, selection, activeCell, getCellPosition, getCellId, updateCell]);

  return (
    <SpreadsheetContext.Provider
      value={{
        cells,
        activeCell,
        selection,
        clipboard,
        title,
        setTitle,
        updateCell,
        updateCellFormat,
        updateMultipleCellsFormat,
        setActiveCell,
        setSelection,
        copySelection,
        cutSelection,
        pasteSelection,
        deleteSelection,
        getCellId,
        getCellPosition,
        getSelectedCells,
        isCellFormula: (cellId: string) => cells[cellId]?.formula !== undefined,
        getCellDisplayValue: (cellId: string) => {
          const cell = cells[cellId];
          if (!cell) return "";
          
          // If the cell has an error, display the error
          if (cell.error) {
            return cell.error;
          }
          
          // If it's a formula cell, return the calculated value
          if (cell.formula) {
            // If we have a calculated value, display it
            if (cell.calculatedValue !== undefined) {
              // Handle different types of values
              if (cell.calculatedValue === null) return "";
              if (typeof cell.calculatedValue === "object") {
                if (cell.calculatedValue.error) return cell.calculatedValue.error;
                if (Array.isArray(cell.calculatedValue)) {
                  const firstValue = cell.calculatedValue[0]?.[0];
                  return firstValue !== undefined ? String(firstValue) : "";
                }
              }
              return String(cell.calculatedValue);
            }
            
            // If showing formula in the cell, display the formula itself in the editor
            if (activeCell === cellId) {
              return cell.formula;
            }
            
            // If no calculated value yet, show placeholder
            return "Calculating...";
          }
          
          // For regular cells, just return the value
          return cell.value;
        },
        getCellError: (cellId: string) => cells[cellId]?.error,
        debugMode,
        toggleDebugMode,
      }}
    >
      {children}
    </SpreadsheetContext.Provider>
  )
}

export function useSpreadsheet() {
  const context = useContext(SpreadsheetContext)
  if (context === undefined) {
    throw new Error("useSpreadsheet must be used within a SpreadsheetProvider")
  }
  return context
}

