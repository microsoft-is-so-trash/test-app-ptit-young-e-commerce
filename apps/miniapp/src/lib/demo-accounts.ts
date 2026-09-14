import { MerchantApprovalStatus, Role } from '@eco-oil/shared-types';
import type { AuthUser, DevAccount } from '@eco-oil/shared-types';
import { demoAccountStorage } from './storage';

/** Bật chế độ xem giao diện không cần backend. Mặc định tắt nên bản production không bị ảnh hưởng. */
export function isDemoOfflineMode(): boolean {
  return import.meta.env?.VITE_DEMO_OFFLINE === 'true';
}

export interface DemoAccount {
  /** Trùng với zalo_id để dropdown và storage dùng chung một khoá. */
  id: string;
  label: string;
  /** Tình huống mà tài khoản này dùng để kiểm thử. */
  scenario: string;
  user: AuthUser;
}

const HA_NOI_WARD = { code: '00091', name: 'Phường Hàng Bài', district: 'Hoàn Kiếm', city: 'Hà Nội' };
const LOGGED_OUT_MARKER = 'signed-out';

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'zalo_merchant_01',
    label: 'Quán Cô Ba',
    scenario: 'Quán đã được duyệt, có can và lịch sử thu gom',
    user: {
      id: 'demo-merchant-001',
      zalo_id: 'zalo_merchant_01',
      phone: '0908123456',
      name: 'Quán ăn Cô Ba',
      role: Role.MERCHANT,
      merchantId: 'demo-merchant-001',
      collectorId: null,
      merchantApprovalStatus: MerchantApprovalStatus.APPROVED,
      merchantRejectionReason: null,
    },
  },
  {
    id: 'zalo_merchant_02',
    label: 'Bún chả Hương Liên',
    scenario: 'Quán vừa đăng ký, đang chờ duyệt',
    user: {
      id: 'demo-merchant-002',
      zalo_id: 'zalo_merchant_02',
      phone: '0912345678',
      name: 'Bún chả Hương Liên',
      role: Role.MERCHANT,
      merchantId: 'demo-merchant-002',
      collectorId: null,
      merchantApprovalStatus: MerchantApprovalStatus.PENDING,
      merchantRejectionReason: null,
    },
  },
  {
    id: 'zalo_collector_01',
    label: 'Nguyễn Văn Thu',
    scenario: 'Người thu gom có tuyến với 4 điểm chờ thu',
    user: {
      id: 'demo-collector-001',
      zalo_id: 'zalo_collector_01',
      phone: '0987654321',
      name: 'Nguyễn Văn Thu',
      role: Role.COLLECTOR,
      merchantId: null,
      collectorId: 'demo-collector-001',
      merchantApprovalStatus: null,
      merchantRejectionReason: null,
    },
  },
  {
    id: 'zalo_collector_02',
    label: 'Trần Thị Hằng',
    scenario: 'Người thu gom chưa có điểm nào trong tuyến',
    user: {
      id: 'demo-collector-002',
      zalo_id: 'zalo_collector_02',
      phone: '0976543210',
      name: 'Trần Thị Hằng',
      role: Role.COLLECTOR,
      merchantId: null,
      collectorId: 'demo-collector-002',
      merchantApprovalStatus: null,
      merchantRejectionReason: null,
    },
  },
  {
    id: 'zalo_admin_01',
    label: 'ECollect Admin',
    scenario: 'Quản trị viên — mở bảng vận hành ở web quản trị',
    user: {
      id: 'demo-admin-01',
      zalo_id: 'zalo_admin_01',
      phone: '0900000000',
      name: 'ECollect Admin',
      role: Role.ADMIN,
      merchantId: null,
      collectorId: null,
      merchantApprovalStatus: null,
      merchantRejectionReason: null,
    },
  },
];

export function findDemoAccount(accountId: string | null): DemoAccount | null {
  if (!accountId) return null;
  return DEMO_ACCOUNTS.find((account) => account.id === accountId) ?? null;
}

/**
 * Tài khoản dùng khi mở app: lần đầu vào thẳng quán mẫu, các lần sau giữ
 * lựa chọn gần nhất. Sau khi đăng xuất thì trả về null để hiện màn đăng nhập.
 */
export function resolveActiveDemoAccount(): DemoAccount | null {
  const stored = demoAccountStorage.load();
  if (stored === LOGGED_OUT_MARKER) return null;
  const account = findDemoAccount(stored);
  if (account && account.user.role !== Role.ADMIN) return account;
  return DEMO_ACCOUNTS[0] ?? null;
}

export function rememberDemoAccount(accountId: string): void {
  demoAccountStorage.save(accountId);
}

export function forgetDemoAccount(): void {
  demoAccountStorage.save(LOGGED_OUT_MARKER);
}

/** Danh sách cho dropdown đăng nhập, dùng đúng kiểu dữ liệu của endpoint thật. */
export function demoDevAccounts(): DevAccount[] {
  return DEMO_ACCOUNTS.map((account) => ({
    id: account.user.id,
    zalo_id: account.id,
    phone: account.user.phone,
    name: account.label,
    role: account.user.role,
    wards: account.user.role === Role.COLLECTOR ? [HA_NOI_WARD] : [],
  }));
}
