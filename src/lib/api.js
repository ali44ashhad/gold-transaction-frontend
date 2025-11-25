
import { supabase } from '@/lib/customSupabaseClient';
import { metalPriceApi, checkoutApi, orderApi, cancellationRequestApi } from '@/lib/backendApi';

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
  const { data, error } = await checkoutApi.createSession(payload);

  if (error) {
    throw new Error(error.details || error.message || 'Failed to create checkout session.');
  }

  if (!data?.url || !data?.sessionId || !data?.orderId) {
    throw new Error('Server response missing checkout session details.');
  }

  return data;
};

export const cancelSubscription = async (
  subscriptionId,
  { reason, details, preferredCancellationDate } = {}
) => {
  if (!subscriptionId) {
    throw new Error('subscriptionId is required');
  }

  const payload = {
    subscriptionId,
    reason,
    details,
    preferredCancellationDate,
  };

  const { data, error } = await cancellationRequestApi.create(payload);
  if (error) {
    console.error('Error creating cancellation request:', error);
    throw new Error(error.message || 'Failed to submit cancellation request.');
  }

  return data?.request;
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

export const fetchOrderById = async (orderId) => {
  const { data, error } = await orderApi.getById(orderId);
  if (error) {
    throw new Error(error.message || 'Failed to load order.');
  }
  return data?.data || null;
};

export const queryOrders = async (params = {}) => {
  const { data, error } = await orderApi.query(params);
  if (error) {
    throw new Error(error.message || 'Failed to query orders.');
  }
  return data?.data || [];
};
