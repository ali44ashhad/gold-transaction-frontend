import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { cancellationRequestApi } from '@/lib/backendApi';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader, RefreshCw, XCircle } from 'lucide-react';
import CancellationRequestsTable from '@/components/CancellationRequestsTable';
import SearchBar from '@/components/SearchBar';

const UserCancellationRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const requestResponse = await cancellationRequestApi.list();

      if (requestResponse.error) {
        throw new Error(requestResponse.error.message || 'Failed to fetch cancellation requests');
      }

      const requests = requestResponse.data?.requests || [];
      setRequests(requests);
    } catch (error) {
      console.error('Error fetching cancellation requests', error);
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

  // Filter requests based on search query and filters
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const normalizedStatusFilter = statusFilter.trim().toLowerCase();
  
  const filteredRequests = requests.filter((request) => {
    const reason = request.reason?.toLowerCase() || '';
    const details = request.details?.toLowerCase() || '';
    const status = request.status?.toLowerCase() || '';
    const subscriptionId = normalizeId(request.subscriptionId).toLowerCase();

    const matchesSearch = normalizedSearch
      ? reason.includes(normalizedSearch) ||
        details.includes(normalizedSearch) ||
        status.includes(normalizedSearch) ||
        subscriptionId.includes(normalizedSearch)
      : true;

    const matchesStatus =
      normalizedStatusFilter === 'all'
        ? true
        : status === normalizedStatusFilter;

    return matchesSearch && matchesStatus;
  });

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
        <title>My Cancellation Requests - PharaohVault</title>
        <meta name="description" content="View your cancellation requests." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-3">
            <XCircle className="w-8 h-8 text-slate-700" />
            <h1 className="text-3xl font-bold text-slate-900">My Cancellation Requests</h1>
          </div>
          <div className="flex flex-col gap-3 w-full lg:max-w-2xl lg:flex-row lg:items-center">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by reason, status, subscription ID..."
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

        <CancellationRequestsTable
          requests={filteredRequests}
          formatDate={formatDate}
          getStatusBadgeColor={getStatusBadgeColor}
          formatStatusLabel={formatStatusLabel}
          normalizeId={normalizeId}
          showUserColumn={false}
          showActions={false}
        />
      </motion.div>
    </>
  );
};

export default UserCancellationRequestsPage;

