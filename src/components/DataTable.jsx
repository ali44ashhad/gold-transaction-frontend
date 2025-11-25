import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * Generic data table for simple admin listings.
 * Columns accept:
 * - id: unique key
 * - header: column label
 * - accessor: property name or dot.path on the row (optional when using cell)
 * - headerClassName / cellClassName: optional Tailwind classes
 * - cell: custom render function (row, rowIndex) => ReactNode
 */
const DataTable = ({
  columns = [],
  data = [],
  getRowKey,
  emptyMessage = 'No records found.',
  className,
  bodyClassName,
  expandedRowKeys,
  renderExpandedContent,
}) => {
  const resolveValue = (row, accessor) => {
    if (!accessor) return undefined;
    return accessor.split('.').reduce((acc, key) => {
      if (acc === undefined || acc === null) return undefined;
      return acc[key];
    }, row);
  };

  const defaultRowKey = (row, index) => row?.id || row?._id || index;

  const renderCellContent = (column, row, rowIndex) => {
    if (typeof column.cell === 'function') {
      return column.cell(row, rowIndex);
    }
    const value = resolveValue(row, column.accessor);
    if (value === undefined || value === null || value === '') {
      return '—';
    }
    return value;
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.id || column.accessor || column.header}
                className={column.headerClassName}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className={bodyClassName}>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length || 1}
                className="text-center py-8 text-slate-500"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => {
              const rowKey = getRowKey ? getRowKey(row, rowIndex) : defaultRowKey(row, rowIndex);
              const isExpanded =
                !!renderExpandedContent &&
                !!expandedRowKeys &&
                typeof expandedRowKeys.has === 'function' &&
                expandedRowKeys.has(rowKey);

              return (
                <React.Fragment key={rowKey}>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell
                        key={`${column.id || column.accessor || column.header}-${rowIndex}`}
                        className={column.cellClassName}
                      >
                        {renderCellContent(column, row, rowIndex)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="bg-slate-50">
                        {renderExpandedContent(row, rowIndex)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTable;

