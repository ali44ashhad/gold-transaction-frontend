
import React, { useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import EmbeddedCheckout from '@/components/EmbeddedCheckout';
import { Loader, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const stripePromiseCache = {};
const getStripePromise = (publishableKey) => {
  if (!publishableKey) {
    return null;
  }
  if (!stripePromiseCache[publishableKey]) {
    stripePromiseCache[publishableKey] = loadStripe(publishableKey);
  }
  return stripePromiseCache[publishableKey];
};

const CheckoutWrapper = ({ clientSecret, publishableKey, onRetry, isRetrying }) => {

  const isValidSecret = useMemo(() => {
    if (!clientSecret) return false;
    // Validates that the secret is in the format 'cs_test_..._secret_...'
    const regex = /^cs_test_[a-zA-Z0-9]+_secret_[a-zA-Z0-9]+$/;
    return regex.test(clientSecret);
  }, [clientSecret]);

  const stripePromise = getStripePromise(publishableKey);

  if (!publishableKey) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-64">
        <Loader className="animate-spin text-amber-500 w-8 h-8" />
        <p className="mt-4 text-slate-600">Initializing secure payment...</p>
      </div>
    );
  }
  
  if (!clientSecret) {
     return (
      <div className="flex flex-col items-center justify-center p-8 h-64">
        <Loader className="animate-spin text-amber-500 w-8 h-8" />
        <p className="mt-4 text-slate-600">Creating payment session...</p>
      </div>
    );
  }

  if (!isValidSecret) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-64 bg-red-50 border border-red-200 rounded-lg">
        <AlertTriangle className="text-red-500 w-8 h-8" />
        <p className="mt-4 font-semibold text-red-700">Payment Session Error</p>
        <p className="mt-1 text-sm text-red-600 text-center">
          The payment session is invalid or has expired.
        </p>
        {onRetry && (
            <Button variant="destructive" size="sm" onClick={onRetry} disabled={isRetrying} className="mt-4">
                {isRetrying ? (
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
        )}
      </div>
    );
  }

  const stripeOptions = { clientSecret };

  return (
    <Elements stripe={stripePromise} options={stripeOptions}>
      <EmbeddedCheckout />
    </Elements>
  );
};

export default CheckoutWrapper;
