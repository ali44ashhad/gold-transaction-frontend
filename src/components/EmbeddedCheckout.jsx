
import React, { useState, useEffect, useRef } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout as StripeEmbeddedCheckoutComponent } from '@stripe/react-stripe-js';
import { useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState('loading'); // loading, ready, error, timeout
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!stripe || !elements) {
      console.log('[EmbeddedCheckout] Stripe.js or Elements not loaded yet.');
      return;
    }
    console.log('[EmbeddedCheckout] Stripe.js and Elements are loaded.');

    // Set a timeout in case the checkout form takes too long to appear.
    timeoutRef.current = setTimeout(() => {
      console.error('[EmbeddedCheckout] Timeout: Checkout form did not mount in 10 seconds.');
      setStatus('timeout');
    }, 10000); // 10 seconds

    // The 'ready' event is fired when the Embedded Checkout is displayed
    const onReady = ({ stripe }) => {
      console.log('[EmbeddedCheckout] Stripe Embedded Checkout is ready and displayed.');
      clearTimeout(timeoutRef.current);
      setStatus('ready');
    };

    // The 'error' event is fired when an error prevents the form from displaying
    const onError = (error) => {
        console.error('[EmbeddedCheckout] Stripe Embedded Checkout error:', error);
        clearTimeout(timeoutRef.current);
        setStatus('error');
    };

    elements.on('ready', onReady);
    elements.on('error', onError);

    return () => {
      clearTimeout(timeoutRef.current);
      elements.off('ready', onReady);
      elements.off('error', onError);
    };
  }, [stripe, elements]);

  const handleRetry = () => {
    window.location.reload(); // Simple retry by reloading the page/modal context
  };

  return (
    <div id="checkout" className="relative min-h-[250px]">
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-10">
          <Loader className="animate-spin text-amber-500 w-8 h-8" />
          <p className="mt-4 text-slate-600">Mounting payment form...</p>
        </div>
      )}
      {(status === 'error' || status === 'timeout') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 z-10">
          <AlertTriangle className="text-red-500 w-8 h-8" />
          <p className="mt-4 font-semibold text-red-700">Failed to Load Payment Form</p>
          <p className="mt-1 text-sm text-red-600 text-center">
            {status === 'timeout' 
              ? "The connection timed out. Please check your network."
              : "An unexpected error occurred."
            }
          </p>
          <Button variant="destructive" size="sm" onClick={handleRetry} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload
          </Button>
        </div>
      )}
      <StripeEmbeddedCheckoutComponent />
    </div>
  );
};

const EmbeddedCheckout = () => {
  const stripe = useStripe();
  const { clientSecret } = useElements()?.getElement('embeddedCheckout')?.props || {};

  if (!stripe || !clientSecret) {
    console.log('[EmbeddedCheckout] Provider not ready.');
    return (
        <div className="flex flex-col items-center justify-center p-8 h-64">
            <Loader className="animate-spin text-amber-500 w-8 h-8" />
            <p className="mt-4 text-slate-600">Preparing payment provider...</p>
        </div>
    );
  }

  const options = { clientSecret };

  return (
    <EmbeddedCheckoutProvider stripe={stripe} options={options}>
      <CheckoutForm />
    </EmbeddedCheckoutProvider>
  );
};

export default EmbeddedCheckout;
