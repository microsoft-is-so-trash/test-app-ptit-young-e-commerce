import {
  ContainerState,
  EntityStatus,
  MerchantApprovalStatus,
  PaymentStatus,
  PriceUnit,
} from '@eco-oil/shared-types';
import type {
  AdminAlert,
  AdminCollectorInviteResponse,
  AdminCollectorPerformance,
  AdminCollectorSummary,
  AdminContainerSummary,
  AdminMerchantSummary,
  AdminStationSummary,
  AdminWardSummary,
  OilPriceRecord,
  PagedResponse,
  PaymentListResponse,
  PaymentRecord,
  PaymentRunResponse,
} from '@eco-oil/shared-types';
import {
  DEMO_COLLECTORS,
  DEMO_CONTAINERS,
  DEMO_MERCHANTS,
  DEMO_OIL_PRICES,
  DEMO_STATIONS,
  DEMO_TRANSACTIONS,
  DEMO_WARDS,
  isoDaysAgo,
  isoHoursAgo,
  merchantById,
  merchantName,
  wardById,
  type DemoCollector,
  type DemoContainer,
  type DemoMerchant,
  type DemoStation,
  type DemoWard,
} from './demo-dataset';
import { demoAlerts } from './demo-admin-ai';

/**
 * Bản sao có thể sửa của thế giới demo. Mỗi lần tải lại trang là về trạng thái
 * gốc, nhưng trong một phiên thì duyệt quán, gán can, đánh dấu đã trả tiền…
 * đều thay đổi thật để xem được cả luồng chứ không chỉ màn hình tĩnh.
 */

interface DemoState {
  wards: DemoWard[];
  merchants: DemoMerchant[];
  collectors: DemoCollector[];
  containers: DemoContainer[];
  stations: DemoStation[];
  alerts: AdminAlert[];
  paidPaymentIds: Set<string>;
  oilPrices: OilPriceRecord[];
}

function initialOilPrices(): OilPriceRecord[] {
  return DEMO_OIL_PRICES.map((price, index) => ({
    id: price.id,
    unit_price: price.unit_price,
    unit: price.unit,
    effective_from: isoDaysAgo(price.effective_from_days_ago),
    effective_to: index === 0 ? null : isoDaysAgo(DEMO_OIL_PRICES[0].effective_from_days_ago),
    note: price.note,
    created_at: isoDaysAgo(price.effective_from_days_ago),
  }));
}

const state: DemoState = {
  wards: DEMO_WARDS.map((ward) => ({ ...ward })),
  merchants: DEMO_MERCHANTS.map((merchant) => ({ ...merchant })),
  collectors: DEMO_COLLECTORS.map((collector) => ({ ...collector, ward_ids: [...collector.ward_ids] })),
  containers: DEMO_CONTAINERS.map((container) => ({ ...container })),
  stations: DEMO_STATIONS.map((station) => ({ ...station })),
  alerts: demoAlerts(),
  paidPaymentIds: new Set<string>(),
  oilPrices: initialOilPrices(),
};

/* ── Phường ── */

function toWardSummary(ward: DemoWard): AdminWardSummary {
  const merchants = state.merchants.filter((item) => item.ward_id === ward.id);
  return {
    id: ward.id,
    code: ward.code,
    name: ward.name,
    district: ward.district,
    city: ward.city,
    center_lat: ward.center_lat,
    center_lng: ward.center_lng,
    status: EntityStatus.ACTIVE,
    is_active: true,
    merchant_count: merchants.length,
    container_count: state.containers.filter((item) => item.ward_id === ward.id).length,
    collector_count: state.collectors.filter((item) => item.ward_ids.includes(ward.id)).length,
  };
}

export function demoWards(): AdminWardSummary[] {
  return state.wards.map(toWardSummary);
}

export function demoCreateWard(body: {
  code: string;
  name: string;
  district: string;
  city: string;
  center_lat?: number;
  center_lng?: number;
}): AdminWardSummary {
  const ward: DemoWard = {
    id: `demo-ward-${state.wards.length + 1}`,
    code: body.code,
    name: body.name,
    district: body.district,
    city: body.city,
    center_lat: body.center_lat ?? DEMO_WARDS[0].center_lat,
    center_lng: body.center_lng ?? DEMO_WARDS[0].center_lng,
  };
  state.wards = [...state.wards, ward];
  return toWardSummary(ward);
}

export function demoUpdateWard(id: string, body: Record<string, unknown>): AdminWardSummary {
  state.wards = state.wards.map((ward) =>
    ward.id === id
      ? {
          ...ward,
          ...(typeof body.code === 'string' ? { code: body.code } : {}),
          ...(typeof body.name === 'string' ? { name: body.name } : {}),
          ...(typeof body.district === 'string' ? { district: body.district } : {}),
          ...(typeof body.city === 'string' ? { city: body.city } : {}),
          ...(typeof body.center_lat === 'number' ? { center_lat: body.center_lat } : {}),
          ...(typeof body.center_lng === 'number' ? { center_lng: body.center_lng } : {}),
        }
      : ward,
  );
  const ward = state.wards.find((item) => item.id === id);
  if (!ward) throw new Error('Không tìm thấy phường');
  return toWardSummary(ward);
}

/* ── Quán ── */

function litersFor(merchantId: string): { total: number; count: number } {
  const rows = DEMO_TRANSACTIONS.filter((txn) => txn.merchant_id === merchantId);
  return { total: rows.reduce((sum, txn) => sum + txn.liters, 0), count: rows.length };
}

function toMerchantSummary(merchant: DemoMerchant): AdminMerchantSummary {
  const ward = wardById(merchant.ward_id);
  const history = litersFor(merchant.id);
  return {
    id: merchant.id,
    ward_id: merchant.ward_id,
    name: merchant.name,
    address: merchant.address,
    lat: merchant.lat,
    lng: merchant.lng,
    distance_m: Math.round(distanceMeters(merchant.lat, merchant.lng, DEMO_STATIONS[0].lat, DEMO_STATIONS[0].lng)),
    status: merchant.status,
    approval_status: merchant.approval_status,
    rejection_reason: merchant.rejection_reason,
    business_type: merchant.business_type,
    phone: merchant.phone,
    ward_code: ward?.code ?? null,
    ward_name: ward?.name ?? null,
    avg_daily_liters: merchant.avg_daily_liters,
    last_collected_at:
      merchant.last_collected_days_ago === null ? null : isoDaysAgo(merchant.last_collected_days_ago),
    anomaly: history.count > 0 && history.total / history.count < 5,
  };
}

/** Khoảng cách đường chim bay, đủ dùng cho dữ liệu mẫu. */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

export function demoMerchants(params: { search?: string; anomaly?: boolean; status?: string } = {}): PagedResponse<AdminMerchantSummary> {
  let rows = state.merchants.map(toMerchantSummary);
  if (params.status) rows = rows.filter((row) => row.approval_status === params.status);
  if (params.anomaly) rows = rows.filter((row) => row.anomaly);
  if (params.search) {
    const needle = params.search.trim().toLowerCase();
    rows = rows.filter(
      (row) => row.name.toLowerCase().includes(needle) || (row.phone ?? '').includes(needle),
    );
  }
  return { data: rows, meta: { page: 1, limit: 100, total: rows.length } };
}

export function demoUpdateMerchant(id: string, body: Record<string, unknown>): AdminMerchantSummary {
  state.merchants = state.merchants.map((merchant) =>
    merchant.id === id
      ? {
          ...merchant,
          ...(typeof body.name === 'string' ? { name: body.name } : {}),
          ...(typeof body.phone === 'string' ? { phone: body.phone } : {}),
          ...(typeof body.address === 'string' ? { address: body.address } : {}),
          ...(typeof body.business_type === 'string' ? { business_type: body.business_type } : {}),
          ...(typeof body.ward_id === 'string' ? { ward_id: body.ward_id } : {}),
          ...(typeof body.lat === 'number' ? { lat: body.lat } : {}),
          ...(typeof body.lng === 'number' ? { lng: body.lng } : {}),
        }
      : merchant,
  );
  const merchant = state.merchants.find((item) => item.id === id);
  if (!merchant) throw new Error('Không tìm thấy quán');
  return toMerchantSummary(merchant);
}

export function demoApproveMerchant(id: string, body: { lat: number; lng: number }): AdminMerchantSummary {
  state.merchants = state.merchants.map((merchant) =>
    merchant.id === id
      ? {
          ...merchant,
          approval_status: MerchantApprovalStatus.APPROVED,
          status: EntityStatus.ACTIVE,
          rejection_reason: null,
          lat: body.lat,
          lng: body.lng,
        }
      : merchant,
  );
  const merchant = state.merchants.find((item) => item.id === id);
  if (!merchant) throw new Error('Không tìm thấy quán');
  return toMerchantSummary(merchant);
}

export function demoRejectMerchant(id: string, reason: string): AdminMerchantSummary {
  state.merchants = state.merchants.map((merchant) =>
    merchant.id === id
      ? {
          ...merchant,
          approval_status: MerchantApprovalStatus.REJECTED,
          status: EntityStatus.INACTIVE,
          rejection_reason: reason,
        }
      : merchant,
  );
  const merchant = state.merchants.find((item) => item.id === id);
  if (!merchant) throw new Error('Không tìm thấy quán');
  return toMerchantSummary(merchant);
}

/* ── Người thu gom ── */

function toCollectorSummary(collector: DemoCollector): AdminCollectorSummary {
  const wards = collector.ward_ids
    .map((wardId) => wardById(wardId))
    .filter((ward): ward is DemoWard => ward !== undefined)
    .map((ward) => ({ id: ward.id, code: ward.code, name: ward.name }));

  const linked = collector.link_status === 'LINKED';
  return {
    id: collector.id,
    display_name: collector.display_name,
    status: collector.status,
    is_active: collector.status === EntityStatus.ACTIVE,
    link_status: collector.link_status,
    invite_status: linked ? null : 'PENDING',
    invite_expires_at: linked ? null : isoHoursAgo(-48),
    invite_url: linked ? null : `https://zalo.me/demo-invite/${collector.id}`,
    last_seen_at: linked ? isoHoursAgo(2) : null,
    wards,
    contact_phone: collector.contact_phone,
    user: linked
      ? { id: collector.user_id ?? collector.id, name: collector.display_name, phone: collector.contact_phone }
      : null,
    vehicle_type: collector.vehicle_type,
    max_capacity_l: collector.max_capacity_l,
    ward_ids: collector.ward_ids,
  };
}

export function demoCollectors(): PagedResponse<AdminCollectorSummary> {
  const rows = state.collectors.map(toCollectorSummary);
  return { data: rows, meta: { page: 1, limit: 100, total: rows.length } };
}

export function demoCollectorPerformance(id: string): AdminCollectorPerformance {
  const rows = DEMO_TRANSACTIONS.filter(
    (txn) => txn.collector_id === id && txn.hoursAgo <= 7 * 24,
  );
  const collected = rows.reduce((sum, txn) => sum + txn.liters, 0);
  const delivered = rows.filter((txn) => txn.delivered).reduce((sum, txn) => sum + txn.liters, 0);
  const variance = Number((delivered - collected).toFixed(1));
  // API trả tỷ lệ dạng phân số, giao diện tự nhân 100 khi hiển thị.
  const variancePct = collected === 0 ? 0 : Number((variance / collected).toFixed(4));
  return {
    collector_id: id,
    display_name: state.collectors.find((item) => item.id === id)?.display_name ?? 'Không rõ',
    liters_7d: Number(collected.toFixed(1)),
    collections_7d: rows.length,
    delivered_liters_7d: Number(delivered.toFixed(1)),
    variance_l: variance,
    variance_pct: variancePct,
    status: Math.abs(variancePct) > 0.02 ? 'FLAGGED' : 'OK',
  };
}

export function demoCreateCollector(body: {
  name: string;
  phone: string;
  vehicle_type: string;
  max_capacity_l: number;
  ward_ids: string[];
}): AdminCollectorInviteResponse {
  const collector: DemoCollector = {
    id: `demo-collector-${state.collectors.length + 1}`,
    display_name: body.name,
    contact_phone: body.phone,
    vehicle_type: body.vehicle_type,
    max_capacity_l: body.max_capacity_l,
    status: EntityStatus.ACTIVE,
    ward_ids: body.ward_ids,
    user_id: null,
    link_status: 'PENDING_LINK',
  };
  state.collectors = [...state.collectors, collector];
  const summary = toCollectorSummary(collector);
  return {
    collector: summary,
    invite_url: summary.invite_url ?? `https://zalo.me/demo-invite/${collector.id}`,
    invite_expires_at: summary.invite_expires_at ?? isoHoursAgo(-48),
  };
}

export function demoRegenerateCollectorInvite(id: string): AdminCollectorInviteResponse {
  const collector = state.collectors.find((item) => item.id === id);
  if (!collector) throw new Error('Không tìm thấy người thu gom');
  const summary = toCollectorSummary({ ...collector, link_status: 'PENDING_LINK' });
  return {
    collector: summary,
    invite_url: `https://zalo.me/demo-invite/${collector.id}?r=${Date.now()}`,
    invite_expires_at: isoHoursAgo(-48),
  };
}

export function demoUpdateCollector(id: string, body: Record<string, unknown>): AdminCollectorSummary {
  state.collectors = state.collectors.map((collector) =>
    collector.id === id
      ? {
          ...collector,
          ...(typeof body.name === 'string' ? { display_name: body.name } : {}),
          ...(typeof body.display_name === 'string' ? { display_name: body.display_name } : {}),
          ...(typeof body.phone === 'string' ? { contact_phone: body.phone } : {}),
          ...(typeof body.vehicle_type === 'string' ? { vehicle_type: body.vehicle_type } : {}),
          ...(typeof body.max_capacity_l === 'number' ? { max_capacity_l: body.max_capacity_l } : {}),
          ...(Array.isArray(body.ward_ids) ? { ward_ids: body.ward_ids as string[] } : {}),
          ...(body.status === EntityStatus.INACTIVE || body.status === EntityStatus.ACTIVE
            ? { status: body.status as EntityStatus }
            : {}),
        }
      : collector,
  );
  const collector = state.collectors.find((item) => item.id === id);
  if (!collector) throw new Error('Không tìm thấy người thu gom');
  return toCollectorSummary(collector);
}

/* ── Trạm ── */

function toStationSummary(station: DemoStation): AdminStationSummary {
  const ward = wardById(station.ward_id);
  return {
    id: station.id,
    user_id: `${station.id}-user`,
    ward_id: station.ward_id,
    name: station.name,
    address: station.address,
    lat: station.lat,
    lng: station.lng,
    current_volume_l: station.current_volume_l,
    capacity_l: station.capacity_l,
    fill_pct: station.capacity_l === 0 ? 0 : (station.current_volume_l / station.capacity_l) * 100,
    status: station.status,
    is_active: station.status === EntityStatus.ACTIVE,
    ward: ward ? { id: ward.id, code: ward.code, name: ward.name } : undefined,
    user: { id: `${station.id}-user`, name: station.name, phone: null },
  };
}

export function demoStations(): PagedResponse<AdminStationSummary> {
  const rows = state.stations.map(toStationSummary);
  return { data: rows, meta: { page: 1, limit: 100, total: rows.length } };
}

export function demoCreateStation(body: {
  name: string;
  address: string;
  ward_id: string;
  capacity_liters: number;
  lat: number;
  lng: number;
  status: 'ACTIVE' | 'INACTIVE';
}): AdminStationSummary {
  const station: DemoStation = {
    id: `demo-station-${state.stations.length + 1}`,
    name: body.name,
    address: body.address,
    ward_id: body.ward_id,
    lat: body.lat,
    lng: body.lng,
    capacity_l: body.capacity_liters,
    current_volume_l: 0,
    status: body.status === 'ACTIVE' ? EntityStatus.ACTIVE : EntityStatus.INACTIVE,
  };
  state.stations = [...state.stations, station];
  return toStationSummary(station);
}

export function demoUpdateStation(id: string, body: Record<string, unknown>): AdminStationSummary {
  state.stations = state.stations.map((station) =>
    station.id === id
      ? {
          ...station,
          ...(typeof body.name === 'string' ? { name: body.name } : {}),
          ...(typeof body.address === 'string' ? { address: body.address } : {}),
          ...(typeof body.ward_id === 'string' ? { ward_id: body.ward_id } : {}),
          ...(typeof body.capacity_liters === 'number' ? { capacity_l: body.capacity_liters } : {}),
          ...(typeof body.lat === 'number' ? { lat: body.lat } : {}),
          ...(typeof body.lng === 'number' ? { lng: body.lng } : {}),
        }
      : station,
  );
  const station = state.stations.find((item) => item.id === id);
  if (!station) throw new Error('Không tìm thấy trạm');
  return toStationSummary(station);
}

export function demoUpdateStationStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): AdminStationSummary {
  state.stations = state.stations.map((station) =>
    station.id === id
      ? { ...station, status: status === 'ACTIVE' ? EntityStatus.ACTIVE : EntityStatus.INACTIVE }
      : station,
  );
  const station = state.stations.find((item) => item.id === id);
  if (!station) throw new Error('Không tìm thấy trạm');
  return toStationSummary(station);
}

/* ── Can ── */

function toContainerSummary(container: DemoContainer): AdminContainerSummary {
  const merchant = container.merchant_id ? merchantById(container.merchant_id) : undefined;
  return {
    id: container.id,
    qr_code: container.qr_code,
    state: container.state,
    status: container.status,
    capacity_liters: container.capacity_liters,
    last_seen_at: container.last_seen_days_ago === null ? null : isoDaysAgo(container.last_seen_days_ago),
    merchant: merchant ? { id: merchant.id, name: merchant.name, address: merchant.address } : null,
  };
}

export function demoContainers(params: { state?: string; merchant_id?: string; unassigned?: boolean } = {}): PagedResponse<AdminContainerSummary> {
  let rows = state.containers;
  if (params.state) rows = rows.filter((item) => item.state === params.state);
  if (params.merchant_id) rows = rows.filter((item) => item.merchant_id === params.merchant_id);
  if (params.unassigned) rows = rows.filter((item) => item.merchant_id === null);
  const data = rows.map(toContainerSummary);
  return { data, meta: { page: 1, limit: 100, total: data.length } };
}

export function demoContainerById(id: string): AdminContainerSummary {
  const container = state.containers.find((item) => item.id === id);
  if (!container) throw new Error('Không tìm thấy can');
  return toContainerSummary(container);
}

export function demoCreateContainer(body: {
  ward_id?: string;
  ward_code?: string;
  capacity_liters: number;
  qr_code?: string;
}): AdminContainerSummary {
  const ward =
    state.wards.find((item) => item.id === body.ward_id) ??
    state.wards.find((item) => item.code === body.ward_code) ??
    state.wards[0];
  const sequence = 240 + state.containers.length;
  const container: DemoContainer = {
    id: `demo-container-ECO-0${sequence}`,
    qr_code: body.qr_code ?? `ECO-0${sequence}`,
    merchant_id: null,
    ward_id: ward.id,
    capacity_liters: body.capacity_liters,
    state: ContainerState.AT_STATION,
    status: EntityStatus.ACTIVE,
    last_seen_days_ago: 0,
  };
  state.containers = [...state.containers, container];
  return toContainerSummary(container);
}

function patchContainer(id: string, patch: Partial<DemoContainer>): AdminContainerSummary {
  state.containers = state.containers.map((container) =>
    container.id === id ? { ...container, ...patch } : container,
  );
  return demoContainerById(id);
}

export function demoAssignContainer(id: string, merchantId: string): AdminContainerSummary {
  const merchant = merchantById(merchantId);
  return patchContainer(id, {
    merchant_id: merchantId,
    state: ContainerState.AT_MERCHANT,
    ward_id: merchant?.ward_id ?? state.wards[0].id,
    last_seen_days_ago: 0,
  });
}

export function demoUnassignContainer(id: string): AdminContainerSummary {
  return patchContainer(id, { merchant_id: null, state: ContainerState.AT_STATION, last_seen_days_ago: 0 });
}

export function demoReturnContainerToMerchant(id: string): AdminContainerSummary {
  return patchContainer(id, { state: ContainerState.AT_MERCHANT, last_seen_days_ago: 0 });
}

export function demoCancelContainerTransit(id: string): AdminContainerSummary & { affected_transaction_ids: string[] } {
  const container = patchContainer(id, { state: ContainerState.AT_MERCHANT, last_seen_days_ago: 0 });
  return { ...container, affected_transaction_ids: [] };
}

/* ── Thanh toán ── */

function buildPayments(): PaymentRecord[] {
  return DEMO_TRANSACTIONS.map((txn, index) => {
    const collectedAt = isoHoursAgo(txn.hoursAgo);
    const id = `demo-payment-${index + 1}`;
    // Giao dịch trong 48 giờ gần nhất coi như chưa chạy đợt chi trả.
    const settled = txn.hoursAgo > 48 || state.paidPaymentIds.has(id);
    return {
      id,
      merchant_id: txn.merchant_id,
      merchant_name: merchantName(txn.merchant_id),
      transaction_id: txn.id,
      liters: txn.liters,
      kilograms: null,
      unit_price: state.oilPrices[0].unit_price,
      unit: PriceUnit.PER_LITER,
      amount: txn.liters * state.oilPrices[0].unit_price,
      period: vietnamWeekPeriod(new Date(collectedAt)),
      status: settled ? PaymentStatus.PAID : PaymentStatus.PENDING,
      paid_at: settled ? collectedAt : null,
      created_at: collectedAt,
      collected_at: collectedAt,
    };
  });
}

/** Kỳ chi trả theo tuần ISO, cùng cách đánh số với currentVietnamWeek của miniapp. */
function vietnamWeekPeriod(date: Date): string {
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const target = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function demoPayments(params: {
  period?: string;
  merchant_id?: string;
  status?: string;
  page?: number;
  limit?: number;
} = {}): PaymentListResponse {
  let rows = buildPayments();
  if (params.period) rows = rows.filter((row) => row.period === params.period);
  if (params.merchant_id) rows = rows.filter((row) => row.merchant_id === params.merchant_id);
  if (params.status) rows = rows.filter((row) => row.status === params.status);
  return {
    data: rows,
    meta: { page: 1, limit: params.limit ?? 50, total: rows.length },
    totals: {
      liters: Number(rows.reduce((sum, row) => sum + row.liters, 0).toFixed(1)),
      amount: rows.reduce((sum, row) => sum + row.amount, 0),
    },
  };
}

export function demoRunPayments(period: string): PaymentRunResponse {
  const pending = buildPayments().filter(
    (row) => row.period === period && row.status === PaymentStatus.PENDING,
  );
  for (const row of pending) state.paidPaymentIds.add(row.id);
  return {
    created: pending.length,
    skipped: buildPayments().filter((row) => row.period === period).length - pending.length,
    total_amount: pending.reduce((sum, row) => sum + row.amount, 0),
  };
}

export function demoMarkPaymentPaid(id: string): PaymentRecord {
  state.paidPaymentIds.add(id);
  const row = buildPayments().find((item) => item.id === id);
  if (!row) throw new Error('Không tìm thấy khoản chi trả');
  return row;
}

export function demoOilPrices(): OilPriceRecord[] {
  return state.oilPrices;
}

export function demoCreateOilPrice(body: {
  unit_price: number;
  unit?: 'PER_LITER' | 'PER_KG';
  effective_from?: string;
  note?: string;
}): OilPriceRecord {
  const record: OilPriceRecord = {
    id: `demo-price-${state.oilPrices.length + 1}`,
    unit_price: body.unit_price,
    unit: body.unit === 'PER_KG' ? PriceUnit.PER_KG : PriceUnit.PER_LITER,
    effective_from: body.effective_from ?? new Date().toISOString(),
    effective_to: null,
    note: body.note ?? null,
    created_at: new Date().toISOString(),
  };
  state.oilPrices = [record, ...state.oilPrices.map((price) => ({ ...price, effective_to: price.effective_to ?? record.effective_from }))];
  return record;
}

/* ── Cảnh báo ── */

export function demoAlertList(params: { type?: string; resolved?: boolean; page?: number; limit?: number }): PagedResponse<AdminAlert> {
  let rows = state.alerts;
  if (params.type) rows = rows.filter((alert) => alert.type === params.type);
  if (params.resolved !== undefined) {
    rows = rows.filter((alert) => (params.resolved ? alert.resolved_at !== null : alert.resolved_at === null));
  }
  return { data: rows, meta: { page: 1, limit: params.limit ?? 50, total: rows.length } };
}

export function demoResolveAlert(id: string): AdminAlert {
  state.alerts = state.alerts.map((alert) =>
    alert.id === id ? { ...alert, resolved_at: new Date().toISOString() } : alert,
  );
  const alert = state.alerts.find((item) => item.id === id);
  if (!alert) throw new Error('Không tìm thấy cảnh báo');
  return alert;
}

export function demoOpenAlertCount(): number {
  return state.alerts.filter((alert) => alert.resolved_at === null).length;
}

/** Dùng cho bản đồ vận hành: số cảnh báo chưa xử lý của từng quán. */
export function demoOpenAlertCountByMerchant(merchantId: string): number {
  return state.alerts.filter(
    (alert) =>
      alert.resolved_at === null &&
      typeof alert.details === 'object' &&
      alert.details !== null &&
      (alert.details as { merchant_id?: string }).merchant_id === merchantId,
  ).length;
}

export function demoCurrentMerchants(): DemoMerchant[] {
  return state.merchants;
}

export function demoCurrentStations(): DemoStation[] {
  return state.stations;
}

export function demoCurrentWards(): DemoWard[] {
  return state.wards;
}
