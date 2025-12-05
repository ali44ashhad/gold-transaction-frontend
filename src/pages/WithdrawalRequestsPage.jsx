import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { withdrawalRequestApi, userApi } from '@/lib/backendApi';
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
import { Loader, RefreshCw, Edit, ArrowDownCircle } from 'lucide-react';
import WithdrawalRequestsTable from '@/components/WithdrawalRequestsTable';
import SearchBar from '@/components/SearchBar';

const WithdrawalRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userLookup, setUserLookup] = useState(new Map());
  const [formData, setFormData] = useState({
    status: '',
  });
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [metalFilter, setMetalFilter] = useState('all');
  const { toast } = useToast();

  const handleEditClick = (request) => {
    setEditingRequest(request);
    setFormData({
      status: request.status || 'pending',
    });
    setIsDialogOpen(true);
  };

  const fetchRequests = async () => {
    console.log('[DEBUG] fetchRequests called');
    setLoading(true);
    try {
      console.log('[DEBUG] Fetching withdrawal requests and users');
      const [requestResponse, usersResponse] = await Promise.all([
        withdrawalRequestApi.list(),
        userApi.listUsers(),
      ]);

      console.log('[DEBUG] Fetch responses received', {
        requestsCount: requestResponse.data?.requests?.length || 0,
        usersCount: usersResponse.data?.users?.length || 0,
        requestError: requestResponse.error,
        usersError: usersResponse.error,
      });

      if (requestResponse.error) {
        console.error('[DEBUG] Error fetching withdrawal requests', {
          error: requestResponse.error,
        });
        throw new Error(requestResponse.error.message || 'Failed to fetch withdrawal requests');
      }

      if (usersResponse.error) {
        console.warn('[DEBUG] Error fetching users, using fallback', {
          error: usersResponse.error,
        });
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
        console.log('[DEBUG] User lookup map created', {
          userCount: lookup.size,
        });
      }

      const requests = requestResponse.data?.requests || [];
      console.log('[DEBUG] Setting withdrawal requests', {
        count: requests.length,
        requestIds: requests.map(r => r._id || r.id),
      });
      setRequests(requests);
      setExpandedRows(new Set());
    } catch (error) {
      console.error('[DEBUG] Error in fetchRequests', {
        error: error.message,
        stack: error.stack,
      });
      toast({
        title: 'Error fetching withdrawal requests',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      console.log('[DEBUG] fetchRequests completed');
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdate = async () => {
    if (!editingRequest) {
      console.warn('[DEBUG] handleUpdate called but editingRequest is null');
      return;
    }

    console.log('[DEBUG] Updating withdrawal request', {
      requestId: editingRequest._id,
      currentStatus: editingRequest.status,
      newStatus: formData.status,
      previousStatus: editingRequest.status,
      isStatusChange: formData.status !== editingRequest.status,
    });

    setUpdating(true);
    try {
      const updatePayload = {
        ...formData,
      };

      console.log('[DEBUG] Calling withdrawalRequestApi.update', {
        requestId: editingRequest._id,
        payload: updatePayload,
      });

      const { data, error } = await withdrawalRequestApi.update(
        editingRequest._id,
        updatePayload
      );

      console.log('[DEBUG] withdrawalRequestApi.update response', {
        requestId: editingRequest._id,
        data,
        error,
      });

      if (error) {
        console.error('[DEBUG] withdrawalRequestApi.update returned error', {
          requestId: editingRequest._id,
          error,
        });
        throw new Error(error.message || 'Failed to update withdrawal request');
      }

      console.log('[DEBUG] Withdrawal request updated successfully', {
        requestId: editingRequest._id,
        oldStatus: editingRequest.status,
        newStatus: data?.request?.status,
        requestData: data?.request,
      });

      // Update the request in the list
      setRequests(requests.map(req => 
        req._id === editingRequest._id ? data.request : req
      ));

      toast({
        title: 'Success',
        description: 'Withdrawal request updated successfully.',
        variant: 'success',
      });

      setIsDialogOpen(false);
      setEditingRequest(null);
    } catch (error) {
      console.error('[DEBUG] Error updating withdrawal request', {
        requestId: editingRequest._id,
        error: error.message,
        stack: error.stack,
      });
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
      console.log('[DEBUG] handleUpdate completed');
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

  const formatCurrency = (value) => {
    if (!value || isNaN(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      rejected: 'bg-red-500 text-white',
      pending: 'bg-yellow-500 text-white',
      approved: 'bg-teal-500 text-white',
      processing: 'bg-purple-500 text-white',
      out_for_delivery: 'bg-orange-500 text-white',
      delivered: 'bg-green-500 text-white',
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
  const normalizedMetalFilter = metalFilter.trim().toLowerCase();
  const filteredRequests = requests.filter((request) => {
    const meta = getUserMeta(request.userId);
    const name = meta.name?.toLowerCase() || '';
    const email = meta.secondary?.toLowerCase() || '';
    const metal = request.metal?.toLowerCase() || '';
    const status = request.status?.toLowerCase() || '';
    const subscriptionId = normalizeId(request.subscriptionId).toLowerCase();
    const notes = request.notes?.toLowerCase() || '';

    const matchesSearch = normalizedSearch
      ? name.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        metal.includes(normalizedSearch) ||
        status.includes(normalizedSearch) ||
        subscriptionId.includes(normalizedSearch) ||
        notes.includes(normalizedSearch)
      : true;

    const matchesStatus =
      normalizedStatusFilter === 'all'
        ? true
        : status === normalizedStatusFilter;

    const matchesMetal =
      normalizedMetalFilter === 'all'
        ? true
        : metal === normalizedMetalFilter;

    return matchesSearch && matchesStatus && matchesMetal;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
        <p className="ml-4 text-lg">Loading Withdrawal Requests...</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin - Withdrawal Requests - PharaohVault</title>
        <meta name="description" content="Manage withdrawal requests." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-3">
            <ArrowDownCircle className="w-8 h-8 text-slate-700" />
            <h1 className="text-3xl font-bold text-slate-900">Withdrawal Requests</h1>
          </div>
          <div className="flex flex-col gap-3 w-full lg:max-w-3xl lg:flex-row lg:items-center">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by user, metal, subscription ID..."
            />
            <Select
              value={metalFilter}
              onValueChange={setMetalFilter}
            >
              <SelectTrigger className="w-full sm:w-[170px] [&>span]:truncate [&>span]:whitespace-nowrap">
                <SelectValue placeholder="Filter by metal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All metals</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-full sm:w-[210px] [&>span]:truncate [&>span]:whitespace-nowrap">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchRequests} variant="outline" className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <WithdrawalRequestsTable
          requests={filteredRequests}
          onEdit={handleEditClick}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          getStatusBadgeColor={getStatusBadgeColor}
          formatStatusLabel={formatStatusLabel}
          normalizeId={normalizeId}
          getUserMeta={getUserMeta}
          showUserColumn={true}
          showActions={true}
        />

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Update Withdrawal Request</DialogTitle>
              <DialogDescription>
                Update the status for this withdrawal request.
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
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
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
                  <div>
                    <strong>Metal:</strong> {editingRequest.metal ? editingRequest.metal.charAt(0).toUpperCase() + editingRequest.metal.slice(1) : 'N/A'}
                  </div>
                  <div>
                    <strong>Requested Weight:</strong>{' '}
                    {editingRequest.requestedWeight
                      ? `${editingRequest.requestedWeight.toFixed(4)} ${editingRequest.requestedUnit || ''}`
                      : 'N/A'}
                  </div>
                  <div>
                    <strong>Estimated Value:</strong> {formatCurrency(editingRequest.estimatedValue)}
                  </div>
                  {editingRequest.notes && (
                    <div><strong>Notes:</strong> {editingRequest.notes}</div>
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

export default WithdrawalRequestsPage;

