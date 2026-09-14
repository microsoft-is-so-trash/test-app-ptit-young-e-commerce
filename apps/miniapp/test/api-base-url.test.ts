import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTION_API_BASE_URL, resolveApiBaseUrl } from '../src/lib/api-base-url';

test('uses the local API proxy during development', () => {
  assert.equal(resolveApiBaseUrl('development'), '/api/v1');
});

test('uses Render API by default for production', () => {
  assert.equal(resolveApiBaseUrl('production'), PRODUCTION_API_BASE_URL);
  assert.equal(resolveApiBaseUrl('production', PRODUCTION_API_BASE_URL), PRODUCTION_API_BASE_URL);
});

test('rejects unsafe production API base URLs', () => {
  for (const value of ['/api/v1', 'http://localhost:3000/api/v1', 'https://demo.example.com/api/v1', 'https://eco-oil-api.onrender.com']) {
    assert.throws(() => resolveApiBaseUrl('production', value));
  }
});

test('nói rõ giá trị nhận được khi cấu hình sai, để đọc log build là biết ngay', () => {
  // Thiếu https:// là lỗi hay gặp nhất khi dán vào ô Value trên Vercel.
  assert.throws(
    () => resolveApiBaseUrl('production', 'eco-oil-api-kgoe.onrender.com/api/v1'),
    (error: Error) => error.message.includes('eco-oil-api-kgoe.onrender.com/api/v1'),
    'thông báo lỗi phải chứa giá trị đã nhận',
  );
});

test('nêu tên biến lẫn giá trị khi URL đúng dạng nhưng sai đường dẫn', () => {
  assert.throws(
    () => resolveApiBaseUrl('production', 'https://eco-oil-api-kgoe.onrender.com'),
    (error: Error) =>
      error.message.includes('VITE_API_BASE_URL')
      && error.message.includes('https://eco-oil-api-kgoe.onrender.com'),
  );
});

test('cắt bớt giá trị quá dài để log không bị rác', () => {
  // Giá trị vừa dài vừa sai: thiếu scheme nên không phân tích được thành URL.
  const huge = `${'a'.repeat(400)}.com/api/v1`;
  assert.throws(
    () => resolveApiBaseUrl('production', huge),
    (error: Error) => error.message.includes('…') && !error.message.includes('a'.repeat(200)),
  );
});
