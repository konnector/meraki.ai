export type Spreadsheet = {
  id: string;
  user_id: string;
  title: string;
  data?: {
    isStarred?: boolean;
    cells?: {
      [key: string]: CellData;
    };
    meta?: {
      rowCount: number;
      columnCount: number;
      lastModified?: string;
    };
  };
  created_at: string;
  updated_at: string;
}

export type SpreadsheetData = {
  isStarred?: boolean;
  cells?: {
    [key: string]: CellData;
  };
  meta?: {
    rowCount: number;
    columnCount: number;
    lastModified?: string;
  };
}

export interface CellData {
  value: string;
  formula?: string;
  calculatedValue?: string | number;
  error?: string;
  format?: CellFormat;
}

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
} 