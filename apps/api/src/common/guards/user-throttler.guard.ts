import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Giới hạn số lần gọi cho endpoint gọi API Google trả phí (E6, Q28), đếm theo từng tài khoản.
 * Chỉ gắn bằng @UseGuards ở các endpoint đó, không áp cho toàn API. Bộ đếm nằm trong bộ nhớ tiến
 * trình (Render chạy 1 instance). Vượt giới hạn thì trả 429; app dùng phương án dự phòng.
 */
const MINUTE_MS = 60_000;

export const PAID_API_RATE_LIMITS = {
  stationsRecommend: { limit: 20, ttl: MINUTE_MS },
  placesAutocomplete: { limit: 30, ttl: MINUTE_MS },
  placesDetails: { limit: 10, ttl: MINUTE_MS },
} as const;

export function throttleTrackerFor(request: { user?: { sub?: string; role?: string }; ip?: string }): string {
  // JwtAuthGuard (toàn cục, chạy trước) gắn request.user = payload JWT; sub là id tài khoản.
  return request.user?.sub ? `user:${request.user.sub}` : `ip:${request.ip ?? 'unknown'}`;
}

export function rateLimitedException(): HttpException {
  return new HttpException(
    { code: 'RATE_LIMITED', message: 'Gọi quá nhiều lần trong một phút. Vui lòng thử lại sau.', details: null },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(request: Record<string, unknown>): Promise<string> {
    return throttleTrackerFor(request as { user?: { sub?: string }; ip?: string });
  }

  protected async throwThrottlingException(): Promise<void> {
    throw rateLimitedException();
  }
}
