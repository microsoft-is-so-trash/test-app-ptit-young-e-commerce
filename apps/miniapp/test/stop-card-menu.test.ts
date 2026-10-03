import assert from 'node:assert/strict';
import test from 'node:test';
import { stopCardMenuItems } from '../src/lib/stop-card-menu';

test('the menu offers call, directions, copy number and AI details in that order', () => {
  const items = stopCardMenuItems({ phoneIssue: null, canOpenDirections: true, hasAi: true });

  assert.deepEqual(items.map((item) => item.id), ['call', 'directions', 'copy', 'ai']);
  assert.equal(items.every((item) => item.disabledReason === null), true);
});

test('phone actions are disabled with the phone problem as the reason', () => {
  const items = stopCardMenuItems({ phoneIssue: 'Quán chưa có số điện thoại.', canOpenDirections: true, hasAi: false });

  assert.equal(items.find((item) => item.id === 'call')?.disabledReason, 'Quán chưa có số điện thoại.');
  assert.equal(items.find((item) => item.id === 'copy')?.disabledReason, 'Quán chưa có số điện thoại.');
});

test('directions explain a missing location', () => {
  const items = stopCardMenuItems({ phoneIssue: null, canOpenDirections: false, hasAi: false });

  assert.match(items.find((item) => item.id === 'directions')?.disabledReason ?? '', /vị trí/);
});

test('AI details appear only when the stop has AI information', () => {
  const items = stopCardMenuItems({ phoneIssue: null, canOpenDirections: true, hasAi: false });

  assert.equal(items.some((item) => item.id === 'ai'), false);
});
