import assert from 'node:assert/strict';
import test from 'node:test';
import { OilGrade, Quality } from '@eco-oil/shared-types';
import { aiPreselectGrade, resolveQuality } from '../src/lib/grade-automation';

test('quality is automatically "Cần kiểm tra" for grade C', () => {
  assert.deepEqual(resolveQuality({ grade: OilGrade.C, suspectedAdulteration: false, manual: null }), { quality: Quality.FLAG, isAuto: true });
});

test('quality is automatically "Cần kiểm tra" when adulteration is suspected', () => {
  assert.deepEqual(resolveQuality({ grade: OilGrade.A, suspectedAdulteration: true, manual: null }), { quality: Quality.FLAG, isAuto: true });
});

test('quality is automatically "Đạt" otherwise', () => {
  assert.deepEqual(resolveQuality({ grade: OilGrade.B, suspectedAdulteration: false, manual: null }), { quality: Quality.PASS, isAuto: true });
  assert.deepEqual(resolveQuality({ grade: null, suspectedAdulteration: false, manual: null }), { quality: Quality.PASS, isAuto: true });
});

test('a manual quality choice is kept', () => {
  assert.deepEqual(resolveQuality({ grade: OilGrade.C, suspectedAdulteration: true, manual: Quality.PASS }), { quality: Quality.PASS, isAuto: false });
});

test('AI preselects its grade only with high confidence and when no grade is chosen yet', () => {
  assert.equal(aiPreselectGrade(null, { suggested_grade: 'B', confidence: 'HIGH' }), OilGrade.B);
  assert.equal(aiPreselectGrade(null, { suggested_grade: 'B', confidence: 'MEDIUM' }), null);
  assert.equal(aiPreselectGrade(OilGrade.A, { suggested_grade: 'B', confidence: 'HIGH' }), null);
  assert.equal(aiPreselectGrade(null, { suggested_grade: null, confidence: 'HIGH' }), null);
});
