const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

// Helper function to make API requests with credentials
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    credentials: 'include', // Important for cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Debug log for withdrawal-related requests
  const isWithdrawalRequest = endpoint.includes('withdrawal-requests');
  if (isWithdrawalRequest) {
    console.log('[DEBUG] apiRequest - Making request', {
      url,
      method: options.method || 'GET',
      endpoint,
      hasBody: !!options.body,
      bodyPreview: options.body ? (options.body.length > 200 ? options.body.substring(0, 200) + '...' : options.body) : null,
    });
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (isWithdrawalRequest) {
      console.log('[DEBUG] apiRequest - Response received', {
        url,
        status: response.status,
        ok: response.ok,
        data,
      });
    }

    if (!response.ok) {
      if (isWithdrawalRequest) {
        console.error('[DEBUG] apiRequest - Request failed', {
          url,
          status: response.status,
          error: data.error,
          details: data.details,
        });
      }
      return {
        error: {
          message: data.error || 'An error occurred',
          details: data.details,
        },
        data: null,
      };
    }

    return { data, error: null };
  } catch (error) {
    if (isWithdrawalRequest) {
      console.error('[DEBUG] apiRequest - Network/parsing error', {
        url,
        error: error.message,
        stack: error.stack,
      });
    }
    return { error: { message: error.message || 'Network error' }, data: null };
  }
};

const buildQueryString = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );
  if (entries.length === 0) return '';
  const query = new URLSearchParams();
  entries.forEach(([key, value]) => query.append(key, value));
  return `?${query.toString()}`;
};

// Auth API functions
export const authApi = {
  signUp: async (email, password, userData) => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        firstName: userData.firstName || userData.data?.first_name,
        lastName: userData.lastName || userData.data?.last_name,
        phone: userData.phone || userData.data?.phone,
        billingAddress: userData.billingAddress || userData.data?.billing_address,
        shippingAddress: userData.shippingAddress || userData.data?.shipping_address,
      }),
    });
  },

  signIn: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  signOut: async () => {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },

  getCurrentUser: async () => {
    return apiRequest('/auth/me', {
      method: 'GET',
    });
  },

  sendPasswordResetEmail: async (email) => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token, password) => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },
};

// User API functions
export const userApi = {
  listUsers: async () => {
    return apiRequest('/users', {
      method: 'GET',
    });
  },

  updateUserRole: async (userId, newRole) => {
    return apiRequest(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole }),
    });
  },

  updateProfile: async (userData) => {
    return apiRequest('/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (userId, userData) => {
    return apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  deleteUser: async (userId) => {
    return apiRequest(`/users/${userId}`, {
      method: 'DELETE',
    });
  },
};

// Subscription API functions
export const subscriptionApi = {
  list: async (params = {}) => {
    const query = buildQueryString(params);
    return apiRequest(`/subscriptions${query}`, { method: 'GET' });
  },

  getById: async (subscriptionId) => {
    return apiRequest(`/subscriptions/${subscriptionId}`, {
      method: 'GET',
    });
  },

  create: async (payload) => {
    return apiRequest('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (subscriptionId, payload) => {
    return apiRequest(`/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  remove: async (subscriptionId) => {
    return apiRequest(`/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
    });
  },

  deletePending: async () => {
    return apiRequest('/subscriptions/pending', {
      method: 'DELETE',
    });
  },
};

export const metalPriceApi = {
  list: async () => {
    return apiRequest('/metal-prices', {
      method: 'GET',
    });
  },

  sync: async () => {
    return apiRequest('/metal-prices/sync', {
      method: 'POST',
    });
  },
};

export const checkoutApi = {
  createSession: async (payload = {}) => {
    return apiRequest('/checkout/create-session', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export const orderApi = {
  getById: async (orderId) => {
    if (!orderId) {
      throw new Error('orderId is required');
    }
    return apiRequest(`/orders/${orderId}`, {
      method: 'GET',
    });
  },
  query: async (params = {}) => {
    const query = buildQueryString(params);
    return apiRequest(`/orders${query}`, {
      method: 'GET',
    });
  },
  getBySubscriptionId: async (subscriptionId, limit = 100) => {
    if (!subscriptionId) {
      throw new Error('subscriptionId is required');
    }
    const query = buildQueryString({ limit });
    return apiRequest(`/orders/subscription/${subscriptionId}${query}`, {
      method: 'GET',
    });
  },
};

export const cancellationRequestApi = {
  list: async (params = {}) => {
    const query = buildQueryString(params);
    return apiRequest(`/cancellation-requests${query}`, {
      method: 'GET',
    });
  },
  create: async (payload) => {
    return apiRequest('/cancellation-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getById: async (requestId) => {
    if (!requestId) {
      throw new Error('requestId is required');
    }
    return apiRequest(`/cancellation-requests/${requestId}`, {
      method: 'GET',
    });
  },
  update: async (requestId, payload) => {
    if (!requestId) {
      throw new Error('requestId is required');
    }
    return apiRequest(`/cancellation-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  remove: async (requestId) => {
    if (!requestId) {
      throw new Error('requestId is required');
    }
    return apiRequest(`/cancellation-requests/${requestId}`, {
      method: 'DELETE',
    });
  },
};

export const withdrawalRequestApi = {
  list: async (params = {}) => {
    console.log('[DEBUG] withdrawalRequestApi.list called', { params });
    const query = buildQueryString(params);
    const url = `/withdrawal-requests${query}`;
    console.log('[DEBUG] Calling withdrawal API', { url, method: 'GET' });
    const result = await apiRequest(url, {
      method: 'GET',
    });
    console.log('[DEBUG] withdrawalRequestApi.list response', { result });
    return result;
  },
  create: async (payload) => {
    console.log('[DEBUG] withdrawalRequestApi.create called', { payload });
    const result = await apiRequest('/withdrawal-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    console.log('[DEBUG] withdrawalRequestApi.create response', { result });
    return result;
  },
  getById: async (requestId) => {
    if (!requestId) {
      console.error('[DEBUG] withdrawalRequestApi.getById - requestId is required');
      throw new Error('requestId is required');
    }
    console.log('[DEBUG] withdrawalRequestApi.getById called', { requestId });
    const result = await apiRequest(`/withdrawal-requests/${requestId}`, {
      method: 'GET',
    });
    console.log('[DEBUG] withdrawalRequestApi.getById response', { result });
    return result;
  },
  update: async (requestId, payload) => {
    if (!requestId) {
      console.error('[DEBUG] withdrawalRequestApi.update - requestId is required');
      throw new Error('requestId is required');
    }
    console.log('[DEBUG] withdrawalRequestApi.update called', { requestId, payload });
    const result = await apiRequest(`/withdrawal-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    console.log('[DEBUG] withdrawalRequestApi.update response', { result });
    return result;
  },
  remove: async (requestId) => {
    if (!requestId) {
      console.error('[DEBUG] withdrawalRequestApi.remove - requestId is required');
      throw new Error('requestId is required');
    }
    console.log('[DEBUG] withdrawalRequestApi.remove called', { requestId });
    const result = await apiRequest(`/withdrawal-requests/${requestId}`, {
      method: 'DELETE',
    });
    console.log('[DEBUG] withdrawalRequestApi.remove response', { result });
    return result;
  },
};

export const dashboardApi = {
  getStats: async () => {
    return apiRequest('/dashboard/stats', {
      method: 'GET',
    });
  },
  getUserStats: async () => {
    return apiRequest('/dashboard/user-stats', {
      method: 'GET',
    });
  },
};

