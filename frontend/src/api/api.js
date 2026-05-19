const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");

async function request(endpoint, options = {}) {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  root: () => request("/"),
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  getStores: () => request("/stores"),
  getUsers: () => request("/users"),
  getProducts: () => request("/products"),
  getStock: () => request("/stock"),
  getManagerStock: () => request("/manager/stock"),
  getPromotions: () => request("/promotions"),

  createOrder: (data) => request("/orders", { method: "POST", body: JSON.stringify(data) }),
  getOrders: () => request("/orders"),
  searchOrders: (query) => request(`/orders/search?query=${encodeURIComponent(query)}`),
  updateOrderStatus: (orderId, status) =>
    request(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  confirmPayment: (data) =>
    request("/payments/confirm", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createStripeCheckoutSession: (data) =>
    request("/payments/stripe/create-checkout-session", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  markStripePaymentPaid: (orderId, sessionId) =>
    request(`/payments/stripe/mark-paid/${orderId}?session_id=${encodeURIComponent(sessionId || "")}`, {
      method: "POST",
    }),

  getReceipt: (orderId) => request(`/orders/${orderId}/receipt`),

  createWarranty: (data) =>
    request("/warranty", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getWarranty: () => request("/warranty"),

  updateWarrantyStatus: (claimId, status) =>
    request(`/warranty/${claimId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
