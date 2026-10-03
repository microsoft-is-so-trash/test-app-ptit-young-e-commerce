import assert from 'node:assert/strict';
import test from 'node:test';
import { submitContainerCode, containerMatchOutcome, INITIAL_MANUAL_CONTAINER_CODE } from '../src/lib/container-code';

test('empty manual container code reports validation and always releases loading', async () => {
  const busy: boolean[] = [];
  const errors: Array<string | null> = [];
  let endpointCalls = 0;

  await submitContainerCode(
    '   ',
    async () => {
      endpointCalls += 1;
      return 'unexpected';
    },
    {
      setBusy: (value) => busy.push(value),
      setError: (value) => errors.push(value),
      onResolved: () => undefined,
    },
    () => 'Không thể kiểm tra mã can.',
  );

  assert.deepEqual(busy, [true, false]);
  assert.deepEqual(errors, [null, 'Vui lòng nhập mã can.']);
  assert.equal(endpointCalls, 0);
});

test('valid manual container code calls the lookup endpoint with the entered code', async () => {
  const busy: boolean[] = [];
  const endpointCodes: string[] = [];
  let resolvedCode = '';

  await submitContainerCode(
    '  ECO-UCO-HB-HK-001  ',
    async (code) => {
      endpointCodes.push(code);
      return { qr_code: code };
    },
    {
      setBusy: (value) => busy.push(value),
      setError: () => undefined,
      onResolved: (_result, code) => { resolvedCode = code; },
    },
    () => 'Không thể kiểm tra mã can.',
  );

  assert.deepEqual(busy, [true, false]);
  assert.deepEqual(endpointCodes, ['ECO-UCO-HB-HK-001']);
  assert.equal(resolvedCode, 'ECO-UCO-HB-HK-001');
});

test('a scanned container matching the stop moves straight on to the entry screen', () => {
  assert.equal(containerMatchOutcome('ECO-0142', 'ECO-0142'), 'continue');
});

test('a different container is reported as a mismatch and never continues', () => {
  assert.equal(containerMatchOutcome('ECO-9999', 'ECO-0142'), 'mismatch');
});

test('the manual code field starts empty so the stop code is never pre-filled', () => {
  assert.equal(INITIAL_MANUAL_CONTAINER_CODE, '');
});
