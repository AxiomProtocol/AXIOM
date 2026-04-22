import { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T, index: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  keyExtractor: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available.',
  keyExtractor,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-dl-gray py-12 text-center">{emptyMessage}</p>
    );
  }

  const alignClass = (align?: string) => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse border border-dl-border">
        <thead>
          <tr className="bg-dl-bg-alt">
            {columns.map((col, i) => (
              <th
                key={col.key}
                className={`${alignClass(col.align)} px-3 py-2 border-b ${
                  i < columns.length - 1 ? 'border-r' : ''
                } border-dl-border text-xs font-medium text-dl-gray`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={keyExtractor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`${onRowClick ? 'cursor-pointer' : ''} ${
                rowIdx % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'
              }`}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={col.key}
                  className={`${alignClass(col.align)} px-3 py-2 border-b ${
                    colIdx < columns.length - 1 ? 'border-r' : ''
                  } border-dl-border-light ${col.className || ''}`}
                >
                  {col.render(row, rowIdx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
