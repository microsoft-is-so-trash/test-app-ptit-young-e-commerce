import { HttpStatus } from '@nestjs/common';
import { PAID_API_RATE_LIMITS, rateLimitedException, throttleTrackerFor } from './user-throttler.guard';

describe('user throttler for paid Google endpoints (Q28)', () => {
  it('counts per signed-in account, not per IP', () => {
    expect(throttleTrackerFor({ user: { sub: 'user-1', role: 'ADMIN' }, ip: '10.0.0.1' })).toBe('user:user-1');
    expect(throttleTrackerFor({ user: { sub: 'user-1', role: 'ADMIN' }, ip: '10.0.0.2' })).toBe('user:user-1');
  });

  it('falls back to the IP when there is no signed-in user', () => {
    expect(throttleTrackerFor({ ip: '10.0.0.1' })).toBe('ip:10.0.0.1');
    expect(throttleTrackerFor({})).toBe('ip:unknown');
  });

  it('uses the per-minute limits chosen by the owner', () => {
    expect(PAID_API_RATE_LIMITS).toEqual({
      stationsRecommend: { limit: 20, ttl: 60_000 },
      placesAutocomplete: { limit: 30, ttl: 60_000 },
      placesDetails: { limit: 10, ttl: 60_000 },
    });
  });

  it('answers 429 with the standard error body', () => {
    const exception = rateLimitedException();
    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(exception.getResponse()).toMatchObject({ code: 'RATE_LIMITED', details: null });
  });
});
