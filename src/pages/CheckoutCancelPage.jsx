import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { fetchOrderById } from '@/lib/api';
import { readCheckoutContext } from '@/lib/utils';

const CheckoutCancelPage = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const storedContext = readCheckoutContext();
  const [orderId] = useState(query.get('order_id') || storedContext?.orderId || '');
  const [sessionId] = useState(query.get('session_id') || storedContext?.sessionId || '');
  const [order, setOrder] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user || !orderId) return;

    let mounted = true;
    fetchOrderById(orderId)
      .then((o) => {
        if (mounted) setOrder(o);
      })
      .catch((error) => {
        if (mounted) setErrorMessage(error.message || 'Unable to load order details.');
      });

    return () => {
      mounted = false;
    };
  }, [orderId, user]);

  return (
    <>
      <Helmet>
        <title>Payment cancelled - PharaohVault</title>
        <meta name="description" content="Restart your PharaohVault checkout after cancelling on Stripe." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto py-20 px-4 sm:px-6 lg:px-8 text-center"
      >
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center gap-6">
          <AlertTriangle className="w-16 h-16 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Checkout Cancelled</h1>
            <p className="text-slate-600 mt-2">
              No charges were made. You can restart checkout whenever you are ready.
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

          {user && authLoading === false && order && (
            <div className="w-full bg-white border border-slate-200 rounded-xl p-6 text-left space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Latest Order State</h2>
              <SummaryRow label="Payment Status" value={order.paymentStatus || 'pending'} />
              <SummaryRow label="Invoice Status" value={order.invoiceStatus || 'none'} />
              <SummaryRow
                label="Amount"
                value={
                  order.amount ? `$${order.amount.toFixed(2)} ${order.currency?.toUpperCase() || 'USD'}` : 'Pending'
                }
              />
            </div>
          )}

          {errorMessage && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2 w-full">{errorMessage}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button className="flex-1" onClick={() => navigate('/dashboard')}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Checkout Again
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open('mailto:support@pharaohvault.com', '_blank')}
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
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

export default CheckoutCancelPage;

