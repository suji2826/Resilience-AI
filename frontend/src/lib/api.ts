import { CopilotResponse } from '../types';

const envApiUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE = envApiUrl
  ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl.replace(/\/$/, '')}/api`)
  : '/api';

export type ApiErrorKind =
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'GEMINI_ERROR'
  | 'DATABASE_ERROR'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'DEMO_MODE';

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  technicalDetails?: string;

  constructor(kind: ApiErrorKind, message: string, status?: number, technicalDetails?: string) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.technicalDetails = technicalDetails;
  }
}

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('resilience_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Track if an auto-refresh is in progress to avoid concurrent storms
let isRefreshingAuth = false;
let authRefreshPromise: Promise<string | null> | null = null;

async function attemptDemoReauth(): Promise<string | null> {
  if (isRefreshingAuth && authRefreshPromise) {
    return authRefreshPromise;
  }
  isRefreshingAuth = true;
  authRefreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'national.admin@resilience.gov.in', password: 'resilience2026' }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('resilience_token', data.access_token);
        localStorage.setItem('resilience_user', JSON.stringify(data.user));
        window.dispatchEvent(new CustomEvent('resilience:auth_refreshed', { detail: data.user }));
        return data.access_token;
      }
      return null;
    } catch {
      return null;
    } finally {
      isRefreshingAuth = false;
      authRefreshPromise = null;
    }
  })();
  return authRefreshPromise;
}

async function requestWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryOn401 = true
): Promise<T> {
  let res: Response;
  try {
    const headers = { ...getHeaders(), ...(options.headers || {}) };
    res = await fetch(url, { ...options, headers });
  } catch (err: any) {
    console.warn('[API Network Error]', err);
    throw new ApiError(
      'NETWORK_ERROR',
      'Unable to reach the Resilience AI backend. Please check that the server is running on port 8000 and try again.',
      0,
      err.message
    );
  }

  // If 401 Unauthorized occurs, handle token expiry cleanly
  if (res.status === 401) {
    if (retryOn401) {
      console.warn('[API 401] Token invalid/expired. Attempting automatic demo session renewal...');
      localStorage.removeItem('resilience_token');
      localStorage.removeItem('resilience_user');
      const newToken = await attemptDemoReauth();
      if (newToken) {
        // Retry the request once with the new token
        const retryHeaders = { ...getHeaders(), ...(options.headers || {}) };
        return requestWithRetry<T>(url, { ...options, headers: retryHeaders }, false);
      }
    }

    localStorage.removeItem('resilience_token');
    localStorage.removeItem('resilience_user');
    window.dispatchEvent(new CustomEvent('resilience:auth_expired'));
    throw new ApiError(
      'AUTHENTICATION_ERROR',
      'Your session could not be verified. Please sign in again.',
      401,
      'Could not validate credentials'
    );
  }

  if (res.status === 403) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(
      'AUTHORIZATION_ERROR',
      errorBody.detail || 'Access forbidden: Your role lacks required permissions for this action.',
      403,
      errorBody.detail
    );
  }

  if (res.status === 404) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(
      'NOT_FOUND',
      errorBody.detail || 'The requested healthcare record was not found.',
      404,
      errorBody.detail
    );
  }

  if (res.status >= 500) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(
      'SERVER_ERROR',
      'Healthcare telemetry service encountered a server error. Please try again shortly.',
      res.status,
      errorBody.detail
    );
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(
      'VALIDATION_ERROR',
      errorBody.detail || 'API request failed.',
      res.status,
      errorBody.detail
    );
  }

  return res.json();
}

export const api = {
  // System Health
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded';
    service: string;
    database: string;
    env: string;
    version: string;
  }> {
    return requestWithRetry(`${API_BASE}/health`, { method: 'GET' }, false);
  },

  // Auth
  async login(email: string, password: string = 'resilience2026') {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new ApiError('AUTHENTICATION_ERROR', errorBody.detail || 'Invalid email or password', res.status);
    }
    return res.json();
  },

  async getDemoUsers() {
    return requestWithRetry<any[]>(`${API_BASE}/auth/demo-users`, { method: 'GET' }, false);
  },

  async getMe() {
    return requestWithRetry<any>(`${API_BASE}/auth/me`, { method: 'GET' });
  },

  // Dashboard
  async getDashboard() {
    return requestWithRetry<any>(`${API_BASE}/dashboard`, { method: 'GET' });
  },

  // PHCs
  async getPhcs(params?: {
    search?: string;
    state?: string;
    district?: string;
    risk?: string;
    tier?: string;
    skip?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return requestWithRetry<{ total: number; items: any[] }>(`${API_BASE}/phcs?${query}`, { method: 'GET' });
  },

  async getPhcDetail(id: number) {
    return requestWithRetry<any>(`${API_BASE}/phcs/${id}`, { method: 'GET' });
  },

  // Inventory
  async getInventory(params?: {
    search?: string;
    risk?: string;
    district?: string;
    state?: string;
    medicine?: string;
    category?: string;
    skip?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return requestWithRetry<{ total: number; items: any[] }>(`${API_BASE}/inventory?${query}`, { method: 'GET' });
  },

  async getInventoryDetail(id: number) {
    return requestWithRetry<any>(`${API_BASE}/inventory/${id}`, { method: 'GET' });
  },

  // Forecast
  async getForecast(phcId?: number, medicineId?: number, horizonDays: number = 7) {
    const params = new URLSearchParams();
    if (phcId) params.append('phc_id', phcId.toString());
    if (medicineId) params.append('medicine_id', medicineId.toString());
    params.append('horizon_days', horizonDays.toString());
    return requestWithRetry<any>(`${API_BASE}/forecast?${params.toString()}`, { method: 'GET' });
  },

  async getFacilityForecast(phcId: number, horizonDays: number = 7) {
    return requestWithRetry<any[]>(`${API_BASE}/forecast/facility/${phcId}?horizon_days=${horizonDays}`, { method: 'GET' });
  },

  // Risk
  async getRiskScores(params?: { risk_level?: string; district?: string; state?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return requestWithRetry<{ total: number; items: any[] }>(`${API_BASE}/risk?${query}`, { method: 'GET' });
  },

  async getRiskSummary() {
    return requestWithRetry<any>(`${API_BASE}/risk/summary`, { method: 'GET' });
  },

  // Anomalies
  async getAnomalies() {
    return requestWithRetry<any>(`${API_BASE}/anomalies`, { method: 'GET' });
  },

  // Alerts
  async getAlerts(params?: { status?: string; severity?: string; category?: string; district?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return requestWithRetry<any[]>(`${API_BASE}/alerts?${query}`, { method: 'GET' });
  },

  async updateAlert(id: number, action: 'acknowledge' | 'resolve' | 'dismiss', notes?: string) {
    return requestWithRetry<any>(`${API_BASE}/alerts/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    });
  },

  // Workforce
  async getWorkforce() {
    return requestWithRetry<any>(`${API_BASE}/workforce`, { method: 'GET' });
  },

  // Resources / Beds
  async getResources() {
    return requestWithRetry<any>(`${API_BASE}/resources`, { method: 'GET' });
  },

  // Redistribution
  async getRedistributions(status?: string) {
    const query = status ? `?status=${status}` : '';
    return requestWithRetry<any[]>(`${API_BASE}/redistribution${query}`, { method: 'GET' });
  },

  async approveRedistribution(id: number) {
    return requestWithRetry<any>(`${API_BASE}/redistribution/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
    });
  },

  async rejectRedistribution(id: number, notes?: string) {
    return requestWithRetry<any>(`${API_BASE}/redistribution/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', notes }),
    });
  },

  async completeRedistribution(id: number) {
    return requestWithRetry<any>(`${API_BASE}/redistribution/${id}/complete`, {
      method: 'POST',
    });
  },

  async generateRedistributions() {
    return requestWithRetry<any>(`${API_BASE}/redistribution/generate`, {
      method: 'POST',
    });
  },

  // Emergency
  async getEmergencyStatus() {
    return requestWithRetry<any>(`${API_BASE}/emergency/status`, { method: 'GET' });
  },

  async simulateEmergency(eventType: string = 'DENGUE_OUTBREAK', districtName: string = 'Namakkal') {
    return requestWithRetry<any>(`${API_BASE}/emergency/simulate`, {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType, affected_district_name: districtName }),
    });
  },

  async resetEmergency() {
    return requestWithRetry<any>(`${API_BASE}/emergency/reset`, {
      method: 'POST',
    });
  },

  // Federated AI
  async getFederatedNodes() {
    return requestWithRetry<any[]>(`${API_BASE}/federated/nodes`, { method: 'GET' });
  },

  async getFederatedRounds() {
    return requestWithRetry<any[]>(`${API_BASE}/federated/rounds`, { method: 'GET' });
  },

  async trainFederatedRound(epochs: number = 5) {
    return requestWithRetry<any>(`${API_BASE}/federated/train`, {
      method: 'POST',
      body: JSON.stringify({ epochs_per_node: epochs }),
    });
  },

  // Copilot
  async queryCopilot(query: string, contextFilters?: Record<string, any>): Promise<CopilotResponse> {
    return requestWithRetry<CopilotResponse>(`${API_BASE}/copilot/query`, {
      method: 'POST',
      body: JSON.stringify({ query, context_filters: contextFilters }),
    });
  },

  async getCopilotStatus(): Promise<{
    mode: 'LIVE_GEMINI' | 'GROUNDED_FALLBACK_DEMO';
    is_api_key_configured: boolean;
    model: string;
    grounding_source: string;
    zero_fabrication_guarantee: boolean;
  }> {
    return requestWithRetry<any>(`${API_BASE}/copilot/status`, { method: 'GET' });
  },

  // Analytics
  async getAnalytics(rangeDays: number = 30, state?: string, district?: string, medicine?: string) {
    const params = new URLSearchParams();
    params.append('range_days', rangeDays.toString());
    if (state && state !== 'All') params.append('state', state);
    if (district && district !== 'All') params.append('district', district);
    if (medicine && medicine !== 'All') params.append('medicine', medicine);
    return requestWithRetry<any>(`${API_BASE}/analytics?${params.toString()}`, { method: 'GET' });
  },

  // Audit
  async getAuditLogs() {
    return requestWithRetry<any[]>(`${API_BASE}/audit`, { method: 'GET' });
  },
};
