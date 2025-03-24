"use client"

import React from 'react';
import { cn } from "@/lib/utils";

// Move font mappings outside component to avoid recreation
const FONT_FAMILY_MAP = {
  serif: "serif",
  mono: "monospace",
  inter: "Inter, sans-serif",
  roboto: "Roboto, sans-serif",
  poppins: "Poppins, sans-serif",
  default: "sans-serif"
} as const;

const FONT_SIZE_MAP = {
  xs: "10px",
  sm: "12px",
  lg: "16px",
  xl: "18px",
  "2xl": "20px",
  "3xl": "24px",
  default: "14px"
} as const;

interface CellData {
  value: string;
  formula?: string;
  calculatedValue?: any;
  error?: string;
  format?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: "left" | "center" | "right";
    fontFamily?: string;
    fontSize?: string;
    textColor?: string;
    fillColor?: string;
  };
}

interface CellProps {
  data?: CellData;
  isEditing: boolean;
  editValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

const Cell: React.FC<CellProps> = React.memo(({ 
  data, 
  isEditing, 
  editValue = "", 
  onChange, 
  onBlur 
}) => {
  // Memoize display value calculation
  const displayValue = React.useMemo(() => {
    if (isEditing) return editValue;
    if (!data) return '';
    
    // If it's a formula cell
    if (data.formula) {
      if (data.error) return '#ERROR!';
      return data.calculatedValue !== undefined ? String(data.calculatedValue) : data.value || '';
    }
    
    return data.value || '';
  }, [data?.formula, data?.error, data?.calculatedValue, data?.value, isEditing, editValue]);

  // Memoize style object to prevent unnecessary recalculations
  const cellStyles = React.useMemo(() => {
    if (!data?.format && !data?.error) {
      return {
        width: "100%",
        justifyContent: "flex-start",
        userSelect: "none" as const
      };
    }

    return {
      fontFamily: data?.format?.fontFamily ? FONT_FAMILY_MAP[data.format.fontFamily as keyof typeof FONT_FAMILY_MAP] || FONT_FAMILY_MAP.default : FONT_FAMILY_MAP.default,
      fontSize: data?.format?.fontSize ? FONT_SIZE_MAP[data.format.fontSize as keyof typeof FONT_SIZE_MAP] || FONT_SIZE_MAP.default : FONT_SIZE_MAP.default,
      fontWeight: data?.format?.bold ? "bold" : "normal",
      fontStyle: data?.format?.italic ? "italic" : "normal",
      textDecoration: data?.format?.underline ? "underline" : "none",
      textAlign: data?.format?.align || "left",
      color: data?.error ? "red" : (data?.format?.textColor || "inherit"),
      backgroundColor: data?.format?.fillColor || "transparent",
      width: "100%",
      justifyContent: data?.format?.align === "center" ? "center" : data?.format?.align === "right" ? "flex-end" : "flex-start",
      userSelect: "none" as const
    };
  }, [data?.format, data?.error]);

  // Render input for editing mode
  if (isEditing) {
    return (
      <input
        className="absolute inset-0 w-full h-full px-2 border-none outline-none bg-white"
        value={editValue}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        autoFocus
      />
    );
  }

  // Render display mode
  return (
    <div
      className={cn(
        "px-2 py-1 overflow-hidden text-sm whitespace-nowrap h-full flex items-center",
        data?.error && "text-red-500"
      )}
      style={cellStyles}
    >
      {displayValue}
    </div>
  );
}, (prevProps, nextProps) => {
  // Optimized comparison function
  if (prevProps.isEditing !== nextProps.isEditing) return false;
  if (prevProps.isEditing && prevProps.editValue !== nextProps.editValue) return false;
  
  const prevData = prevProps.data;
  const nextData = nextProps.data;
  
  // If both are null/undefined, they're equal
  if (!prevData && !nextData) return true;
  // If only one is null/undefined, they're different
  if (!prevData || !nextData) return false;
  
  // Compare essential properties
  if (prevData.value !== nextData.value) return false;
  if (prevData.error !== nextData.error) return false;
  if (prevData.calculatedValue !== nextData.calculatedValue) return false;
  if (prevData.formula !== nextData.formula) return false;
  
  // Compare format only if it exists and has changed
  if (prevData.format || nextData.format) {
    return JSON.stringify(prevData.format) === JSON.stringify(nextData.format);
  }
  
  return true;
});

Cell.displayName = "Cell";

export default Cell; 