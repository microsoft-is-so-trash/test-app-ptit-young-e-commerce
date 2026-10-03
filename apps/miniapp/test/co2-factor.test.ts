import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { CO2_KG_PER_LITER } from '@eco-oil/shared-types';
import { summarizeMerchantHistory } from '../src/lib/merchant-history';

test('the shared CO2 factor is 2.5 kg CO2 per liter', () => {
  assert.equal(CO2_KG_PER_LITER, 2.5);
});

test('history summary converts liters to CO2 with the shared factor', () => {
  const summary = summarizeMerchantHistory([{ actual_liters: 10 }, { actual_liters: 30 }]);

  assert.deepEqual(summary, { totalLiters: 40, totalCount: 2, totalCo2Kg: 100 });
});

test('history summary of no transactions is all zero', () => {
  assert.deepEqual(summarizeMerchantHistory([]), { totalLiters: 0, totalCount: 0, totalCo2Kg: 0 });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no screen declares its own CO2 factor', () => {
  const offenders = sourceFiles(join(import.meta.dirname, '../src')).filter((file) => {
    const source = readFileSync(file, 'utf8');
    return /CO2_KG_PER_LITER\s*=/.test(source) || /\*\s*2\.65\b/.test(source) || /hệ số quy đổi \d/.test(source);
  });

  assert.deepEqual(offenders, []);
});
