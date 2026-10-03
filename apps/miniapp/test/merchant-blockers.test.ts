import assert from 'node:assert/strict';
import test from 'node:test';
import { ContainerState } from '@eco-oil/shared-types';
import { profileSubmitBlockReason, readyButtonState } from '../src/lib/merchant-blockers';

const atShop = { state: ContainerState.AT_MERCHANT };
const inTransit = { state: ContainerState.IN_TRANSIT };

test('ready button is enabled with no reason when a container is at the shop', () => {
  const state = readyButtonState({ pendingOrders: 0, containers: [atShop] });

  assert.equal(state.disabled, false);
  assert.equal(state.label, 'Sẵn sàng thu gom');
  assert.equal(state.reason, null);
});

test('ready button explains why it is locked while an order is waiting', () => {
  const state = readyButtonState({ pendingOrders: 1, containers: [atShop] });

  assert.equal(state.disabled, true);
  assert.equal(state.label, 'Đã báo, đang chờ thu gom');
  assert.match(state.reason ?? '', /huỷ/);
});

test('ready button explains a container on its way back', () => {
  const state = readyButtonState({ pendingOrders: 0, containers: [inTransit] });

  assert.equal(state.disabled, true);
  assert.equal(state.label, 'Can đang trên đường về');
  assert.match(state.reason ?? '', /về lại quán/);
});

test('ready button explains a shop without containers', () => {
  const state = readyButtonState({ pendingOrders: 0, containers: [] });

  assert.equal(state.disabled, true);
  assert.equal(state.label, 'Đang chờ được cấp can');
  assert.match(state.reason ?? '', /chưa được cấp can/);
});

test('profile submit lists every missing field', () => {
  assert.equal(
    profileSubmitBlockReason({ name: ' ', address: '', wardId: '', requireWard: true }),
    'Cần nhập tên quán, địa chỉ và chọn phường để gửi hồ sơ.',
  );
  assert.equal(profileSubmitBlockReason({ name: 'Quán A', address: '', wardId: 'w', requireWard: true }), 'Cần nhập địa chỉ để gửi hồ sơ.');
});

test('profile submit is not blocked when everything required is filled', () => {
  assert.equal(profileSubmitBlockReason({ name: 'Quán A', address: '1 Lê Lợi', wardId: '', requireWard: false }), null);
});
