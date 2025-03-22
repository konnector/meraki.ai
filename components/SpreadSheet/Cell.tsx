import React from 'react';

interface CellData {
  value?: string;
  formula?: string;
  calculatedValue?: any;
  error?: string;
}

interface CellProps {
  data?: CellData;
  editing: boolean;
}

const Cell: React.FC<CellProps> = ({ data, editing }) => {
  const cellValue = React.useMemo(() => {
    if (editing) return '';
    
    // If it's a formula cell with a calculated value
    if (data?.formula) {
      // If there's an error, display it
      if (data.error || (data.calculatedValue && data.calculatedValue.error)) {
        const errorValue = data.error || (data.calculatedValue && data.calculatedValue.error);
        return errorValue;
      }
      
      // Otherwise show the calculated value
      return data.calculatedValue !== undefined 
        ? data.calculatedValue 
        : data.value || '';
    }
    
    return data?.value || '';
  }, [data, editing]);

  return (
    <div>{cellValue}</div>
  );
};

export default Cell; 