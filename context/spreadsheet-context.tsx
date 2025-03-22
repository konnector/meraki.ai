"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

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
}

const SpreadsheetContext = createContext<SpreadsheetContextType | undefined>(undefined)

export function SpreadsheetProvider({ children }: { children: ReactNode }) {
  const [cells, setCells] = useState<Cells>({})
  const [activeCell, setActiveCell] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null)
  const [title, setTitle] = useState<string>("Untitled Spreadsheet")

  // Helper function to convert between cell ID (e.g., "A1") and position ({row: 0, col: 0})
  const getCellId = (position: CellPosition): string => {
    const colLetter = String.fromCharCode(65 + position.col)
    return `${colLetter}${position.row + 1}`
  }

  const getCellPosition = (cellId: string): CellPosition => {
    const match = cellId.match(/([A-Z]+)(\d+)/)
    if (!match) return { row: 0, col: 0 }

    const colLetter = match[1]
    const rowNum = Number.parseInt(match[2])

    const col = colLetter.charCodeAt(0) - 65
    const row = rowNum - 1

    return { row, col }
  }

  // Get all cell IDs in the current selection
  const getSelectedCells = (): string[] => {
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
  }

  const updateCell = (cellId: string, value: string) => {
    setCells((prev) => ({
      ...prev,
      [cellId]: {
        ...prev[cellId],
        value,
      },
    }))
  }

  const updateCellFormat = (cellId: string, format: string, value: any) => {
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
  }

  // Update format for all cells in the current selection
  const updateMultipleCellsFormat = (format: string, value: any) => {
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
  }

  // Copy the current selection to clipboard
  const copySelection = () => {
    if (!selection && !activeCell) return

    const selectedCellIds = getSelectedCells()
    const clipboardCells: Cells = {}

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
  }

  // Cut the current selection (copy and then clear)
  const cutSelection = () => {
    if (!selection && !activeCell) return

    copySelection()
    deleteSelection()
  }

  // Paste clipboard content to the current position
  const pasteSelection = () => {
    if (!clipboard || (!selection && !activeCell)) return

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
  }

  // Delete content from selected cells
  const deleteSelection = () => {
    if (!selection && !activeCell) return

    const selectedCellIds = getSelectedCells()

    setCells((prev) => {
      const newCells = { ...prev }

      selectedCellIds.forEach((cellId) => {
        if (newCells[cellId]) {
          newCells[cellId] = {
            ...newCells[cellId],
            value: "",
          }
        }
      })

      return newCells
    })
  }

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

