import {
  ContainerState,
  EntityStatus,
  MerchantApprovalStatus,
  OilGrade,
  PriceUnit,
  Quality,
} from '@eco-oil/shared-types';

/**
 * Thế giới dữ liệu demo dùng chung cho toàn bộ trang quản trị.
 *
 * Các thực thể ở đây lấy đúng id, tên, số điện thoại, mã can, phường và trạm từ
 * dữ liệu demo của miniapp:
 *   apps/miniapp/src/lib/demo-accounts.ts
 *   apps/miniapp/src/lib/demo-fixtures.ts          (Merchant)
 *   apps/miniapp/src/lib/demo-collector-fixtures.ts (Collector)
 *
 * Nhờ vậy mở bảng quản trị và mở app của quán hay người thu gom sẽ thấy cùng
 * một quán, cùng một can, cùng một người thu gom. Nếu sửa dữ liệu demo bên
 * miniapp thì phải sửa đối chiếu ở đây — test demo-consistency.test.ts canh việc đó.
 */

export const DEMO_ADMIN_USER_ID = 'demo-admin-01';

/** Tâm phường Hàng Bài, trùng với WARD_CENTER của demo-collector-fixtures. */
export const WARD_CENTER = { lat: 21.0221, lng: 105.8524 };

export const DEMO_OIL_UNIT_PRICE = 6000;

export interface DemoWard {
  id: string;
  code: string;
  name: string;
  district: string;
  city: string;
  center_lat: number;
  center_lng: number;
}

export const DEMO_WARDS: DemoWard[] = [
  {
    id: 'demo-ward-01',
    code: '00091',
    name: 'Phường Hàng Bài',
    district: 'Hoàn Kiếm',
    city: 'Hà Nội',
    center_lat: WARD_CENTER.lat,
    center_lng: WARD_CENTER.lng,
  },
  {
    id: 'demo-ward-02',
    code: '00079',
    name: 'Phường Nguyễn Trung Trực',
    district: 'Ba Đình',
    city: 'Hà Nội',
    center_lat: 21.0448,
    center_lng: 105.8462,
  },
  {
    id: 'demo-ward-03',
    code: '00295',
    name: 'Phường Phạm Đình Hổ',
    district: 'Hai Bà Trưng',
    city: 'Hà Nội',
    center_lat: 21.0146,
    center_lng: 105.8566,
  },
];

export interface DemoMerchant {
  id: string;
  name: string;
  address: string;
  phone: string;
  ward_id: string;
  lat: number;
  lng: number;
  approval_status: MerchantApprovalStatus;
  status: EntityStatus;
  business_type: string | null;
  /** Mã can đang giữ, null nghĩa là chưa được cấp can. */
  container_code: string | null;
  container_capacity_l: number | null;
  avg_daily_liters: number | null;
  /** Số ngày kể từ lần thu gần nhất; null nghĩa là chưa thu lần nào. */
  last_collected_days_ago: number | null;
  rejection_reason: string | null;
}

/**
 * Bốn quán đầu là bốn điểm dừng trong tuyến demo của người thu gom, toạ độ tính
 * từ WARD_CENTER cộng đúng offset đang dùng ở demo-collector-fixtures.
 */
export const DEMO_MERCHANTS: DemoMerchant[] = [
  {
    id: 'demo-merchant-001',
    name: 'Quán ăn Cô Ba',
    address: '24 Hàng Bài, Hoàn Kiếm, Hà Nội',
    phone: '0908123456',
    ward_id: 'demo-ward-01',
    lat: WARD_CENTER.lat + 0.0018,
    lng: WARD_CENTER.lng + 0.0011,
    approval_status: MerchantApprovalStatus.APPROVED,
    status: EntityStatus.ACTIVE,
    business_type: 'Quán ăn',
    container_code: 'ECO-0142',
    container_capacity_l: 30,
    avg_daily_liters: 8.7,
    last_collected_days_ago: 0,
    rejection_reason: null,
  },
  {
    id: 'demo-merchant-003',
    name: 'Bún chả Hàng Than',
    address: '12 Hàng Than, Ba Đình, Hà Nội',
    phone: '0912345678',
    ward_id: 'demo-ward-02',
    lat: WARD_CENTER.lat - 0.0042,
    lng: WARD_CENTER.lng + 0.0026,
    approval_status: MerchantApprovalStatus.APPROVED,
    status: EntityStatus.ACTIVE,
    business_type: 'Quán bún chả',
    container_code: 'ECO-0187',
    container_capacity_l: 30,
    avg_daily_liters: 5.4,
    last_collected_days_ago: 0,
    rejection_reason: null,
  },
  {
    id: 'demo-merchant-004',
    name: 'Cơm tấm Sài Gòn',
    address: '88 Lò Đúc, Hai Bà Trưng, Hà Nội',
    phone: '0934567890',
    ward_id: 'demo-ward-03',
    lat: WARD_CENTER.lat + 0.0036,
    lng: WARD_CENTER.lng - 0.0048,
    approval_status: MerchantApprovalStatus.APPROVED,
    status: EntityStatus.ACTIVE,
    business_type: 'Quán cơm',
    container_code: 'ECO-0203',
    container_capacity_l: 30,
    avg_daily_liters: 3.1,
    last_collected_days_ago: 1,
    rejection_reason: null,
  },
  {
    id: 'demo-merchant-005',
    name: 'Phở gà Nguyệt',
    address: '5 Phủ Doãn, Hoàn Kiếm, Hà Nội',
    phone: '0945678901',
    ward_id: 'demo-ward-01',
    lat: WARD_CENTER.lat - 0.0025,
    lng: WARD_CENTER.lng - 0.0033,
    approval_status: MerchantApprovalStatus.APPROVED,
    status: EntityStatus.ACTIVE,
    business_type: 'Quán phở',
    container_code: 'ECO-0219',
    container_capacity_l: 30,
    avg_daily_liters: 1.9,
    last_collected_days_ago: 1,
    rejection_reason: null,
  },
  // Ba quán dưới đây là các điểm "ngoài tuyến" trong tab Bản đồ của người thu gom.
  {
    id: 'demo-merchant-006',
    name: 'Lẩu nướng Bà Tư',
    address: '9 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
    phone: '0956789012',
    ward_id: 'demo-ward-01',
    lat: WARD_CENTER.lat + 0.0051,
    lng: WARD_CENTER.lng + 0.0037,
    approval_status: MerchantApprovalStatus.APPROVED,
    status: EntityStatus.ACTIVE,
    business_type: 'Quán lẩu nướng',
    container_code: 'ECO-0224',
    container_capacity_l: 30,
    avg_daily_liters: 4.6,
    last_collected_days_ago: 3,
    rejection_reason: null,
  },
  {
    id: 'demo-merchant-007',
    name: 'Cháo sườn Hàng Bồ',
    address: '31 Hàng Bồ, Hoàn Kiếm, Hà Nội',
    phone: '0967890123',
    ward_id: 'demo-ward-01',
    lat: WARD_CENTER.lat - 0.0063,
    lng: WARD_CENTER.lng + 0.0014,
    approval_status: MerchantApprovalStatus.APPROVED,
    status: EntityStatus.ACTIVE,
    business_type: 'Quán cháo',
    container_code: 'ECO-0231',
    container_capacity_l: 20,
    avg_daily_liters: 1.5,
    // Can đầy sau ~13 ngày nhưng 40 ngày chưa ai thu, mà thu thì chỉ được vài
    // lít — quán này là điểm đỏ trên bản đồ vận hành.
    last_collected_days_ago: 40,
    rejection_reason: null,
  },
  {
    id: 'demo-merchant-008',
    name: 'Bánh mì Hoà Mã',
    address: '53 Hàng Bài, Hoàn Kiếm, Hà Nội',
    phone: '0978901234',
    ward_id: 'demo-ward-01',
    lat: WARD_CENTER.lat + 0.0019,
    lng: WARD_CENTER.lng - 0.0071,
    approval_status: MerchantApprovalStatus.APPROVED,
    status: EntityStatus.ACTIVE,
    business_type: 'Tiệm bánh mì',
    container_code: null,
    container_capacity_l: null,
    avg_daily_liters: 1.4,
    // Chưa được cấp can nên không suy ra được nhịp thu, quá 21 ngày thì cảnh báo.
    last_collected_days_ago: 26,
    rejection_reason: null,
  },
  {
    id: 'demo-merchant-002',
    name: 'Bún chả Hương Liên',
    address: '24 Lê Văn Hưu, Hai Bà Trưng, Hà Nội',
    phone: '0912345678',
    ward_id: 'demo-ward-03',
    lat: WARD_CENTER.lat - 0.0072,
    lng: WARD_CENTER.lng + 0.0043,
    approval_status: MerchantApprovalStatus.PENDING,
    status: EntityStatus.ACTIVE,
    business_type: 'Quán bún chả',
    container_code: null,
    container_capacity_l: null,
    avg_daily_liters: null,
    last_collected_days_ago: null,
    rejection_reason: null,
  },
  {
    id: 'demo-merchant-009',
    name: 'Ốc Hương Xào',
    address: '17 Tô Hiến Thành, Hai Bà Trưng, Hà Nội',
    phone: '0989012345',
    ward_id: 'demo-ward-03',
    lat: WARD_CENTER.lat - 0.0088,
    lng: WARD_CENTER.lng + 0.0021,
    approval_status: MerchantApprovalStatus.PENDING,
    status: EntityStatus.ACTIVE,
    business_type: 'Quán ốc',
    container_code: null,
    container_capacity_l: null,
    avg_daily_liters: null,
    last_collected_days_ago: null,
    rejection_reason: null,
  },
  {
    id: 'demo-merchant-010',
    name: 'Nem nướng Nha Trang',
    address: '102 Giảng Võ, Ba Đình, Hà Nội',
    phone: '0990123456',
    ward_id: 'demo-ward-02',
    lat: WARD_CENTER.lat + 0.0094,
    lng: WARD_CENTER.lng - 0.0102,
    approval_status: MerchantApprovalStatus.REJECTED,
    status: EntityStatus.INACTIVE,
    business_type: 'Quán nem nướng',
    container_code: null,
    container_capacity_l: null,
    avg_daily_liters: null,
    last_collected_days_ago: null,
    rejection_reason: 'Địa chỉ không nằm trong địa bàn đang phục vụ',
  },
];

export interface DemoCollector {
  id: string;
  display_name: string;
  contact_phone: string;
  vehicle_type: string;
  max_capacity_l: number;
  status: EntityStatus;
  ward_ids: string[];
  user_id: string | null;
  /** Người chưa nhận lời mời thì chưa có tài khoản liên kết. */
  link_status: 'PENDING_LINK' | 'LINKED';
}

export const DEMO_COLLECTORS: DemoCollector[] = [
  {
    id: 'demo-collector-001',
    display_name: 'Nguyễn Văn Thu',
    contact_phone: '0987654321',
    vehicle_type: 'Xe tải nhỏ 500kg',
    max_capacity_l: 100,
    status: EntityStatus.ACTIVE,
    ward_ids: ['demo-ward-01', 'demo-ward-02'],
    user_id: 'demo-collector-001',
    link_status: 'LINKED',
  },
  {
    id: 'demo-collector-002',
    display_name: 'Trần Thị Hằng',
    contact_phone: '0976543210',
    vehicle_type: 'Xe máy có thùng',
    max_capacity_l: 100,
    status: EntityStatus.ACTIVE,
    ward_ids: ['demo-ward-03'],
    user_id: 'demo-collector-002',
    link_status: 'LINKED',
  },
  {
    id: 'demo-collector-003',
    display_name: 'Lê Minh Quang',
    contact_phone: '0965432109',
    vehicle_type: 'Xe máy có thùng',
    max_capacity_l: 60,
    status: EntityStatus.ACTIVE,
    ward_ids: ['demo-ward-02'],
    user_id: null,
    link_status: 'PENDING_LINK',
  },
];

export interface DemoStation {
  id: string;
  name: string;
  address: string;
  ward_id: string;
  lat: number;
  lng: number;
  capacity_l: number;
  current_volume_l: number;
  status: EntityStatus;
}

export const DEMO_STATIONS: DemoStation[] = [
  {
    id: 'demo-station-01',
    name: 'Trạm Eco Oil Long Biên',
    address: 'KCN Sài Đồng, Long Biên, Hà Nội',
    ward_id: 'demo-ward-01',
    lat: 21.0405,
    lng: 105.8912,
    capacity_l: 5000,
    current_volume_l: 2870,
    status: EntityStatus.ACTIVE,
  },
  {
    id: 'demo-station-02',
    name: 'Trạm Eco Oil Thanh Trì',
    address: 'Ngũ Hiệp, Thanh Trì, Hà Nội',
    ward_id: 'demo-ward-03',
    lat: 20.9512,
    lng: 105.8467,
    capacity_l: 3000,
    // Gần đầy, dùng để xem cảnh báo sắp hết chỗ chứa.
    current_volume_l: 2450,
    status: EntityStatus.ACTIVE,
  },
];

export interface DemoTransaction {
  id: string;
  merchant_id: string;
  collector_id: string;
  liters: number;
  /** Số giờ kể từ bây giờ, tính lùi — giữ thứ tự ổn định giữa các lần render. */
  hoursAgo: number;
  grade: OilGrade;
  quality: Quality;
  suspected_adulteration: boolean;
  /** Đã giao về trạm chưa; dùng cho đối soát. */
  delivered: boolean;
}

const HOURS_PER_DAY = 24;

/**
 * Mười giao dịch đầu khớp với demoCollectorHistory() của miniapp: cùng số lít,
 * cùng số ngày trước, cùng bốn quán trong tuyến.
 */
const COLLECTOR_HISTORY: Array<{ daysAgo: number; liters: number; merchantIndex: number }> = [
  { daysAgo: 0, liters: 26, merchantIndex: 0 },
  { daysAgo: 0, liters: 18, merchantIndex: 1 },
  { daysAgo: 1, liters: 22, merchantIndex: 2 },
  { daysAgo: 1, liters: 15, merchantIndex: 3 },
  { daysAgo: 2, liters: 31, merchantIndex: 0 },
  { daysAgo: 3, liters: 24, merchantIndex: 1 },
  { daysAgo: 5, liters: 19, merchantIndex: 2 },
  { daysAgo: 8, liters: 28, merchantIndex: 3 },
  { daysAgo: 12, liters: 21, merchantIndex: 0 },
  { daysAgo: 20, liters: 25, merchantIndex: 1 },
];

const ROUTE_MERCHANT_IDS = [
  'demo-merchant-001',
  'demo-merchant-003',
  'demo-merchant-004',
  'demo-merchant-005',
];

/** Giao dịch của người thu gom thứ hai, để đối soát có hai người chứ không phải một. */
const SECOND_COLLECTOR_HISTORY: Array<{ daysAgo: number; liters: number; merchantId: string }> = [
  { daysAgo: 0, liters: 16, merchantId: 'demo-merchant-006' },
  // Lượt bị gắn cờ nghi pha lẫn, cũng là lượt cuối cùng của Cháo sườn Hàng Bồ.
  { daysAgo: 40, liters: 4, merchantId: 'demo-merchant-007' },
  { daysAgo: 26, liters: 13, merchantId: 'demo-merchant-008' },
  { daysAgo: 4, liters: 17, merchantId: 'demo-merchant-006' },
  { daysAgo: 31, liters: 11, merchantId: 'demo-merchant-008' },
  { daysAgo: 9, liters: 14, merchantId: 'demo-merchant-006' },
  { daysAgo: 38, liters: 12, merchantId: 'demo-merchant-008' },
  { daysAgo: 55, liters: 3, merchantId: 'demo-merchant-007' },
];

function buildTransactions(): DemoTransaction[] {
  const first = COLLECTOR_HISTORY.map((entry, index) => ({
    id: `demo-txn-a-${index + 1}`,
    merchant_id: ROUTE_MERCHANT_IDS[entry.merchantIndex],
    collector_id: 'demo-collector-001',
    liters: entry.liters,
    hoursAgo: entry.daysAgo * HOURS_PER_DAY + index,
    // Cứ bốn lượt thì có một lượt hạng B, giống quy tắc của miniapp.
    grade: index % 4 === 3 ? OilGrade.B : OilGrade.A,
    quality: Quality.PASS,
    suspected_adulteration: false,
    delivered: entry.daysAgo > 0,
  }));

  const second = SECOND_COLLECTOR_HISTORY.map((entry, index) => ({
    id: `demo-txn-b-${index + 1}`,
    merchant_id: entry.merchantId,
    collector_id: 'demo-collector-002',
    liters: entry.liters,
    hoursAgo: entry.daysAgo * HOURS_PER_DAY + index + 2,
    grade: index === 1 ? OilGrade.C : OilGrade.A,
    quality: index === 1 ? Quality.FLAG : Quality.PASS,
    // Một lượt bị nghi pha lẫn, để tab Cảnh báo và Hiệu quả AI có dữ liệu thật.
    suspected_adulteration: index === 1,
    delivered: entry.daysAgo > 0,
  }));

  return [...first, ...second].sort((left, right) => left.hoursAgo - right.hoursAgo);
}

export const DEMO_TRANSACTIONS: DemoTransaction[] = buildTransactions();

export function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

export function isoDaysAgo(days: number): string {
  return isoHoursAgo(days * HOURS_PER_DAY);
}

export function wardById(wardId: string): DemoWard | undefined {
  return DEMO_WARDS.find((ward) => ward.id === wardId);
}

export function merchantById(merchantId: string): DemoMerchant | undefined {
  return DEMO_MERCHANTS.find((merchant) => merchant.id === merchantId);
}

export function collectorById(collectorId: string): DemoCollector | undefined {
  return DEMO_COLLECTORS.find((collector) => collector.id === collectorId);
}

export function merchantName(merchantId: string): string {
  return merchantById(merchantId)?.name ?? 'Quán không rõ';
}

export function collectorName(collectorId: string): string {
  return collectorById(collectorId)?.display_name ?? 'Người thu gom không rõ';
}

/** Can trong kho, gồm cả can chưa gán cho quán nào. */
export interface DemoContainer {
  id: string;
  qr_code: string;
  merchant_id: string | null;
  ward_id: string;
  capacity_liters: number;
  state: ContainerState;
  status: EntityStatus;
  last_seen_days_ago: number | null;
}

function buildContainers(): DemoContainer[] {
  const assigned = DEMO_MERCHANTS.filter((merchant) => merchant.container_code !== null).map(
    (merchant, index) => ({
      id: `demo-container-${merchant.container_code}`,
      qr_code: merchant.container_code as string,
      merchant_id: merchant.id,
      ward_id: merchant.ward_id,
      capacity_liters: merchant.container_capacity_l ?? 30,
      // Một can đang trên đường về trạm, để tab Quản lý can có đủ ba trạng thái.
      state: index === 2 ? ContainerState.IN_TRANSIT : ContainerState.AT_MERCHANT,
      status: EntityStatus.ACTIVE,
      last_seen_days_ago: merchant.last_collected_days_ago,
    }),
  );

  const spare: DemoContainer[] = [
    {
      id: 'demo-container-ECO-0240',
      qr_code: 'ECO-0240',
      merchant_id: null,
      ward_id: 'demo-ward-01',
      capacity_liters: 30,
      state: ContainerState.AT_STATION,
      status: EntityStatus.ACTIVE,
      last_seen_days_ago: 2,
    },
    {
      id: 'demo-container-ECO-0241',
      qr_code: 'ECO-0241',
      merchant_id: null,
      ward_id: 'demo-ward-02',
      capacity_liters: 20,
      state: ContainerState.AT_STATION,
      status: EntityStatus.ACTIVE,
      last_seen_days_ago: 5,
    },
  ];

  return [...assigned, ...spare];
}

export const DEMO_CONTAINERS: DemoContainer[] = buildContainers();

export const DEMO_OIL_PRICES = [
  {
    id: 'demo-price-001',
    unit_price: DEMO_OIL_UNIT_PRICE,
    unit: PriceUnit.PER_LITER,
    effective_from_days_ago: 2,
    note: 'Giá tham khảo khu vực Hà Nội',
  },
  {
    id: 'demo-price-000',
    unit_price: 5500,
    unit: PriceUnit.PER_LITER,
    effective_from_days_ago: 45,
    note: 'Giá áp dụng quý trước',
  },
];
