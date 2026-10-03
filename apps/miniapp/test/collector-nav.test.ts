import assert from 'node:assert/strict';
import test from 'node:test';
import { COLLECTOR_MINE_SECTIONS, COLLECTOR_TABS, signOutNeedsConfirmation } from '../src/lib/collector-nav';
import { toggleMineSection } from '../src/lib/merchant-nav';

test('collector has exactly two labelled tabs: Ca hôm nay and Của tôi', () => {
  assert.deepEqual(COLLECTOR_TABS.map((tab) => tab.label), ['Ca hôm nay', 'Của tôi']);
});

test('Của tôi lists collected history with stats, profile and vehicle, wards, and general settings', () => {
  assert.deepEqual(COLLECTOR_MINE_SECTIONS.map((section) => section.title), [
    'Đã thu và thống kê',
    'Hồ sơ và xe',
    'Địa bàn',
    'Cài đặt chung',
  ]);
});

test('collector sections reuse the single-open accordion behaviour', () => {
  assert.equal(toggleMineSection<string>('collected', 'profile'), 'profile');
  assert.equal(toggleMineSection<string>('profile', 'profile'), null);
});

test('signing out asks for confirmation only while transactions are not synced', () => {
  assert.equal(signOutNeedsConfirmation({ pending: 0, syncing: 0, failed: 0 }), false);
  assert.equal(signOutNeedsConfirmation({ pending: 1, syncing: 0, failed: 0 }), true);
  assert.equal(signOutNeedsConfirmation({ pending: 0, syncing: 0, failed: 2 }), true);
});
