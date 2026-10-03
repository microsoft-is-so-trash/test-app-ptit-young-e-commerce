import type { Logger } from '@nestjs/common';

/** Gọi API Google (Routes, Places) với timeout ngắn và thử lại có giới hạn (E3). */
export const GOOGLE_TIMEOUT_MS = 3000;
export const GOOGLE_MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 200;

export interface GoogleHttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface GoogleHttp {
  fetch(url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }): Promise<GoogleHttpResponse>;
  sleep(ms: number): Promise<void>;
}

export const GOOGLE_HTTP = Symbol('GOOGLE_HTTP');

export const defaultGoogleHttp: GoogleHttp = {
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Tháng tính hạn mức miễn phí, dạng YYYY-MM (UTC). */
export function billingMonth(now: Date): string {
  return now.toISOString().slice(0, 7);
}

/** Bộ đếm giữ hơn một tháng để không mất số liệu cuối tháng. */
export const MONTHLY_COUNTER_TTL_SECONDS = 40 * 24 * 60 * 60;

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * Trả về JSON khi thành công; null khi Google từ chối (4xx) hoặc vẫn lỗi sau khi thử lại. Không ném
 * lỗi để nơi gọi chuyển sang phương án dự phòng. Log không chứa key.
 */
export async function requestGoogleJson(
  http: GoogleHttp,
  logger: Logger,
  label: string,
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
): Promise<unknown | null> {
  for (let attempt = 0; attempt <= GOOGLE_MAX_RETRIES; attempt += 1) {
    if (attempt > 0) await http.sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * RETRY_BASE_DELAY_MS));
    try {
      const response = await http.fetch(url, { ...init, signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) });
      if (response.ok) return await response.json();
      if (!isRetryableStatus(response.status)) {
        logger.warn(`${label} rejected with status ${response.status}`);
        return null;
      }
      if (attempt === GOOGLE_MAX_RETRIES) logger.warn(`${label} still failing with status ${response.status}`);
    } catch (error) {
      if (attempt === GOOGLE_MAX_RETRIES) {
        logger.warn(`${label} request failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return null;
}
