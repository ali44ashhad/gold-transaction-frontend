import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Loader, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { fetchOrderById } from '@/lib/api';
import { readCheckoutContext, clearCheckoutContext } from '@/lib/utils';

const POLL_INTERVAL = 4000;
const MAX_POLLS = 5;

const CheckoutSuccessPage = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const orderIdFromQuery = query.get('order_id');
  const sessionIdFromQuery = query.get('session_id');

  const storedContext = readCheckoutContext();
  const [orderId, setOrderId] = useState(orderIdFromQuery || storedContext?.orderId || '');
  const [sessionId] = useState(sessionIdFromQuery || storedContext?.sessionId || '');
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | pending | success | review | error
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (orderIdFromQuery && orderIdFromQuery !== orderId) {
      setOrderId(orderIdFromQuery);
    }
  }, [orderIdFromQuery, orderId]);

  useEffect(() => {
    if (!orderId || !user) {
      return;
    }

    let cancelled = false;
    let timeoutId = null;

    const loadOrder = async (attempt = 0) => {
      try {
        setStatus(attempt === 0 ? 'loading' : 'pending');
        const latestOrder = await fetchOrderById(orderId);
        if (cancelled) return;

        if (!latestOrder) {
          setErrorMessage('We could not locate this order. Please contact support.');
          setStatus('error');
          return;
        }

        setOrder(latestOrder);

        if (latestOrder.paymentStatus === 'pending' && attempt < MAX_POLLS) {
          timeoutId = setTimeout(() => loadOrder(attempt + 1), POLL_INTERVAL);
          return;
        }

        if (latestOrder.paymentStatus === 'succeeded') {
          setStatus('success');
          clearCheckoutContext();
        } else {
          setStatus('review');
        }
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error.message || 'Unable to load your order right now.');
        setStatus('error');
      }
    };

    loadOrder();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [orderId, user, refreshNonce]);

  const handleManualRefresh = useCallback(() => {
    setRefreshNonce((prev) => prev + 1);
  }, []);

  const renderIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'pending':
      case 'loading':
        return <Loader className="w-16 h-16 animate-spin text-amber-500" />;
      case 'review':
        return <RefreshCw className="w-16 h-16 text-blue-500" />;
      case 'error':
        return <AlertTriangle className="w-16 h-16 text-red-500" />;
      default:
        return <Loader className="w-16 h-16 animate-spin text-amber-500" />;
    }
  };

  const headline = () => {
    switch (status) {
      case 'success':
        return 'Payment Successful!';
      case 'review':
        return 'Payment Recorded – Pending Review';
      case 'pending':
      case 'loading':
        return 'Confirming Payment...';
      case 'error':
        return 'We hit a snag';
      default:
        return 'Checking your payment';
    }
  };

  if (!orderId && !authLoading) {
    return (
      <EmptyState
        title="Missing Order Reference"
        description="We could not find an order in this session. Use the link in your email or restart checkout."
        actionLabel="Back to Dashboard"
        onAction={() => navigate('/dashboard')}
      />
    );
  }

  if (!user && !authLoading) {
    return (
      <EmptyState
        title="Sign in required"
        description="Please sign in so we can secure your payment history."
        actionLabel="Go to Login"
        onAction={() => navigate('/login')}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>Payment Status - PharaohVault</title>
        <meta name="description" content="Track your payment confirmation and Stripe session details." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto py-20 px-4 sm:px-6 lg:px-8 text-center"
      >
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center gap-6">
          {renderIcon()}
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{headline()}</h1>
            <p className="text-slate-600 mt-2">
              {status === 'success' &&
                'Your payment cleared and your vault plan is active. We will email you receipts shortly.'}
              {status === 'pending' &&
                'Stripe confirmed the checkout session. We are waiting for the subscription to activate.'}
              {status === 'review' &&
                'We recorded the session, but the invoice still needs attention. See the details below.'}
              {status === 'loading' && 'Hold tight while we confirm everything with Stripe.'}
              {status === 'error' && errorMessage}
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
            <p className="text-xs uppercase font-semibold text-slate-500">Reference</p>
            <div className="mt-2 space-y-2 text-sm text-slate-700 break-all">
              {orderId && (
                <p>
                  <span className="font-semibold">Order ID:</span> {orderId}
                </p>
              )}
              {sessionId && (
                <p>
                  <span className="font-semibold">Checkout Session:</span> {sessionId}
                </p>
              )}
            </div>
          </div>

          {order && (
            <div className="w-full bg-white border border-slate-200 rounded-xl p-6 text-left space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
              <SummaryRow label="Product" value={order.productName || 'Subscription'} />
              <SummaryRow
                label="Amount"
                value={
                  order.amount ? `$${order.amount.toFixed(2)} ${order.currency?.toUpperCase() || 'USD'}` : 'Pending'
                }
              />
              <SummaryRow label="Payment Status" value={order.paymentStatus} />
              <SummaryRow label="Invoice Status" value={order.invoiceStatus} />
              {order.receiptUrl && (
                <Button
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => window.open(order.receiptUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Receipt
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button className="flex-1" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleManualRefresh} disabled={status === 'loading'}>
              {status === 'loading' ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

const SummaryRow = ({ label, value }) => (
  <div className="flex justify-between text-sm text-slate-700">
    <span className="font-medium text-slate-500">{label}</span>
    <span className="text-slate-900">{value ?? '—'}</span>
  </div>
);

const EmptyState = ({ title, description, actionLabel, onAction }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="max-w-xl mx-auto py-24 px-4 text-center"
  >
    <div className="bg-white border border-slate-200 rounded-2xl p-10 space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      <p className="text-slate-600">{description}</p>
      <Button onClick={onAction}>{actionLabel}</Button>
    </div>
  </motion.div>
);

export default CheckoutSuccessPage;

