import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_DENSITY_KG_PER_LITER } from '@eco-oil/shared-types';
import { EMPTY_MASS_ENTRY, editMassField, massEntryView } from '../src/lib/mass-entry';

test('both fields start empty so declared liters are never saved as measured', () => {
  const view = massEntryView(EMPTY_MASS_ENTRY);

  assert.deepEqual([view.kgText, view.litersText], ['', '']);
  assert.equal(view.hasKilograms, false);
  assert.equal(view.hasLiters, false);
});

test('typing kilograms makes kg the source and calculates liters', () => {
  const view = massEntryView(editMassField(EMPTY_MASS_ENTRY, 'kg', '18,2'));

  assert.equal(view.kgText, '18,2');
  assert.equal(view.litersText, (18.2 / DEFAULT_DENSITY_KG_PER_LITER).toFixed(1));
  assert.equal(view.litersAuto, true);
  assert.equal(view.kgAuto, false);
  assert.equal(view.hasKilograms, true);
  assert.equal(view.hasLiters, false);
  assert.ok(Math.abs(view.actualLiters - 20) < 0.001);
});

test('typing liters makes liters the source and calculates kilograms', () => {
  const view = massEntryView(editMassField(EMPTY_MASS_ENTRY, 'liters', '20'));

  assert.equal(view.kgText, (20 * DEFAULT_DENSITY_KG_PER_LITER).toFixed(1));
  assert.equal(view.kgAuto, true);
  assert.equal(view.hasLiters, true);
  assert.equal(view.hasKilograms, false);
  assert.equal(view.actualKg, null);
});

test('the field edited last becomes the source', () => {
  const kgFirst = editMassField(EMPTY_MASS_ENTRY, 'kg', '9.1');
  const view = massEntryView(editMassField(kgFirst, 'liters', '12'));

  assert.equal(view.litersText, '12');
  assert.equal(view.kgAuto, true);
  assert.equal(view.hasKilograms, false);
});

test('an invalid source shows no calculated value', () => {
  const view = massEntryView(editMassField(EMPTY_MASS_ENTRY, 'kg', 'abc'));

  assert.equal(view.litersText, '');
  assert.equal(view.litersAuto, false);
});
