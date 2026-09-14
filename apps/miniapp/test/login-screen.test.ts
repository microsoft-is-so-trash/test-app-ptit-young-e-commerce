import assert from 'node:assert/strict';
import test from 'node:test';
import { Role } from '@eco-oil/shared-types';
import type { DevAccount } from '@eco-oil/shared-types';
import { adminConsoleRedirect, getSeedLoginCredentials, isValidAuthSession, isValidAuthUser, shouldShowDevelopmentLogin } from '../src/components/login-screen-logic';

test('backend mock accounts are usable even when the Zalo SDK client is real', () => {
  const account: DevAccount = {
    zalo_id: 'zalo_collector_03',
    name: 'Lê Văn Thu Gom 3',
    role: Role.COLLECTOR,
    phone: '0910000003',
    wards: [{ id: 'ward-hb', code: 'HB-HK', name: 'Phường Hàng Bạc' }],
  };

  assert.equal(shouldShowDevelopmentLogin(true, true, 1), true);
  assert.equal(shouldShowDevelopmentLogin(false, true, 1), false);
  assert.deepEqual(getSeedLoginCredentials([account], 'zalo_collector_03'), {
    zaloId: 'zalo_collector_03',
    phone: '0910000003',
  });
});

test('selecting a collector preserves the seed login identity and phone', () => {
  const account: DevAccount = {
    zalo_id: 'zalo_collector_03',
    name: 'Lê Văn Thu Gom 3',
    role: Role.COLLECTOR,
    phone: '0910000003',
    wards: [],
  };

  assert.deepEqual(getSeedLoginCredentials([account], account.zalo_id), {
    zaloId: 'zalo_collector_03',
    phone: '0910000003',
  });
});

test('a real backend represented by 404 has no seed account selected', () => {
  const accounts: DevAccount[] = [];
  assert.equal(shouldShowDevelopmentLogin(false, false, 0), false);
  assert.equal(getSeedLoginCredentials(accounts, ''), null);
});

test('demo merchant selections preserve their distinct Zalo identities', () => {
  const accounts: DevAccount[] = [
    { id: 'merchant-04', zalo_id: 'zalo_demo_merchant_04', phone: '0901000004', name: 'Bún Chả Hàng Bạc', role: Role.MERCHANT, wards: [] },
    { id: 'merchant-05', zalo_id: 'zalo_demo_merchant_05', phone: '0901000005', name: 'Cơm Nhà Hồ Gươm', role: Role.MERCHANT, wards: [] },
  ];
  assert.deepEqual(getSeedLoginCredentials(accounts, 'zalo_demo_merchant_04'), { zaloId: 'zalo_demo_merchant_04', phone: '0901000004' });
  assert.deepEqual(getSeedLoginCredentials(accounts, 'zalo_demo_merchant_05'), { zaloId: 'zalo_demo_merchant_05', phone: '0901000005' });
});

test('missing profile identity is rejected instead of falling back to another merchant', () => {
  const base = { id: 'user-1', zalo_id: 'zalo_demo_merchant_05', phone: '0901000005', name: 'Cơm Nhà Hồ Gươm', role: Role.MERCHANT, merchantId: 'merchant-05', collectorId: null, merchantApprovalStatus: 'APPROVED', merchantRejectionReason: null };
  assert.equal(isValidAuthUser(base), true);
  assert.equal(isValidAuthUser({ ...base, merchantId: null }), true);
  assert.equal(isValidAuthUser({ ...base, id: '' }), false);
  assert.equal(isValidAuthUser(null), false);
});

test('normalized auth session accepts a new authenticated user without a merchant', () => {
  assert.equal(isValidAuthSession({
    access_token: 'access-token-fixture',
    refresh_token: 'refresh-token-fixture',
    user: { id: 'user-1', zalo_id: 'zalo-new', phone: null, name: 'New user', role: Role.MERCHANT, merchantId: null, collectorId: null, merchantApprovalStatus: null, merchantRejectionReason: null },
  }), true);
  assert.equal(isValidAuthSession({
    access_token: 'access-token-fixture',
    refresh_token: 'refresh-token-fixture',
    user: { zalo_id: 'zalo-new', role: Role.MERCHANT, merchantId: null },
  }), false);
});

test('tài khoản quản trị được chuyển sang web admin thay vì đăng nhập tại miniapp', () => {
  const admin: DevAccount = {
    zalo_id: 'zalo_admin_01',
    name: 'ECollect Admin',
    role: Role.ADMIN,
    phone: '0900000000',
    wards: [],
  };
  const merchant: DevAccount = {
    zalo_id: 'zalo_merchant_01',
    name: 'Quán Cô Ba',
    role: Role.MERCHANT,
    phone: '0908123456',
    wards: [],
  };

  assert.equal(adminConsoleRedirect([admin], 'zalo_admin_01', 'http://localhost:3001'), 'http://localhost:3001');
  assert.equal(adminConsoleRedirect([merchant], 'zalo_merchant_01', 'http://localhost:3001'), null);
});

test('bỏ dấu gạch chéo thừa ở cuối địa chỉ web admin', () => {
  const admin: DevAccount = { zalo_id: 'a', name: null, role: Role.ADMIN, phone: null, wards: [] };

  assert.equal(adminConsoleRedirect([admin], 'a', 'https://admin.ecollect.vn/'), 'https://admin.ecollect.vn');
});

test('không chuyển hướng khi chưa cấu hình địa chỉ web admin', () => {
  const admin: DevAccount = { zalo_id: 'a', name: null, role: Role.ADMIN, phone: null, wards: [] };

  assert.equal(adminConsoleRedirect([admin], 'a', ''), null);
  assert.equal(adminConsoleRedirect([admin], 'a', '   '), null);
});

test('chỉ chấp nhận địa chỉ http/https, chặn javascript: và dữ liệu lạ', () => {
  const admin: DevAccount = { zalo_id: 'a', name: null, role: Role.ADMIN, phone: null, wards: [] };

  assert.equal(adminConsoleRedirect([admin], 'a', 'javascript:alert(1)'), null);
  assert.equal(adminConsoleRedirect([admin], 'a', 'data:text/html,x'), null);
  assert.equal(adminConsoleRedirect([admin], 'a', 'ftp://example.com'), null);
});

test('không chuyển hướng khi chưa chọn tài khoản nào', () => {
  const admin: DevAccount = { zalo_id: 'a', name: null, role: Role.ADMIN, phone: null, wards: [] };

  assert.equal(adminConsoleRedirect([admin], '', 'http://localhost:3001'), null);
});
