"use client"

import { useRef, useState, useEffect, useMemo, useCallback, type MouseEvent, type KeyboardEvent, type ChangeEvent } from "react"
import { cn } from "@/lib/utils"
import { useSpreadsheet } from "@/context/spreadsheet-context"
import Cell from './Cell'
import { useVirtualizer } from '@tanstack/react-virtual'

// Constants for better maintainability
const COLUMN_WIDTH = 100
const ROW_HEIGHT = 32 // Updated to match actual cell height
const HEADER_HEIGHT = 40
const HEADER_WIDTH = 40
const NUM_COLUMNS = 26
const NUM_ROWS = 100

// Add global styles to prevent text selection during cell selection
const preventSelectionStyle = {
  WebkitUserSelect: 'none',
  MozUserSelect: 'none',
  msUserSelect: 'none',
  userSelect: 'none'
} as const

export default function SpreadsheetGrid() {
  const {
    cells,
    updateCell,
    activeCell,
    setActiveCell,
    selection,
    setSelection,
    copySelection,
    cutSelection,
    pasteSelection,
    deleteSelection,
    getCellId,
    getCellPosition,
    getSelectedCells,
    getCellDisplayValue,
    isCellFormula,
    undo,
    redo,
  } = useSpreadsheet()

  const gridRef = useRef<HTMLDivElement>(null)
  const [editValue, setEditValue] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null)
  const [mouseDownStartPos, setMouseDownStartPos] = useState<{ x: number; y: number } | null>(null)

  // Setup virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: NUM_ROWS,
    getScrollElement: () => gridRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  })

  // Setup virtualizer for columns
  const columnVirtualizer = useVirtualizer({
    count: NUM_COLUMNS,
    getScrollElement: () => gridRef.current,
    horizontal: true,
    estimateSize: () => COLUMN_WIDTH,
    overscan: 2,
  })

  // Memoize static arrays to prevent recreation on each render
  const columnHeaders = useMemo(() => 
    Array.from({ length: NUM_COLUMNS }, (_, i) => String.fromCharCode(65 + i))
  , [])

  const rowHeaders = useMemo(() => 
    Array.from({ length: NUM_ROWS }, (_, i) => i + 1)
  , [])

  // Prevent default browser text selection behavior
  useEffect(() => {
    const preventDefaultSelection = (e: MouseEvent) => {
      if (isSelecting) {
        e.preventDefault()
      }
    }

    // Apply to document to catch all selection attempts
    document.addEventListener('selectstart', preventDefaultSelection as any)
    return () => {
      document.removeEventListener('selectstart', preventDefaultSelection as any)
    }
  }, [isSelecting])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Ignore if we're editing a cell
      if (isEditing) return;

      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
      if ((e.ctrlKey || e.metaKey) && (
        (e.key.toLowerCase() === 'y' && !e.shiftKey) ||
        (e.key.toLowerCase() === 'z' && e.shiftKey)
      )) {
        e.preventDefault();
        redo();
      }

      // Copy: Ctrl/Cmd + C
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelection();
      }

      // Cut: Ctrl/Cmd + X
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        cutSelection();
      }

      // Paste: Ctrl/Cmd + V
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteSelection();
      }

      // Delete: Delete key
      if (e.key === 'Delete') {
        e.preventDefault();
        deleteSelection();
      }

      // Select All: Ctrl/Cmd + A
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelection({
          start: { row: 0, col: 0 },
          end: { row: 99, col: 25 }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, undo, redo, copySelection, cutSelection, pasteSelection, deleteSelection, setSelection]);

  // Memoize event handlers for better performance
  const handleColumnHeaderClick = useCallback((colIndex: number, e: MouseEvent) => {
    e.preventDefault()
    
    // If shift is held, extend the current selection
    if (e.shiftKey && selection) {
      const currentColStart = Math.min(selection.start.col, selection.end.col)
      const currentColEnd = Math.max(selection.start.col, selection.end.col)
      
      // Determine how to extend the selection
      if (colIndex < currentColStart) {
        // Extend to the left
        setSelection({
          start: { row: 0, col: colIndex },
          end: { row: 99, col: currentColEnd }
        })
      } else if (colIndex > currentColEnd) {
        // Extend to the right
        setSelection({
          start: { row: 0, col: currentColStart },
          end: { row: 99, col: colIndex }
        })
      } else {
        // Click is within current selection, so don't change
        return
      }
    } else {
      // Select the entire column
      setSelection({
        start: { row: 0, col: colIndex },
        end: { row: 99, col: colIndex }
      })
    }
    
    // Set the active cell to the top of the column
    setActiveCell(getCellId({ row: 0, col: colIndex }) || "")
  }, [selection, setSelection, setActiveCell, getCellId])
  
  const handleRowHeaderClick = useCallback((rowIndex: number, e: MouseEvent) => {
    e.preventDefault()
    
    // If shift is held, extend the current selection
    if (e.shiftKey && selection) {
      const currentRowStart = Math.min(selection.start.row, selection.end.row)
      const currentRowEnd = Math.max(selection.start.row, selection.end.row)
      
      // Determine how to extend the selection
      if (rowIndex < currentRowStart) {
        // Extend upward
        setSelection({
          start: { row: rowIndex, col: 0 },
          end: { row: currentRowEnd, col: 25 }
        })
      } else if (rowIndex > currentRowEnd) {
        // Extend downward
        setSelection({
          start: { row: currentRowStart, col: 0 },
          end: { row: rowIndex, col: 25 }
        })
      } else {
        // Click is within current selection, so don't change
        return
      }
    } else {
      // Select the entire row
      setSelection({
        start: { row: rowIndex, col: 0 },
        end: { row: rowIndex, col: 25 }
      })
    }
    
    // Set the active cell to the start of the row
    setActiveCell(getCellId({ row: rowIndex, col: 0 }) || "")
  }, [selection, setSelection, setActiveCell, getCellId])

  const handleCellMouseDown = useCallback((row: number, col: number, e: MouseEvent) => {
    // Get the cell ID for the clicked cell
    const cellId = getCellId({ row, col }) || ""

    // If we're currently editing and click a different cell
    if (isEditing && activeCell !== cellId) {
      // Save the current edit
      if (activeCell) {
        updateCell(activeCell, editValue)
      }
      setIsEditing(false)
      setEditValue("")
      
      // Set the new active cell
      setActiveCell(cellId)
      setSelection({
        start: { row, col },
        end: { row, col },
      })
      return
    }
    
    // If not editing, proceed with normal selection behavior
    if (!isEditing) {
      // Prevent browser's default text selection
      e.preventDefault()

      // Store mouse position for later to detect if user is trying to select or just clicking
      setMouseDownStartPos({ x: e.clientX, y: e.clientY })
      
      setActiveCell(cellId)

      // If shift is pressed, extend the current selection
      if (e.shiftKey && activeCell) {
        const activePos = getCellPosition(activeCell)
        if (activePos) {
          setSelection({
            start: activePos,
            end: { row, col },
          })
          setIsSelecting(true)
          setSelectionStart({ row, col })
        }
      } else {
        // For single click, just set the selection to the clicked cell
        setSelection({
          start: { row, col },
          end: { row, col },
        })
        
        // Don't start selection mode immediately, wait to see if user drags
        setSelectionStart({ row, col })
      }
    }
  }, [isEditing, activeCell, editValue, setActiveCell, setEditValue, setIsSelecting, setMouseDownStartPos, setSelection, setSelectionStart, getCellId, getCellPosition, updateCell])

  const handleCellMouseMove = useCallback((row: number, col: number, e: MouseEvent) => {
    // Only start selection if mouse has moved a certain distance
    if (selectionStart && mouseDownStartPos && !isSelecting) {
      const dx = Math.abs(e.clientX - mouseDownStartPos.x)
      const dy = Math.abs(e.clientY - mouseDownStartPos.y)
      
      // If mouse has moved more than 5 pixels, start selection
      if (dx > 5 || dy > 5) {
        setIsSelecting(true)
      }
    }
    
    if (!isSelecting || !selectionStart) return

    // Prevent default browser selection while selecting cells
    if (isSelecting) {
      e.preventDefault()
    }

    setSelection({
      start: selectionStart,
      end: { row, col },
    })
  }, [isSelecting, mouseDownStartPos, selectionStart, setIsSelecting, setSelection])

  const handleCellMouseUp = useCallback(() => {
    setIsSelecting(false)
    setMouseDownStartPos(null)
  }, [])

  // Add mouse up handler to window to handle cases where mouse is released outside the grid
  useEffect(() => {
    const handleWindowMouseUp = () => {
      setIsSelecting(false)
      setMouseDownStartPos(null)
    }

    window.addEventListener("mouseup", handleWindowMouseUp)
    return () => window.removeEventListener("mouseup", handleWindowMouseUp)
  }, [])

  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    const cellId = getCellId({ row, col }) || ""
    setActiveCell(cellId)
    
    // Get the appropriate value to edit - if it's a formula, we want to edit the formula itself
    const valueToEdit = isCellFormula(cellId) && cells[cellId]?.formula 
      ? cells[cellId].formula 
      : (cells[cellId]?.value || "")
      
    setEditValue(valueToEdit)
    setIsEditing(true)

    // Clear selection when editing
    setSelection(null)
  }, [setActiveCell, setEditValue, setIsEditing, setSelection, cells, getCellId, isCellFormula])

  const handleCellKeyDown = useCallback((e: KeyboardEvent) => {
    if (!activeCell) return

    if (e.key === "Enter") {
      if (isEditing) {
        updateCell(activeCell, editValue)
        setIsEditing(false)
        e.preventDefault()
      } else {
        // Get the appropriate value to edit - if it's a formula, edit the formula
        const valueToEdit = isCellFormula(activeCell) && cells[activeCell]?.formula 
          ? cells[activeCell].formula 
          : (cells[activeCell]?.value || "")
          
        setEditValue(valueToEdit)
        setIsEditing(true)
        setSelection(null)
        e.preventDefault()
      }
    } else if (e.key === "Escape" && isEditing) {
      setIsEditing(false)
      setEditValue("")
      e.preventDefault()
    } else if (!isEditing) {
      const activePos = getCellPosition(activeCell)
      if (!activePos) return
      
      let newRow = activePos.row
      let newCol = activePos.col

      // Navigation with arrow keys
      if (e.key === "ArrowUp") newRow = Math.max(0, activePos.row - 1)
      else if (e.key === "ArrowDown") newRow = Math.min(99, activePos.row + 1)
      else if (e.key === "ArrowLeft") newCol = Math.max(0, activePos.col - 1)
      else if (e.key === "ArrowRight") newCol = Math.min(25, activePos.col + 1)
      else return

      // If we were editing, save before moving
      if (isEditing) {
        updateCell(activeCell, editValue)
        setIsEditing(false)
        setEditValue("")
      }

      const newCellId = getCellId({ row: newRow, col: newCol }) || ""
      setActiveCell(newCellId)

      // If shift is pressed, extend the selection
      if (e.shiftKey) {
        setSelection({
          start: selection?.start || activePos,
          end: { row: newRow, col: newCol },
        })
      } else if (!e.ctrlKey) {
        // Clear selection if shift is not pressed
        setSelection({
          start: { row: newRow, col: newCol },
          end: { row: newRow, col: newCol },
        })
      }

      e.preventDefault()
    }
  }, [activeCell, isEditing, editValue, selection, updateCell, setIsEditing, setEditValue, setSelection, setActiveCell, cells, getCellId, getCellPosition, isCellFormula])

  const handleCellChange = useCallback((e: ChangeEvent<HTMLInputElement> | string) => {
    const value = typeof e === 'string' ? e : e.target.value;
    setEditValue(value);
  }, [])

  const handleCellBlur = useCallback(() => {
    if (isEditing && activeCell) {
      updateCell(activeCell, editValue)
      setIsEditing(false)
    }
  }, [activeCell, editValue, isEditing, updateCell, setIsEditing])

  // Handle typing directly without double click (auto-start edit mode)
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!isEditing && activeCell && e.key.length === 1) {
      setEditValue(e.key)
      setIsEditing(true)
      e.preventDefault()
    }
  }, [activeCell, isEditing, setEditValue, setIsEditing])

  // Check if a cell is in the current selection
  const isCellSelected = useCallback((row: number, col: number): boolean => {
    if (!selection) return false

    const startRow = Math.min(selection.start.row, selection.end.row)
    const endRow = Math.max(selection.start.row, selection.end.row)
    const startCol = Math.min(selection.start.col, selection.end.col)
    const endCol = Math.max(selection.start.col, selection.end.col)

    return row >= startRow && row <= endRow && col >= startCol && col <= endCol
  }, [selection])

  // Check if an entire column is selected (for header highlighting)
  const isEntireColumnSelected = useCallback((colIndex: number): boolean => {
    if (!selection) return false
    
    const startCol = Math.min(selection.start.col, selection.end.col)
    const endCol = Math.max(selection.start.col, selection.end.col)
    const startRow = Math.min(selection.start.row, selection.end.row)
    const endRow = Math.max(selection.start.row, selection.end.row)
    
    return colIndex >= startCol && colIndex <= endCol && startRow === 0 && endRow === 99
  }, [selection])
  
  // Check if an entire row is selected (for header highlighting)
  const isEntireRowSelected = useCallback((rowIndex: number): boolean => {
    if (!selection) return false
    
    const startRow = Math.min(selection.start.row, selection.end.row)
    const endRow = Math.max(selection.start.row, selection.end.row)
    const startCol = Math.min(selection.start.col, selection.end.col)
    const endCol = Math.max(selection.start.col, selection.end.col)
    
    return rowIndex >= startRow && rowIndex <= endRow && startCol === 0 && endCol === 25
  }, [selection])

  // Handle clicking outside the grid
  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (gridRef.current && !gridRef.current.contains(e.target as Node) && isEditing) {
        // Save any pending edits when clicking outside
        if (activeCell) {
          updateCell(activeCell, editValue)
        }
        setIsEditing(false)
        setEditValue("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isEditing, activeCell, editValue, updateCell])

  // Removed console.log statements for better performance

  return (
    <div 
      className="relative overflow-auto h-full will-change-scroll" 
      tabIndex={0} 
      onKeyDown={handleCellKeyDown} 
      onKeyPress={handleKeyPress}
      ref={gridRef}
      style={isSelecting ? preventSelectionStyle : undefined}
    >
      <div 
        className="relative"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: `${columnVirtualizer.getTotalSize() + HEADER_WIDTH}px`,
        }}
      >
        {/* Fixed header row */}
        <div className="sticky top-0 z-10 flex" style={{ height: HEADER_HEIGHT }}>
          {/* Empty corner cell */}
          <div className="bg-gray-100 border-b border-r border-gray-200 flex items-center justify-center" 
               style={{ width: HEADER_WIDTH, height: HEADER_HEIGHT }}>
          </div>

          {/* Virtualized column headers */}
          {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
            const header = String.fromCharCode(65 + virtualColumn.index)
            return (
              <div
                key={virtualColumn.index}
                className={cn(
                  "bg-gray-100 border-b border-r border-gray-200 flex items-center justify-center font-medium text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors",
                  isEntireColumnSelected(virtualColumn.index) && "bg-blue-100"
                )}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${virtualColumn.start + HEADER_WIDTH}px`,
                  width: `${virtualColumn.size}px`,
                  height: HEADER_HEIGHT,
                }}
                onClick={(e) => handleColumnHeaderClick(virtualColumn.index, e)}
              >
                {header}
              </div>
            )
          })}
        </div>

        {/* Virtualized rows */}
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            className="absolute flex"
            style={{
              top: 0,
              transform: `translateY(${virtualRow.start + HEADER_HEIGHT}px)`,
              height: ROW_HEIGHT,
            }}
          >
            {/* Row header */}
            <div 
              className={cn(
                "bg-gray-100 border-b border-r border-gray-200 flex items-center justify-center font-medium text-gray-600 sticky left-0 cursor-pointer hover:bg-gray-200 transition-colors",
                isEntireRowSelected(virtualRow.index) && "bg-blue-100"
              )}
              style={{ width: HEADER_WIDTH, height: ROW_HEIGHT }}
              onClick={(e) => handleRowHeaderClick(virtualRow.index, e)}
            >
              {virtualRow.index + 1}
            </div>

            {/* Virtualized cells in the row */}
            {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
              const cellId = getCellId({ row: virtualRow.index, col: virtualColumn.index })
              const isActive = activeCell === cellId
              const isSelected = isCellSelected(virtualRow.index, virtualColumn.index)

              return (
                <div
                  key={`${virtualRow.index}-${virtualColumn.index}`}
                  className={cn(
                    "border-b border-r border-gray-200 relative",
                    isActive && "outline outline-2 outline-blue-500 z-20",
                    isSelected && !isActive && "bg-blue-50/70",
                    isActive && isSelected && "bg-blue-100",
                  )}
                  style={{
                    position: 'absolute',
                    left: `${virtualColumn.start + HEADER_WIDTH}px`,
                    width: virtualColumn.size,
                    height: ROW_HEIGHT,
                  }}
                  onMouseDown={(e) => handleCellMouseDown(virtualRow.index, virtualColumn.index, e)}
                  onMouseMove={(e) => handleCellMouseMove(virtualRow.index, virtualColumn.index, e)}
                  onMouseUp={handleCellMouseUp}
                  onDoubleClick={() => handleCellDoubleClick(virtualRow.index, virtualColumn.index)}
                >
                  <Cell
                    data={cells[cellId]}
                    isEditing={isActive && isEditing}
                    editValue={editValue}
                    onChange={handleCellChange}
                    onBlur={handleCellBlur}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

