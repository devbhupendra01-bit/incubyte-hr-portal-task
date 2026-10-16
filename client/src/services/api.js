const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('esms_token') || '';
}

export function setToken(token) {
  token ? localStorage.setItem('esms_token', token) : localStorage.removeItem('esms_token');
}

function clearUser() {
  localStorage.removeItem('esms_user');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken('');
    clearUser();
    window.dispatchEvent(new Event('auth:expired'));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || (data.errors?.join(', ')) || 'An error occurred');
  }

  return data;
}

export const api = {
  async login(emailOrUsername, password) {
    const res = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: emailOrUsername, password }) });
    setToken(res.token);
    return res;
  },

  async register(username, email, password) {
    return request('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
  },

  logout() {
    setToken('');
    clearUser();
    window.dispatchEvent(new Event('auth:changed'));
  },

  async getEmployees({ page = 1, limit = 20, search = '', department = '', country = '', sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    if (department) params.append('department', department);
    if (country) params.append('country', country);
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);
    return request(`/employees?${params}`);
  },

  getFilters: () => request('/employees/filters'),

  async getEmployeeSuggestions(query) {
    if (!query?.trim()) return [];
    return request(`/employees/suggestions?${new URLSearchParams({ q: query.trim() })}`);
  },

  getEmployee: (id) => request(`/employees/${id}`),

  createEmployee: (payload) => request('/employees', { method: 'POST', body: JSON.stringify(payload) }),

  updateEmployee: (id, payload) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),

  getDashboardStats: () => request('/dashboard/stats'),
  getMonthlyTrend: () => request('/dashboard/monthly-trend'),
  getDeptPayroll: () => request('/dashboard/dept-payroll'),
  getDashboardSummary: () => request('/dashboard/summary'),
  getDepartmentReport: () => request('/dashboard/by-department'),
  getCountryReport: () => request('/dashboard/by-country'),

  async getPayments({ page = 1, limit = 15, search = '', month = '', status = '', method = '', sortBy = 'paymentDate', sortOrder = 'desc' } = {}) {
    const params = new URLSearchParams({ page, limit, sortBy, sortOrder });
    if (search) params.append('search', search);
    if (month && month !== 'all') params.append('month', month);
    if (status && status !== 'all') params.append('status', status);
    if (method && method !== 'all') params.append('method', method);
    return request(`/payments?${params}`);
  },

  getRecentPayments: () => request('/payments/recent'),
  getPaymentMonths: () => request('/payments/months'),
  getPaymentSummary: () => request('/payments/summary'),

  createPayment: (payload) => request('/payments', { method: 'POST', body: JSON.stringify(payload) }),

  updatePaymentStatus: (id, status, remarks = '') =>
    request(`/payments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, remarks }) }),

  deletePayment: (id) => request(`/payments/${id}`, { method: 'DELETE' })
};
