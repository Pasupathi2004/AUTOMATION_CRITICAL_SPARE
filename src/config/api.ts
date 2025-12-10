// API Configuration for environment flexibility
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
  },
  INVENTORY: {
    LIST: `${API_BASE_URL}/inventory`,
    CREATE: `${API_BASE_URL}/inventory`,
    UPDATE: (id: string) => `${API_BASE_URL}/inventory/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/inventory/${id}`,
    BULK_UPLOAD: `${API_BASE_URL}/inventory/bulk-upload`,
  },
  TRANSACTIONS: `${API_BASE_URL}/transactions`,
  TRANSACTION_UPDATE: (id: string) => `${API_BASE_URL}/transactions/${id}`,
  ANALYTICS: {
    DASHBOARD: `${API_BASE_URL}/analytics/dashboard`,
    REPORTS: `${API_BASE_URL}/analytics/reports`,
    INTEGRITY: `${API_BASE_URL}/analytics/integrity`,
    SETTINGS: {
      STORAGE: `${API_BASE_URL}/analytics/settings/storage`,
    },
  },
  REQUESTS: {
    LIST: `${API_BASE_URL}/requests`,
    UPDATE: (id: string) => `${API_BASE_URL}/requests/${id}`,
  },
  USERS: {
    LIST: `${API_BASE_URL}/users`,
    CREATE: `${API_BASE_URL}/users`,
    UPDATE: (id: string) => `${API_BASE_URL}/users/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/users/${id}`,
  },
  HEALTH: `${API_BASE_URL.replace(/\/api$/, '')}/health`,
}; 