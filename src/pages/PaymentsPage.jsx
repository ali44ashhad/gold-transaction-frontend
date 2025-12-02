import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { orderApi, subscriptionApi } from '@/lib/backendApi';
import { Button } from '@/components/ui/button';
import { Loader, RefreshCw, ChevronDown, CreditCard, ExternalLink } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { cn } from '@/lib/utils';
import SearchBar from '@/components/SearchBar';
import { useSearchParams, useNavigate } from 'react-router-dom';

const PaymentsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const subscriptionId = searchParams.get('subscriptionId');
  
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [subscription, setSubscription] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

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

  const fetchPayments = async () => {
    console.log('[PaymentsPage] fetchPayments called with subscriptionId:', subscriptionId);
    
    if (!subscriptionId) {
      toast({
        title: 'Missing subscription ID',
        description: 'Please provide a subscription ID to view payments.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Try to fetch subscription details - subscriptionId could be MongoDB _id or Stripe subscription ID
      let subscriptionData = null;
      
      console.log('[PaymentsPage] Step 1: Fetching subscription data for subscriptionId:', subscriptionId);
      
      // First, try as MongoDB ID
      if (subscriptionId.match(/^[0-9a-fA-F]{24}$/)) {
        console.log('[PaymentsPage] subscriptionId looks like MongoDB ID, fetching by ID');
        try {
          const subResponse = await subscriptionApi.getById(subscriptionId);
          console.log('[PaymentsPage] Subscription API response:', subResponse);
          if (!subResponse.error && subResponse.data?.subscription) {
            subscriptionData = subResponse.data.subscription;
            console.log('[PaymentsPage] Found subscription by MongoDB ID:', subscriptionData);
          }
        } catch (e) {
          console.log('[PaymentsPage] Error fetching subscription by MongoDB ID:', e);
          // Not a valid MongoDB ID or not found, continue
        }
      }
      
      // If not found, try searching by stripeSubscriptionId
      if (!subscriptionData) {
        console.log('[PaymentsPage] Subscription not found by MongoDB ID, trying to search all subscriptions');
        const subListResponse = await subscriptionApi.list();
        console.log('[PaymentsPage] Subscription list response:', subListResponse);
        if (!subListResponse.error) {
          const subscriptions = subListResponse.data?.subscriptions || [];
          console.log('[PaymentsPage] Total subscriptions found:', subscriptions.length);
          subscriptionData = subscriptions.find(
            (sub) => 
              (sub.stripeSubscriptionId || sub.stripe_subscription_id) === subscriptionId ||
              normalizeId(sub._id || sub.id) === subscriptionId
          );
          if (subscriptionData) {
            console.log('[PaymentsPage] Found subscription by searching:', subscriptionData);
          } else {
            console.log('[PaymentsPage] No subscription found matching subscriptionId:', subscriptionId);
          }
        }
      }
      
      if (subscriptionData) {
        setSubscription(subscriptionData);
        console.log('[PaymentsPage] Subscription data set:', {
          _id: subscriptionData._id,
          id: subscriptionData.id,
          stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
          planName: subscriptionData.planName
        });
      } else {
        console.warn('[PaymentsPage] No subscription data found for subscriptionId:', subscriptionId);
      }

      // Fetch orders/payments for this subscription
      // Priority: Use MongoDB subscriptionId (proper relationship) if available, 
      // otherwise fall back to stripeSubscriptionId
      let querySubscriptionId = subscriptionId;
      
      // If we found subscription data and have a MongoDB ID, use that (proper relationship)
      if (subscriptionData) {
        const mongoSubscriptionId = normalizeId(subscriptionData._id || subscriptionData.id);
        console.log('[PaymentsPage] Extracted MongoDB subscription ID:', mongoSubscriptionId);
        if (mongoSubscriptionId && mongoSubscriptionId.match(/^[0-9a-fA-F]{24}$/)) {
          querySubscriptionId = mongoSubscriptionId;
          console.log('[PaymentsPage] Using MongoDB subscription ID for query:', querySubscriptionId);
        } else {
          // Fall back to stripeSubscriptionId if MongoDB ID not available
          querySubscriptionId = subscriptionData.stripeSubscriptionId || subscriptionData.stripe_subscription_id || subscriptionId;
          console.log('[PaymentsPage] Using Stripe subscription ID for query:', querySubscriptionId);
        }
      } else {
        console.log('[PaymentsPage] No subscription data, using original subscriptionId for query:', querySubscriptionId);
      }
      
      console.log('[PaymentsPage] Step 2: Querying orders with subscriptionId:', querySubscriptionId);
      
      // Use the dedicated endpoint for fetching orders by subscription ID
      const ordersResponse = await orderApi.getBySubscriptionId(querySubscriptionId, 100);
      
      console.log('[PaymentsPage] Orders API response:', ordersResponse);

      if (ordersResponse.error) {
        console.error('[PaymentsPage] Orders API error:', ordersResponse.error);
        throw new Error(ordersResponse.error.message || 'Failed to fetch payments');
      }

      const orders = ordersResponse.data?.data || ordersResponse.data || [];
      console.log('[PaymentsPage] Extracted orders:', orders);
      console.log('[PaymentsPage] Number of orders found:', orders.length);
      
      if (orders.length > 0) {
        console.log('[PaymentsPage] First order sample:', {
          _id: orders[0]._id,
          id: orders[0].id,
          subscriptionId: orders[0].subscriptionId,
          stripeSubscriptionId: orders[0].stripeSubscriptionId,
          amount: orders[0].amount,
          status: orders[0].status
        });
      }
      
      setPayments(orders);
      setExpandedRows(new Set());
    } catch (error) {
      toast({
        title: 'Error fetching payments',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [subscriptionId]);

  const handleRowExpand = (paymentId) => {
    const normalizedId = normalizeId(paymentId);
    const isExpanded = expandedRows.has(normalizedId);

    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.delete(normalizedId);
      } else {
        next.add(normalizedId);
      }
      return next;
    });
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

  const formatCurrency = (amount, currency = 'INR') => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getOrderStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      requires_payment_method: 'bg-orange-100 text-orange-800',
      requires_action: 'bg-blue-100 text-blue-800',
      processing: 'bg-blue-100 text-blue-800',
      succeeded: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getInvoiceStatusBadgeColor = (status) => {
    const colors = {
      none: 'bg-gray-100 text-gray-800',
      draft: 'bg-slate-100 text-slate-800',
      open: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      void: 'bg-red-100 text-red-800',
      uncollectible: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredPayments = normalizedSearch
    ? payments.filter((payment) => {
        const orderId = normalizeId(payment._id || payment.id).toLowerCase();
        const stripeSessionId = (payment.stripeSessionId || '').toLowerCase();
        const stripePaymentIntentId = (payment.stripePaymentIntentId || '').toLowerCase();
        const stripeInvoiceId = (payment.stripeInvoiceId || '').toLowerCase();
        const amount = String(payment.amount || '').toLowerCase();
        const status = (payment.status || '').toLowerCase();
        const paymentStatus = (payment.paymentStatus || '').toLowerCase();
        
        return (
          orderId.includes(normalizedSearch) ||
          stripeSessionId.includes(normalizedSearch) ||
          stripePaymentIntentId.includes(normalizedSearch) ||
          stripeInvoiceId.includes(normalizedSearch) ||
          amount.includes(normalizedSearch) ||
          status.includes(normalizedSearch) ||
          paymentStatus.includes(normalizedSearch)
        );
      })
    : payments;

  const columns = [
    {
      id: 'expander',
      header: '',
      cellClassName: 'w-12 align-middle',
      cell: (payment) => {
        const rowId = normalizeId(payment._id || payment.id);
        const isExpanded = expandedRows.has(rowId);
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleRowExpand(payment._id || payment.id)}
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
      cell: (_payment, index) => index + 1,
    },
    {
      id: 'orderId',
      header: 'Order ID',
      cellClassName: 'max-w-[200px] align-middle',
      cell: (payment) => (
        <p className="font-mono text-xs text-slate-900 truncate">
          {normalizeId(payment._id || payment.id)}
        </p>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      cellClassName: 'align-middle',
      cell: (payment) => (
        <p className="font-semibold text-slate-900">
          {formatCurrency(payment.amount, payment.currency)}
        </p>
      ),
    },
    {
      id: 'status',
      header: 'Order Status',
      cellClassName: 'align-middle',
      cell: (payment) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusBadgeColor(payment.status)}`}
        >
          {payment.status || 'N/A'}
        </span>
      ),
    },
    {
      id: 'paymentStatus',
      header: 'Payment Status',
      cellClassName: 'align-middle',
      cell: (payment) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(payment.paymentStatus)}`}
        >
          {payment.paymentStatus || 'N/A'}
        </span>
      ),
    },
    {
      id: 'invoiceStatus',
      header: 'Invoice Status',
      cellClassName: 'align-middle',
      cell: (payment) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getInvoiceStatusBadgeColor(payment.invoiceStatus)}`}
        >
          {payment.invoiceStatus || 'N/A'}
        </span>
      ),
    },
    {
      id: 'createdAt',
      header: 'Date',
      cellClassName: 'align-middle',
      cell: (payment) => formatDate(payment.createdAt),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
        <p className="ml-4 text-lg">Loading Payments...</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Payments - PharaohVault</title>
        <meta name="description" content="View payment history for subscriptions." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-8">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-8 h-8 text-slate-700" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Payments</h1>
              {subscription && (
                <p className="text-slate-600 mt-1">
                  {subscription.planName} - {subscription.metal?.charAt(0).toUpperCase() + subscription.metal?.slice(1)}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full xl:max-w-2xl xl:flex-row xl:items-center">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by order ID, Stripe ID, amount, or status..."
              className="flex-1 min-w-0"
            />
            <Button onClick={fetchPayments} variant="outline" className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {subscriptionId && (
              <Button 
                onClick={() => navigate(`/dashboard`)} 
                variant="outline" 
                className="w-full sm:w-auto"
              >
                Back to Dashboard
              </Button>
            )}
          </div>
        </div>

        {!subscriptionId ? (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-12 text-center">
            <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Subscription Selected</h3>
            <p className="text-slate-600 mb-6">
              Please provide a subscription ID to view payments.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-slate-200">
            <div className="overflow-x-auto">
              <DataTable
                columns={columns}
                data={filteredPayments}
                emptyMessage={searchQuery ? 'No payments match your search.' : 'No payments found.'}
                getRowKey={(row) => normalizeId(row._id || row.id)}
                expandedRowKeys={expandedRows}
                className="min-w-[720px]"
                renderExpandedContent={(payment) => {
                  const paymentId = normalizeId(payment._id || payment.id);
                  
                  return (
                    <div className="py-4">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Payment Details</h3>
                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <div>
                          <p className="font-semibold text-slate-800">Order ID</p>
                          <p className="font-mono text-xs">{paymentId}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Order Type</p>
                          <p className="capitalize">{payment.orderType || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Amount</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {formatCurrency(payment.amount, payment.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Currency</p>
                          <p className="uppercase">{payment.currency || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Order Status</p>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusBadgeColor(payment.status)}`}
                          >
                            {payment.status || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Payment Status</p>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(payment.paymentStatus)}`}
                          >
                            {payment.paymentStatus || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Invoice Status</p>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getInvoiceStatusBadgeColor(payment.invoiceStatus)}`}
                          >
                            {payment.invoiceStatus || 'N/A'}
                          </span>
                        </div>
                        {payment.productName && (
                          <div>
                            <p className="font-semibold text-slate-800">Product Name</p>
                            <p>{payment.productName}</p>
                          </div>
                        )}
                        {payment.productDescription && (
                          <div>
                            <p className="font-semibold text-slate-800">Product Description</p>
                            <p>{payment.productDescription}</p>
                          </div>
                        )}
                        {payment.billingEmail && (
                          <div>
                            <p className="font-semibold text-slate-800">Billing Email</p>
                            <p>{payment.billingEmail}</p>
                          </div>
                        )}
                        {payment.billingName && (
                          <div>
                            <p className="font-semibold text-slate-800">Billing Name</p>
                            <p>{payment.billingName}</p>
                          </div>
                        )}
                        {payment.stripeSubscriptionId && (
                          <div>
                            <p className="font-semibold text-slate-800">Stripe Subscription ID</p>
                            <p className="font-mono text-xs break-all">{payment.stripeSubscriptionId}</p>
                          </div>
                        )}
                        {payment.stripePaymentIntentId && (
                          <div>
                            <p className="font-semibold text-slate-800">Stripe Payment Intent ID</p>
                            <p className="font-mono text-xs break-all">{payment.stripePaymentIntentId}</p>
                          </div>
                        )}
                        {payment.receiptUrl && (
                          <div className="md:col-span-2">
                            <p className="font-semibold text-slate-800">Receipt URL</p>
                            <a
                              href={payment.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              View Receipt
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {/* <div>
                          <p className="font-semibold text-slate-800">Created At</p>
                          <p>{formatDate(payment.createdAt)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Updated At</p>
                          <p>{formatDate(payment.updatedAt)}</p>
                        </div> */}
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
};

export default PaymentsPage;
