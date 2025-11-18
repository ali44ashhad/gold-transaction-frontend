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

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
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
};

