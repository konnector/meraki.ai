"use client"

import { createContext, useContext, useState, useCallback, type ReactNode, useRef, useEffect } from "react"
import { FormulaParser } from "@/lib/spreadsheet/FormulaParser"
import { useFormulaCalculation } from "@/hooks/useFormulaCalculation"
import {
  loadSpreadsheetData,
  loadSpreadsheetTitle,
  saveSpreadsheetData,
  saveSpreadsheetTitle
} from "@/lib/spreadsheet/storage"

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

export type Cells = {
  [key: string]: Cell
}

type CellPosition = {
  row: number
  col: number
}

type Selection = {
  start: { row: number; col: number }
  end: { row: number; col: number }
} | null

// For undo/redo functionality
type HistoryAction = {
  cells: Cells
  activeCell: string | null
  selection: Selection
}

type SpreadsheetContextType = {
  cells: Cells
  activeCell: string | null
  selection: Selection
  title: string
  setTitle: (title: string) => void
  updateCell: (cellId: string, value: string) => void
  updateCellFormat: (cellId: string, format: Partial<CellFormat>) => void
  updateMultipleCellsFormat: (cellIds: string[], format: Partial<CellFormat>) => void
  setActiveCell: (cellId: string | null) => void
  isCellFormula: (cellId: string) => boolean
  getCellError: (cellId: string) => string | undefined
  setSelection: (selection: Selection) => void
  copySelection: () => void
  cutSelection: () => void
  pasteSelection: () => void
  deleteSelection: () => void
  undo: () => void
  redo: () => void
  getCellId: (position: CellPosition) => string
  getCellPosition: (cellId: string) => CellPosition
  getSelectedCells: () => string[]
  getCellDisplayValue: (cellId: string) => string
}

const SpreadsheetContext = createContext<SpreadsheetContextType | null>(null)

export function useSpreadsheet() {
  const context = useContext(SpreadsheetContext)
  if (!context) {
    throw new Error("useSpreadsheet must be used within a SpreadsheetProvider")
  }
  return context
}

export function SpreadsheetProvider({ children }: { children: ReactNode }) {
  // Initialize state with empty values first
  const [cells, setCells] = useState<Cells>({});
  const [title, setTitle] = useState<string>("Untitled Spreadsheet");
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  
  // Load data from localStorage after mount
  useEffect(() => {
    setCells(loadSpreadsheetData());
    setTitle(loadSpreadsheetTitle());
  }, []);

  // For undo/redo functionality
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState<{cells: Cells, startCell: string} | null>(null);
  const isUndoRedoOperation = useRef(false);

  // Add formula calculation hook
  const { updateDependencies, calculateFormula, getAffectedCells } = useFormulaCalculation();

  // Save cells to localStorage whenever they change
  useEffect(() => {
    // Don't save initial empty state
    if (Object.keys(cells).length > 0) {
      saveSpreadsheetData(cells);
    }
  }, [cells]);

  // Save title to localStorage whenever it changes
  useEffect(() => {
    if (title !== "Untitled Spreadsheet") {
      saveSpreadsheetTitle(title);
    }
  }, [title]);

  // Wrap setTitle to handle both state and storage
  const handleSetTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (isUndoRedoOperation.current) {
      isUndoRedoOperation.current = false
      return
    }

    const currentState: HistoryAction = {
      cells: { ...cells },
      activeCell,
      selection
    }

    setHistory(prev => {
      // If we're not at the end of history, truncate it
      const newHistory = prev.slice(0, historyIndex + 1)
      return [...newHistory, currentState]
    })
    
    setHistoryIndex(prev => prev + 1)
  }, [cells, activeCell, selection, historyIndex])

  // Update cell with formula support
  const updateCell = useCallback((cellId: string, value: string) => {
    saveToHistory()
    
    setCells(prev => {
      const newCells = { ...prev }
      
      // Check if the value is a formula
      if (value.startsWith('=')) {
        try {
          // Parse the formula
          const formula = FormulaParser.parseFormula(value)
          if (!formula) {
            throw new Error('Invalid formula')
          }

          // Update dependencies
          updateDependencies(cellId, formula)

          // Calculate the formula value
          const getCellValue = (depCellId: string) => {
            const numValue = Number(newCells[depCellId]?.value || '0')
            if (isNaN(numValue)) {
              throw new Error(`Invalid number in cell ${depCellId}`)
            }
            return numValue
          }

          const { value: calculatedValue, error } = calculateFormula(formula, getCellValue)

          newCells[cellId] = {
            ...newCells[cellId],
            value: value,
            formula: value,
            calculatedValue,
            error
          }

          // Recalculate dependent cells
          const affectedCells = getAffectedCells(cellId)
          affectedCells.forEach(affectedCellId => {
            if (affectedCellId === cellId) return // Skip the current cell
            
            const affectedCell = newCells[affectedCellId]
            if (!affectedCell?.formula) return // Skip non-formula cells

            const affectedFormula = FormulaParser.parseFormula(affectedCell.formula)
            if (!affectedFormula) return

            try {
              const { value: newValue, error } = calculateFormula(affectedFormula, getCellValue)
              newCells[affectedCellId] = {
                ...affectedCell,
                calculatedValue: newValue,
                error
              }
            } catch (err) {
              newCells[affectedCellId] = {
                ...affectedCell,
                calculatedValue: '#ERROR!',
                error: err instanceof Error ? err.message : 'Calculation error'
              }
            }
          })
        } catch (err) {
          newCells[cellId] = {
            ...newCells[cellId],
            value: value,
            formula: value,
            calculatedValue: '#ERROR!',
            error: err instanceof Error ? err.message : 'Formula error'
          }
        }
      } else {
        // Regular value update
        newCells[cellId] = {
          ...newCells[cellId],
          value: value,
          formula: undefined,
          calculatedValue: undefined,
          error: undefined
        }

        // Recalculate dependent cells since this cell's value changed
        const affectedCells = getAffectedCells(cellId)
        affectedCells.forEach(affectedCellId => {
          const affectedCell = newCells[affectedCellId]
          if (!affectedCell?.formula) return

          const affectedFormula = FormulaParser.parseFormula(affectedCell.formula)
          if (!affectedFormula) return

          try {
            const getCellValue = (depCellId: string) => {
              const numValue = Number(newCells[depCellId]?.value || '0')
              if (isNaN(numValue)) {
                throw new Error(`Invalid number in cell ${depCellId}`)
              }
              return numValue
            }

            const { value: newValue, error } = calculateFormula(affectedFormula, getCellValue)
            newCells[affectedCellId] = {
              ...affectedCell,
              calculatedValue: newValue,
              error
            }
          } catch (err) {
            newCells[affectedCellId] = {
              ...affectedCell,
              calculatedValue: '#ERROR!',
              error: err instanceof Error ? err.message : 'Calculation error'
            }
          }
        })
      }
      
      return newCells
    })
  }, [saveToHistory, updateDependencies, calculateFormula, getAffectedCells])

  const updateCellFormat = useCallback((cellId: string, format: Partial<CellFormat>) => {
    saveToHistory()
    
    setCells(prev => ({
      ...prev,
      [cellId]: {
        ...prev[cellId],
        format: {
          ...prev[cellId]?.format,
          ...format
        }
      }
    }))
  }, [saveToHistory])

  const updateMultipleCellsFormat = useCallback((cellIds: string[], format: Partial<CellFormat>) => {
    saveToHistory()
    
    setCells(prev => {
      const newCells = { ...prev }
      
      cellIds.forEach(cellId => {
        newCells[cellId] = {
          ...newCells[cellId],
          format: {
            ...newCells[cellId]?.format,
            ...format
          }
        }
      })
      
      return newCells
    })
  }, [saveToHistory])

  const isCellFormula = useCallback((cellId: string) => {
    return cells[cellId]?.formula !== undefined && cells[cellId]?.formula.startsWith('=')
  }, [cells])

  const getCellError = useCallback((cellId: string) => {
    return cells[cellId]?.error
  }, [cells])

  // Get cellId from row and column position (e.g., A1, B2, etc.)
  const getCellId = useCallback((position: CellPosition) => {
    const column = String.fromCharCode(65 + position.col); // A, B, C, ...
    const row = position.row + 1; // 1-indexed for rows
    return `${column}${row}`;
  }, []);

  // Get row and column position from cellId (e.g., A1 -> {row: 0, col: 0})
  const getCellPosition = useCallback((cellId: string) => {
    const column = cellId.charAt(0);
    const row = cellId.substring(1);
    return {
      row: parseInt(row) - 1, // 0-indexed for internal use
      col: column.charCodeAt(0) - 65, // A=0, B=1, ...
    };
  }, []);

  // Get all cells within the current selection
  const getSelectedCells = useCallback(() => {
    if (!selection) return [];
    
    const startRow = Math.min(selection.start.row, selection.end.row);
    const endRow = Math.max(selection.start.row, selection.end.row);
    const startCol = Math.min(selection.start.col, selection.end.col);
    const endCol = Math.max(selection.start.col, selection.end.col);
    
    const selected: string[] = [];
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        selected.push(getCellId({ row, col }));
      }
    }
    
    return selected;
  }, [selection, getCellId]);

  // Get display value for a cell (calculated value for formulas, or raw value)
  const getCellDisplayValue = useCallback((cellId: string) => {
    if (isCellFormula(cellId)) {
      return cells[cellId]?.calculatedValue !== undefined 
        ? String(cells[cellId].calculatedValue) 
        : cells[cellId]?.error || '';
    }
    return cells[cellId]?.value || '';
  }, [cells, isCellFormula]);

  // Copy selected cells to clipboard
  const copySelection = useCallback(() => {
    if (!selection || !activeCell) return;
    
    const selectedCells = getSelectedCells();
    if (selectedCells.length === 0) return;
    
    const clipboardCells: Cells = {};
    
    selectedCells.forEach(cellId => {
      if (cells[cellId]) {
        clipboardCells[cellId] = { ...cells[cellId] };
      }
    });
    
    setClipboard({
      cells: clipboardCells,
      startCell: selectedCells[0]
    });
    
    // Also copy to system clipboard if possible
    if (navigator.clipboard && window.isSecureContext) {
      try {
        // Just a simple text representation for system clipboard
        const text = selectedCells.map(id => cells[id]?.value || '').join('\t');
        navigator.clipboard.writeText(text);
      } catch (error) {
        console.error('Failed to copy to system clipboard:', error);
      }
    }
    
    console.log('Copied cells to clipboard:', selectedCells);
  }, [selection, activeCell, cells, getSelectedCells]);

  // Cut selected cells (copy + delete)
  const cutSelection = useCallback(() => {
    if (!selection) return;
    
    // First copy
    copySelection();
    
    // Then delete
    saveToHistory();
    
    const selectedCells = getSelectedCells();
    setCells(prev => {
      const newCells = { ...prev };
      
      selectedCells.forEach(cellId => {
        if (newCells[cellId]) {
          newCells[cellId] = {
            ...newCells[cellId],
            value: '',
            formula: undefined,
            calculatedValue: undefined,
            error: undefined
          };
        }
      });
      
      return newCells;
    });
    
    console.log('Cut cells:', selectedCells);
  }, [selection, copySelection, getSelectedCells, saveToHistory]);

  // Paste from clipboard to current active cell
  const pasteSelection = useCallback(() => {
    if (!activeCell || !clipboard) return;
    
    saveToHistory();
    
    const targetPos = getCellPosition(activeCell);
    const sourcePos = getCellPosition(clipboard.startCell);
    
    // Calculate offsets
    const rowOffset = targetPos.row - sourcePos.row;
    const colOffset = targetPos.col - sourcePos.col;
    
    setCells(prev => {
      const newCells = { ...prev };
      
      // For each cell in clipboard
      Object.entries(clipboard.cells).forEach(([cellId, cellData]) => {
        const cellPos = getCellPosition(cellId);
        
        // Calculate new position
        const newRow = cellPos.row + rowOffset;
        const newCol = cellPos.col + colOffset;
        
        // Skip if out of bounds (typical grid is 0-99 rows, 0-25 cols)
        if (newRow < 0 || newRow > 99 || newCol < 0 || newCol > 25) {
          return;
        }
        
        const newCellId = getCellId({ row: newRow, col: newCol });
        
        // Copy data to new position
        newCells[newCellId] = {
          ...cellData,
          // Adjust formula references if needed (simplified, would need more complex logic for real formulas)
          formula: cellData.formula ? cellData.formula : undefined
        };
      });
      
      return newCells;
    });
    
    console.log('Pasted from clipboard');
  }, [activeCell, clipboard, getCellPosition, getCellId, saveToHistory]);

  // Delete content of selected cells
  const deleteSelection = useCallback(() => {
    if (!selection) return;
    
    saveToHistory();
    
    const selectedCells = getSelectedCells();
    
    setCells(prev => {
      const newCells = { ...prev };
      
      selectedCells.forEach(cellId => {
        if (newCells[cellId]) {
          newCells[cellId] = {
            ...newCells[cellId],
            value: '',
            formula: undefined,
            calculatedValue: undefined,
            error: undefined
          };
        } else {
          newCells[cellId] = { value: '' };
        }
      });
      
      return newCells;
    });
    
    console.log('Deleted selection:', selectedCells);
  }, [selection, getSelectedCells, saveToHistory]);

  // Undo last action
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoOperation.current = true
      
      const prevState = history[historyIndex - 1]
      setCells(prevState.cells)
      setActiveCell(prevState.activeCell)
      setSelection(prevState.selection)
      
      setHistoryIndex(prev => prev - 1)
      console.log('Undo operation')
    }
  }, [history, historyIndex])

  // Redo previously undone action
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoOperation.current = true
      
      const nextState = history[historyIndex + 1]
      setCells(nextState.cells)
      setActiveCell(nextState.activeCell)
      setSelection(nextState.selection)
      
      setHistoryIndex(prev => prev + 1)
      console.log('Redo operation')
    }
  }, [history, historyIndex])

  return (
    <SpreadsheetContext.Provider
      value={{
        cells,
        activeCell,
        selection,
        title,
        setTitle: handleSetTitle,
        updateCell,
        updateCellFormat,
        updateMultipleCellsFormat,
        setActiveCell,
        isCellFormula,
        getCellError,
        setSelection,
        copySelection,
        cutSelection,
        pasteSelection,
        deleteSelection,
        undo,
        redo,
        getCellId,
        getCellPosition,
        getSelectedCells,
        getCellDisplayValue
      }}
    >
      {children}
    </SpreadsheetContext.Provider>
  )
} 