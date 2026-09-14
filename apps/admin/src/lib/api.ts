import { ApiError, createApiClient } from '@eco-oil/api-client';
import type {
  AdminAlert,
  AdminAiAnomaliesResponse,
  AdminAnomalyFeedback,
  AdminAiAnomalyPerformanceResponse,
  AnomalyFeedbackVerdict,
  AdminCollectorPerformance,
  AdminCollectorSummary,
  AdminCollectorInviteResponse,
  AdminActiveRoutesResponse,
  AdminMerchantSummary,
  AdminOperationsMapResponse,
  AdminOverviewResponse,
  AdminPickupForecastPerformanceResponse,
  AdminImageGradingPerformanceResponse,
  AdminReconciliationResponse,
  AdminStationSummary,
  AdminContainerSummary,
  AdminContainerReturnRequest,
  AdminWardSummary,
  AuthUser,
  OilPriceRecord,
  PagedResponse,
  PaymentListResponse,
  PaymentRecord,
  PaymentRunResponse,
} from '@eco-oil/shared-types';
import { browserTokenStorage } from './storage';
import { DEMO_OFFLINE } from './demo-mode';
/**
 * Dữ liệu mẫu nạp động. Ở bản chạy thật DEMO_OFFLINE là hằng false ngay lúc
 * build, nên nhánh demo bị loại khỏi gói và người dùng không phải tải về.
 */
const loadDemoMap = () => import('./demo-operations-map');
const loadDemoOverview = () => import('./demo-admin-overview');
const loadDemoAi = () => import('./demo-admin-ai');
const loadDemoStore = () => import('./demo-admin-store');

export { ApiError };

export type StationFillForecast = {
  average_daily_incoming_liters: number;
  remaining_capacity_liters: number;
  estimated_days_until_full: number | null;
  projected_volumes: Array<{ day: number; volume_liters: number }>;
  status: 'INSUFFICIENT_DATA' | 'FULL' | 'CRITICAL' | 'WATCH' | 'STABLE';
  history_size: number;
  reason_codes: string[];
  storage_age_days?: number | null;
  days_until_storage_limit?: number | null;
  max_storage_days?: number;
  storage_age_status?: 'INSUFFICIENT_DATA' | 'STABLE' | 'WATCH' | 'CRITICAL' | 'OVERDUE';
  effective_handling_days?: number | null;
  explanation: {
    summary: string;
    used_daily_incoming_liters: number[];
    calculation_window_days: number;
    formula: string;
  };
};

export type StationSummaryWithForecast = AdminStationSummary & {
  fill_forecast?: StationFillForecast;
};

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1').replace(/\/$/, '');

const client = createApiClient({
  baseUrl: API_BASE_URL,
  storage: browserTokenStorage,
  credentials: 'include',
});

const query = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const result = search.toString();
  return result ? `?${result}` : '';
};

export const api = {
  loginSeed: (zaloId: string, phone: string) =>
    client.request<{ access_token: string; refresh_token: string; user: AuthUser }>('/auth/zalo', {
      method: 'POST',
      body: { zalo_id: zaloId, phone },
      retry: false,
    }),
  adminLogin: (zaloId: string, phone: string) =>
    client.request<{ access_token: string; refresh_token: string; user: AuthUser }>(
      '/auth/admin/login',
      { method: 'POST', body: { zalo_id: zaloId, phone }, retry: false },
    ),
  me: () => client.request<AuthUser>('/auth/me'),
  logout: (refreshToken?: string) =>
    client.request('/auth/logout', {
      method: 'POST',
      ...(refreshToken ? { body: { refresh_token: refreshToken } } : {}),
    }),
  overview: (from?: string, to?: string) =>
    DEMO_OFFLINE
      ? loadDemoOverview().then((module) => module.demoOverview(from, to))
      : client.request<AdminOverviewResponse>(`/admin/overview${query({ from, to })}`),
  operationsMap: (params: { ward_id?: string; only_at_risk?: boolean } = {}) =>
    DEMO_OFFLINE
      ? loadDemoMap().then((module) => module.demoOperationsMap(params.ward_id, params.only_at_risk))
      : client.request<AdminOperationsMapResponse>(`/admin/operations-map${query(params)}`),
  activeRoutes: () =>
    DEMO_OFFLINE
      ? loadDemoMap().then((module) => ({ data: module.demoActiveRoutes() }))
      : client.request<AdminActiveRoutesResponse>('/admin/routes'),
  pickupForecastPerformance: (windowDays: 30 | 90 | 180 = 90) =>
    DEMO_OFFLINE
      ? loadDemoAi().then((module) => module.demoPickupForecastPerformance(windowDays))
      : client.request<AdminPickupForecastPerformanceResponse>(
      `/admin/ai-performance/pickup-forecast${query({ window_days: windowDays })}`,
    ),
  imageGradingPerformance: (windowDays: 30 | 90 | 180 = 90) =>
    DEMO_OFFLINE
      ? loadDemoAi().then((module) => module.demoImageGradingPerformance(windowDays))
      : client.request<AdminImageGradingPerformanceResponse>(
      `/admin/ai-performance/image-grading${query({ window_days: windowDays })}`,
    ),
  aiAnomalies: (
    params: {
      window_days?: 30 | 90 | 180;
      risk_level?: string;
      verdict?: AnomalyFeedbackVerdict;
      page?: number;
      limit?: number;
    } = {},
  ) =>
    DEMO_OFFLINE
      ? loadDemoAi().then((module) => module.demoAiAnomalies(params))
      : client.request<AdminAiAnomaliesResponse>(
          `/admin/ai-anomalies${query({ window_days: 90, page: 1, limit: 100, ...params })}`,
        ),
  updateAiAnomalyFeedback: (
    transactionId: string,
    body: { verdict: AnomalyFeedbackVerdict; note?: string },
  ) =>
    DEMO_OFFLINE
      ? loadDemoAi().then((module) => module.demoUpdateAnomalyFeedback(transactionId, body))
      : client.request<AdminAnomalyFeedback>(`/admin/ai-anomalies/${transactionId}/feedback`, {
          method: 'PUT',
          body,
        }),
  aiAnomalyPerformance: (windowDays: 30 | 90 | 180 = 90) =>
    DEMO_OFFLINE
      ? loadDemoAi().then((module) => module.demoAnomalyPerformance(windowDays))
      : client.request<AdminAiAnomalyPerformanceResponse>(
      `/admin/ai-performance/anomaly-detection${query({ window_days: windowDays })}`,
    ),
  reconciliation: (date: string) =>
    DEMO_OFFLINE
      ? loadDemoAi().then((module) => module.demoReconciliation(date))
      : client.request<AdminReconciliationResponse>(`/admin/reconciliation?date=${date}`),
  reconciliationCsv: (date: string) =>
    DEMO_OFFLINE
      ? loadDemoAi().then((module) => module.demoReconciliationCsv(date))
      : client.request<string>(`/admin/reconciliation/export?date=${date}`),
  alerts: (params: { type?: string; resolved?: boolean; page?: number; limit?: number }) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoAlertList(params))
      : client.request<PagedResponse<AdminAlert>>(`/admin/alerts${query(params)}`),
  resolveAlert: (id: string) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoResolveAlert(id))
      : client.request<AdminAlert>(`/admin/alerts/${id}/resolve`, { method: 'PATCH' }),
  stations: async (): Promise<PagedResponse<StationSummaryWithForecast>> => {
    if (DEMO_OFFLINE) return (await loadDemoStore()).demoStations();
    const response = await client.request<
      PagedResponse<Omit<StationSummaryWithForecast, 'fill_pct'> & { fill_pct?: number }>
    >('/stations?page=1&limit=100&include_inactive=true');
    return {
      ...response,
      data: response.data.map((station) => ({
        ...station,
        fill_pct:
          station.fill_pct ??
          (station.capacity_l > 0 ? (station.current_volume_l / station.capacity_l) * 100 : 0),
      })),
    };
  },
  createStation: (body: {
    name: string;
    address: string;
    ward_id: string;
    capacity_liters: number;
    lat: number;
    lng: number;
    status: 'ACTIVE' | 'INACTIVE';
  }) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoCreateStation(body))
      : client.request<StationSummaryWithForecast>('/stations', { method: 'POST', body }),
  updateStation: (
    id: string,
    body: {
      name?: string;
      address?: string;
      ward_id?: string;
      capacity_liters?: number;
      lat?: number;
      lng?: number;
    },
  ) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoUpdateStation(id, body))
      : client.request<StationSummaryWithForecast>(`/stations/${id}`, { method: 'PATCH', body }),
  updateStationStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoUpdateStationStatus(id, status))
      : client.request<StationSummaryWithForecast>(`/stations/${id}/status`, {
          method: 'PATCH',
          body: { status },
        }),
  merchants: (params: { search?: string; anomaly?: boolean; status?: string }) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoMerchants(params))
      : client.request<PagedResponse<AdminMerchantSummary>>(
          `/admin/merchants${query({ page: 1, limit: 100, ...params })}`,
        ),
  updateMerchant: (
    id: string,
    body: {
      name: string;
      phone: string;
      address: string;
      business_type?: string;
      ward_id: string;
      lat?: number;
      lng?: number;
    },
  ) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoUpdateMerchant(id, body))
      : client.request(`/merchants/${id}`, { method: 'PATCH', body }),
  collectors: () =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoCollectors())
      : client.request<PagedResponse<AdminCollectorSummary>>(
          '/admin/collectors?page=1&limit=100&include_inactive=true',
        ),
  collectorPerformance: (id: string) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoCollectorPerformance(id))
      : client.request<AdminCollectorPerformance>(`/admin/collectors/${id}/performance`),
  approveMerchant: (id: string, body: { lat: number; lng: number }) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoApproveMerchant(id, body))
      : client.request(`/admin/merchants/${id}/approve`, { method: 'POST', body }),
  rejectMerchant: (id: string, reason: string) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoRejectMerchant(id, reason))
      : client.request(`/admin/merchants/${id}/reject`, { method: 'POST', body: { reason } }),
  createCollector: (body: {
    name: string;
    phone: string;
    vehicle_type: string;
    max_capacity_l: number;
    ward_ids: string[];
  }) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoCreateCollector(body))
      : client.request<AdminCollectorInviteResponse>('/admin/collectors', { method: 'POST', body }),
  regenerateCollectorInvite: (id: string) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoRegenerateCollectorInvite(id))
      : client.request<AdminCollectorInviteResponse>('/admin/collectors/' + id + '/invite', {
          method: 'POST',
        }),
  updateCollector: (id: string, body: Record<string, unknown>) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoUpdateCollector(id, body))
      : client.request(`/admin/collectors/${id}`, { method: 'PATCH', body }),
  containers: (params: { state?: string; merchant_id?: string; unassigned?: boolean } = {}) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoContainers(params))
      : client.request<PagedResponse<AdminContainerSummary>>(
          `/admin/containers${query({ page: 1, limit: 100, ...params })}`,
        ),
  wards: (includeInactive = false) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoWards())
      : client.request<AdminWardSummary[]>(`/admin/wards?include_inactive=${includeInactive}`),
  createWard: (body: {
    code: string;
    name: string;
    district: string;
    city: string;
    center_lat?: number;
    center_lng?: number;
  }) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoCreateWard(body))
      : client.request<AdminWardSummary>('/admin/wards', { method: 'POST', body }),
  updateWard: (id: string, body: Record<string, unknown>) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoUpdateWard(id, body))
      : client.request<AdminWardSummary>(`/admin/wards/${id}`, { method: 'PATCH', body }),
  createContainer: (body: {
    ward_id?: string;
    ward_code?: string;
    capacity_liters: number;
    qr_code?: string;
  }) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoCreateContainer(body))
      : client.request<AdminContainerSummary>('/admin/containers', { method: 'POST', body }),
  assignContainer: (id: string, merchant_id: string) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoAssignContainer(id, merchant_id))
      : client.request<AdminContainerSummary>(`/admin/containers/${id}/assign`, {
          method: 'POST',
          body: { merchant_id },
        }),
  unassignContainer: (id: string) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoUnassignContainer(id))
      : client.request<AdminContainerSummary>(`/admin/containers/${id}/unassign`, { method: 'POST' }),
  returnContainerToMerchant: (id: string, body: AdminContainerReturnRequest) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoReturnContainerToMerchant(id))
      : client.request<AdminContainerSummary>(`/admin/containers/${id}/return-to-merchant`, {
          method: 'POST',
          body,
        }),
  cancelContainerTransit: (id: string, body: { note?: string }) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoCancelContainerTransit(id))
      : client.request<AdminContainerSummary & { affected_transaction_ids: string[] }>(
          `/admin/containers/${id}/cancel-transit`,
          { method: 'POST', body },
        ),
  payments: (params: {
    period?: string;
    merchant_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoPayments(params))
      : client.request<PaymentListResponse>(`/admin/payments${query(params)}`),
  runPayments: (period: string) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoRunPayments(period))
      : client.request<PaymentRunResponse>(`/admin/payments/run?period=${encodeURIComponent(period)}`, {
          method: 'POST',
        }),
  markPaymentPaid: (id: string) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoMarkPaymentPaid(id))
      : client.request<PaymentRecord>(`/admin/payments/${id}/mark-paid`, { method: 'POST' }),
  oilPrices: () =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoOilPrices())
      : client.request<OilPriceRecord[]>('/admin/oil-prices'),
  createOilPrice: (body: {
    unit_price: number;
    unit?: 'PER_LITER' | 'PER_KG';
    effective_from?: string;
    note?: string;
  }) =>
    DEMO_OFFLINE
      ? loadDemoStore().then((module) => module.demoCreateOilPrice(body))
      : client.request<OilPriceRecord>('/admin/oil-prices', { method: 'POST', body }),
};
