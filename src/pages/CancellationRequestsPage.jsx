import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { cancellationRequestApi, userApi } from '@/lib/backendApi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader, RefreshCw, Edit, XCircle, ChevronDown } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { cn } from '@/lib/utils';
import SearchBar from '@/components/SearchBar';

const CancellationRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userLookup, setUserLookup] = useState(new Map());
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [formData, setFormData] = useState({
    status: '',
    resolutionNotes: '',
  });
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [requestResponse, usersResponse] = await Promise.all([
        cancellationRequestApi.list(),
        userApi.listUsers(),
      ]);

      if (requestResponse.error) {
        throw new Error(requestResponse.error.message || 'Failed to fetch cancellation requests');
      }

      if (usersResponse.error) {
        toast({
          title: 'User data unavailable',
          description: usersResponse.error.message || 'Showing fallback user identifiers.',
          variant: 'destructive',
        });
        setUserLookup(new Map());
      } else {
        const lookup = new Map();
        (usersResponse.data?.users || []).forEach((user) => {
          const key = user.id || user._id;
          if (key) {
            lookup.set(String(key), user);
          }
        });
        setUserLookup(lookup);
      }

      setRequests(requestResponse.data?.requests || []);
      setExpandedRows(new Set());
    } catch (error) {
      toast({
        title: 'Error fetching cancellation requests',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleEditClick = (request) => {
    setEditingRequest(request);
    setFormData({
      status: request.status || 'pending',
      resolutionNotes: request.resolutionNotes || '',
    });
    setIsDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingRequest) return;

    setUpdating(true);
    try {
      const { data, error } = await cancellationRequestApi.update(
        editingRequest._id,
        formData
      );

      if (error) {
        throw new Error(error.message || 'Failed to update cancellation request');
      }

      // Update the request in the list
      setRequests(requests.map(req => 
        req._id === editingRequest._id ? data.request : req
      ));

      toast({
        title: 'Success',
        description: 'Cancellation request updated successfully.',
        variant: 'success',
      });

      setIsDialogOpen(false);
      setEditingRequest(null);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      rejected: 'bg-red-500 text-white',
      pending: 'bg-yellow-500 text-white',
      in_review: 'bg-blue-500 text-white',
      approved: 'bg-teal-500 text-white',
      completed: 'bg-green-500 text-white',
    };
    return colors[status] || 'bg-gray-500 text-white';
  };

  const formatStatusLabel = (status) => {
    if (!status) return 'Pending';
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const normalizeId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if (value._id) return String(value._id);
      if (value.id) return String(value.id);
      if (typeof value.toString === 'function') return value.toString();
    }
    return '';
  };

  const truncateId = (value, length = 8) => {
    if (!value) return '—';
    return value.length > length ? `${value.slice(0, length)}...` : value;
  };

  const getUserMeta = (userId) => {
    const normalizedId = normalizeId(userId);
    const user = userLookup.get(normalizedId);
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

    return {
      name: fullName || user?.email || 'Unknown user',
      secondary: user?.email || (normalizedId ? truncateId(normalizedId) : '—'),
    };
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const normalizedStatusFilter = statusFilter.trim().toLowerCase();
  const filteredRequests = requests.filter((request) => {
    const meta = getUserMeta(request.userId);
    const name = meta.name?.toLowerCase() || '';
    const email = meta.secondary?.toLowerCase() || '';
    const reason = request.reason?.toLowerCase() || '';
    const status = request.status?.toLowerCase() || '';
    const subscriptionId = normalizeId(request.subscriptionId).toLowerCase();

    const matchesSearch = normalizedSearch
      ? name.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        reason.includes(normalizedSearch) ||
        status.includes(normalizedSearch) ||
        subscriptionId.includes(normalizedSearch)
      : true;

    const matchesStatus =
      normalizedStatusFilter === 'all'
        ? true
        : status === normalizedStatusFilter;

    return matchesSearch && matchesStatus;
  });

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
    {
      id: 'user',
      header: 'User',
      cellClassName: 'max-w-[220px] align-middle',
      cell: (request) => {
        const meta = getUserMeta(request.userId);
        return <p className="font-medium text-slate-900 truncate">{meta.name}</p>;
      },
    },
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
      cell: (request) => formatDate(request.preferredCancellationDate),
    },
    {
      id: 'actions',
      header: 'Actions',
      cellClassName: 'whitespace-nowrap align-middle',
      cell: (request) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEditClick(request)}
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
        <p className="ml-4 text-lg">Loading Cancellation Requests...</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin - Cancellation Requests - PharaohVault</title>
        <meta name="description" content="Manage cancellation requests." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-3">
            <XCircle className="w-8 h-8 text-slate-700" />
            <h1 className="text-3xl font-bold text-slate-900">Cancellation Requests</h1>
          </div>
          <div className="flex flex-col gap-3 w-full lg:max-w-2xl lg:flex-row lg:items-center">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by user,subscription ID..."
            />
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchRequests} variant="outline" className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-slate-200">
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={filteredRequests}
              emptyMessage={
                searchQuery ? 'No cancellation requests match your search.' : 'No cancellation requests found.'
              }
              getRowKey={(row) => normalizeId(row._id)}
              expandedRowKeys={expandedRows}
              className="min-w-[720px]"
              renderExpandedContent={(request) => (
              <div className="p-4">
                <div className="grid gap-4 text-sm text-slate-600 md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">Reason</p>
                    <p className="break-words whitespace-normal">{request.reason || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">Details</p>
                    <p className="break-words whitespace-normal">{request.details || 'N/A'}</p>
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
                    <p className="break-words whitespace-normal">{formatDate(request.createdAt)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="font-semibold text-slate-800 mb-1">Resolution Notes</p>
                    <p className="break-words whitespace-normal">{request.resolutionNotes || 'N/A'}</p>
                  </div>
                </div>
              </div>
              )}
            />
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Update Cancellation Request</DialogTitle>
              <DialogDescription>
                Update the status and resolution notes for this cancellation request.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="resolutionNotes">Resolution Notes</Label>
                <textarea
                  id="resolutionNotes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.resolutionNotes}
                  onChange={(e) => setFormData({ ...formData, resolutionNotes: e.target.value })}
                  placeholder="Enter resolution notes..."
                />
              </div>
              {editingRequest && (
                <div className="grid gap-2 text-sm text-slate-600">
                  <div><strong>Request ID:</strong> {editingRequest._id}</div>
                  <div>
                    <strong>User:</strong>{' '}
                    {(() => {
                      const meta = getUserMeta(editingRequest.userId);
                      return `${meta.name} (${meta.secondary})`;
                    })()}
                  </div>
                  {editingRequest.reason && (
                    <div><strong>Reason:</strong> {editingRequest.reason}</div>
                  )}
                  {editingRequest.details && (
                    <div><strong>Details:</strong> {editingRequest.details}</div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updating}>
                {updating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
};

export default CancellationRequestsPage;

