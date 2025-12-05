import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Edit } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { cn } from '@/lib/utils';

/**
 * Reusable table component for displaying cancellation requests.
 * Can be used for both admin and user views.
 * 
 * @param {Object} props
 * @param {Array} props.requests - Array of cancellation request objects
 * @param {Function} props.onEdit - Callback when edit button is clicked (optional, for admin)
 * @param {Function} props.formatDate - Function to format dates
 * @param {Function} props.getStatusBadgeColor - Function to get status badge color class
 * @param {Function} props.formatStatusLabel - Function to format status label
 * @param {Function} props.normalizeId - Function to normalize IDs
 * @param {Function} props.getUserMeta - Function to get user metadata (optional, for admin)
 * @param {boolean} props.showUserColumn - Whether to show user column (default: false for user view)
 * @param {boolean} props.showActions - Whether to show actions column (default: false for user view)
 */
const CancellationRequestsTable = ({
  requests = [],
  onEdit,
  formatDate,
  getStatusBadgeColor,
  formatStatusLabel,
  normalizeId,
  getUserMeta,
  showUserColumn = false,
  showActions = false,
}) => {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const columns = [
    {
      id: 'expander',
      header: '',
      cellClassName: 'w-12 align-middle',
      cell: (request) => {
        const rowId = normalizeId(request._id);
        const isExpanded = expandedRows.has(rowId);
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setExpandedRows((prev) => {
                const next = new Set(prev);
                if (next.has(rowId)) {
                  next.delete(rowId);
                } else {
                  next.add(rowId);
                }
                return next;
              });
            }}
          >
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </Button>
        );
      },
    },
    {
      id: 'serial',
      header: 'S.No',
      cellClassName: 'w-16 text-slate-500 align-middle',
      cell: (_request, index) => index + 1,
    },
    ...(showUserColumn
      ? [
          {
            id: 'user',
            header: 'User',
            cellClassName: 'max-w-[220px] align-middle',
            cell: (request) => {
              const meta = getUserMeta ? getUserMeta(request.userId) : { name: 'N/A' };
              return <p className="font-medium text-slate-900 truncate">{meta.name}</p>;
            },
          },
        ]
      : []),
    {
      id: 'status',
      header: 'Status',
      cellClassName: 'align-middle',
      cell: (request) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(request.status)}`}
        >
          {formatStatusLabel(request.status)}
        </span>
      ),
    },
    {
      id: 'preferredDate',
      header: 'Preferred Date',
      cellClassName: 'align-middle',
      cell: (request) => (
        <span className="text-slate-600 text-sm">
          {formatDate(request.preferredCancellationDate)}
        </span>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created At',
      cellClassName: 'align-middle',
      cell: (request) => (
        <span className="text-slate-600 text-sm">
          {formatDate(request.createdAt)}
        </span>
      ),
    },
    ...(showActions && onEdit
      ? [
          {
            id: 'actions',
            header: 'Actions',
            cellClassName: 'whitespace-nowrap align-middle',
            cell: (request) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(request)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200">
      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          data={requests}
          emptyMessage="No cancellation requests found."
          getRowKey={(row) => normalizeId(row._id)}
          expandedRowKeys={expandedRows}
          className="min-w-[720px]"
          renderExpandedContent={(request) => (
            <div className="p-4">
              <div className="grid gap-4 text-sm text-slate-600 md:grid-cols-2">
                <div>
                  <p className="font-semibold text-slate-800 mb-1">Reason</p>
                  <p className="break-words whitespace-normal">
                    {request.reason || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-1">Details</p>
                  <p className="break-words whitespace-normal">
                    {request.details || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-1">Subscription</p>
                  <p className="break-words whitespace-normal font-mono text-xs">
                    {request.subscriptionId
                      ? normalizeId(request.subscriptionId)
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-1">Created At</p>
                  <p className="break-words whitespace-normal">
                    {formatDate(request.createdAt)}
                  </p>
                </div>
                {request.preferredCancellationDate && (
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">Preferred Cancellation Date</p>
                    <p className="break-words whitespace-normal">
                      {formatDate(request.preferredCancellationDate)}
                    </p>
                  </div>
                )}
                {request.processedAt && (
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">Processed At</p>
                    <p className="break-words whitespace-normal">
                      {formatDate(request.processedAt)}
                    </p>
                  </div>
                )}
                {request.resolutionNotes && (
                  <div className="md:col-span-2">
                    <p className="font-semibold text-slate-800 mb-1">Resolution Notes</p>
                    <p className="break-words whitespace-normal">
                      {request.resolutionNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default CancellationRequestsTable;

