import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { withdrawalRequestApi } from '@/lib/backendApi';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader, RefreshCw, ArrowDownCircle } from 'lucide-react';
import WithdrawalRequestsTable from '@/components/WithdrawalRequestsTable';
import SearchBar from '@/components/SearchBar';

const UserWithdrawalRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [metalFilter, setMetalFilter] = useState('all');
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const requestResponse = await withdrawalRequestApi.list();

      if (requestResponse.error) {
        throw new Error(requestResponse.error.message || 'Failed to fetch withdrawal requests');
      }

      const requests = requestResponse.data?.requests || [];
      setRequests(requests);
    } catch (error) {
      console.error('Error fetching withdrawal requests', error);
      toast({
        title: 'Error fetching withdrawal requests',
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

  // Filter requests based on search query and filters
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const normalizedStatusFilter = statusFilter.trim().toLowerCase();
  const normalizedMetalFilter = metalFilter.trim().toLowerCase();
  
  const filteredRequests = requests.filter((request) => {
    const metal = request.metal?.toLowerCase() || '';
    const status = request.status?.toLowerCase() || '';
    const subscriptionId = normalizeId(request.subscriptionId).toLowerCase();
    const notes = request.notes?.toLowerCase() || '';

    const matchesSearch = normalizedSearch
      ? metal.includes(normalizedSearch) ||
        status.includes(normalizedSearch) ||
        subscriptionId.includes(normalizedSearch) ||
        notes.includes(normalizedSearch) ||
        `${request.requestedWeight} ${request.requestedUnit}`.toLowerCase().includes(normalizedSearch)
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
        <title>My Withdrawal Requests - PharaohVault</title>
        <meta name="description" content="View your withdrawal requests." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-3">
            <ArrowDownCircle className="w-8 h-8 text-slate-700" />
            <h1 className="text-3xl font-bold text-slate-900">My Withdrawal Requests</h1>
          </div>
          <div className="flex flex-col gap-3 w-full lg:max-w-3xl lg:flex-row lg:items-center">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by metal, status, subscription ID..."
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
          formatDate={formatDate}
          formatCurrency={formatCurrency}
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

export default UserWithdrawalRequestsPage;

