
import { supabase } from '@/lib/customSupabaseClient';
import { metalPriceApi } from '@/lib/backendApi';

export const fetchMetalPrices = async () => {
  const { data, error } = await metalPriceApi.list();

  if (error) {
    console.error('Error fetching metal prices from backend:', error);
    throw new Error(error.message || 'Failed to fetch metal prices.');
  }

  const entries = data?.data || [];
  const priceMap = entries.reduce((acc, entry) => {
    const symbol = entry?.metalSymbol || entry?.metal_symbol;
    if (!symbol) return acc;
    acc[symbol.toLowerCase()] = entry.price ?? acc[symbol.toLowerCase()];
    return acc;
  }, { gold: 0, silver: 0 });

  return {
    gold: Number(priceMap.gold ?? 0),
    silver: Number(priceMap.silver ?? 0),
  };
};

export const triggerPriceUpdate = async () => {
  const { data, error } = await metalPriceApi.sync();
  if (error) {
    console.error('Error triggering backend price sync:', error);
    throw new Error(error.message || 'Failed to trigger price update.');
  }
  return data;
};

export const createCheckoutSession = async (payload) => {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: payload,
  });

  if (error) {
    console.error('Error invoking create-checkout-session:', error);
    throw new Error(error.message || 'Failed to create checkout session.');
  }
  
  if (data.error) {
    console.error('Function returned a structured error:', data.error);
    const errorMessage = data.error.message || 'An unknown error occurred inside the function.';
    throw new Error(errorMessage);
  }
  
  if (!data.clientSecret) {
    console.error('Invalid response received from function, clientSecret is missing:', data);
    throw new Error('Could not retrieve a valid payment session. Please try again.');
  }

  return data.clientSecret; // Return only the clientSecret string
};

export const getStripePublishableKey = async () => {
  const { data, error } = await supabase.functions.invoke('get-stripe-publishable-key');
  if (error) {
    console.error('Error fetching Stripe publishable key:', error);
    throw new Error('Could not initialize payment provider.');
  }
  if (data.error) {
    console.error('Function returned an error:', data.error);
    throw new Error(data.error.message);
  }
  if (!data.publishableKey) {
    throw new Error('Publishable key not found in response.');
  }
  return data.publishableKey;
};

export const cancelSubscription = async (subscriptionId) => {
    const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { subscription_id: subscriptionId },
    });

    if (error) {
        console.error('Error canceling subscription:', error);
        throw new Error(error.message || 'Failed to cancel subscription.');
    }
    if (data.error) {
        console.error('Function returned an error:', data.error);
        throw new Error(data.error);
    }
    return data;
};

export const getSessionStatus = async (sessionId) => {
    try {
        const { data, error } = await supabase.functions.invoke('session-status', {
            body: { session_id: sessionId },
        });

        if (error) {
            throw new Error(`Function invocation failed: ${error.message}`);
        }
        if (data.error) {
            throw new Error(`Server error: ${data.error}`);
        }
        
        return data;

    } catch(err) {
        console.error("Error fetching session status:", err);
        throw err;
    }
};

export const syncStripeSubscriptions = async (email) => {
  const { data, error } = await supabase.functions.invoke('sync-stripe-subscriptions', {
    body: { email },
  });
  if (error) {
    console.error('Error syncing Stripe subscriptions:', error);
    // Don't throw here, as it might break the dashboard load.
    // The error is already logged.
  }
  return { data, error };
};
