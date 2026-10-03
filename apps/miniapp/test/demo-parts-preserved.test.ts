import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Các phần giả hiện có phải giữ nguyên chữ khi tái cấu trúc (quy tắc ui-non-fiction, mục 3.1 tài liệu nghiên cứu).
const PRESERVED_TEXTS = [
  'Cloudflare GPS Relay',
  'Kết nối ổn định',
  'Trực tuyến',
  'ĐÃ XÁC THỰC ISCC-EU',
  '0908 *** 892',
  'Đã liên kết Zalo ID',
  'Can HDPE ISCC',
  'QR-ISCC',
  'Đăng ký cấp thêm can chuẩn (Yêu cầu trạm)',
  'Auto-Settled',
  'MB Bank Quân Đội',
  '0984 **** 212',
  'Hỗ trợ VietQR 247 & Ví ZaloPay Merchant (Quyết toán tức thì).',
  'Thay đổi tài khoản thụ hưởng',
  'VietQR 247 · MB Bank',
  'Thông báo Zalo OA khi Collector nhận đơn',
  'Cảnh báo khi can đạt 85% đầy',
  'Bảo mật & Phiên làm việc Zalo',
  'Tải chứng nhận phát thải CO2e & Biên bản',
  'Hà Nội Cluster · Staging Node',
  'Build: v2.4.0',
];

function sourceText(dir: string): string {
  return readdirSync(dir).map((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceText(path);
    return /\.tsx?$/.test(name) ? readFileSync(path, 'utf8') : '';
  }).join('\n');
}

test('existing demo-only texts are still rendered somewhere in the miniapp', () => {
  const source = sourceText(join(import.meta.dirname, '../src'));
  const missing = PRESERVED_TEXTS.filter((text) => !source.includes(text));

  assert.deepEqual(missing, []);
});
