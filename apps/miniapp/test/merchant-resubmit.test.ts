import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMerchantResubmitPayload } from '../src/lib/merchant-resubmit';

const form = { name: 'Quán Bà Ba', address: '12 Lê Lợi', phone: '0900000001', business_type: 'Quán ăn' };
const point = { lat: 21.03, lng: 105.85 };

test('resubmit payload never carries a ward_id, so the current ward is kept', () => {
  const payload = buildMerchantResubmitPayload(form, point);

  assert.equal('ward_id' in payload, false);
});

test('resubmit payload sends the edited profile fields with the fresh GPS point', () => {
  const payload = buildMerchantResubmitPayload(form, point);

  assert.deepEqual(payload, { ...form, lat: 21.03, lng: 105.85 });
});

test('resubmit payload ignores stale coordinates carried on the form', () => {
  const payload = buildMerchantResubmitPayload({ ...form, lat: null, lng: null }, point);

  assert.equal(payload.lat, 21.03);
  assert.equal(payload.lng, 105.85);
});
