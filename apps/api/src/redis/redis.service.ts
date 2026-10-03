import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis | null;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL')?.trim();
    this.client = redisUrl
      ? new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        })
      : null;
    this.client?.on('error', () => undefined);
  }

  async onModuleInit(): Promise<void> {
    if (this.client) await this.client.connect();
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Cộng `amount` vào bộ đếm nếu tổng không vượt `limit` (nguyên tử). Dùng để giữ chi phí API
   * trả phí trong mức miễn phí (Q26). Trả về false khi vượt hạn mức.
   */
  async reserveWithinLimit(key: string, amount: number, limit: number, ttlSeconds: number): Promise<boolean> {
    if (!this.client) throw new Error('Redis is not configured');
    const result = await this.client.eval(
      'local current = redis.call("INCRBY", KEYS[1], ARGV[1]); ' +
        'if current == tonumber(ARGV[1]) then redis.call("EXPIRE", KEYS[1], ARGV[3]); end; ' +
        'if current > tonumber(ARGV[2]) then redis.call("DECRBY", KEYS[1], ARGV[1]); return 0; end; ' +
        'return 1',
      1,
      key,
      String(amount),
      String(limit),
      String(ttlSeconds),
    );
    return result === 1;
  }

  async ping(): Promise<'PONG' | 'DISABLED'> {
    return this.client ? this.client.ping() : 'DISABLED';
  }

  async setOneTime(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) throw new Error('Redis is not configured');
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    if (result !== 'OK') throw new Error('Redis one-time key was not created');
  }

  async setExpiring(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) throw new Error('Redis is not configured');
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async getValue(key: string): Promise<string | null> {
    if (!this.client) throw new Error('Redis is not configured');
    return this.client.get(key);
  }

  async consumeOneTime(key: string): Promise<string | null> {
    if (!this.client) throw new Error('Redis is not configured');
    const value = await this.client.eval(
      'local value = redis.call("GET", KEYS[1]); if value then redis.call("DEL", KEYS[1]); end; return value',
      1,
      key,
    );
    return typeof value === 'string' ? value : null;
  }

  async deleteOneTime(key: string): Promise<void> {
    if (!this.client) throw new Error('Redis is not configured');
    await this.client.del(key);
  }

  async restoreOneTime(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) throw new Error('Redis is not configured');
    if (ttlSeconds <= 0) return;
    await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client && this.client.status !== 'end') {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
  }
}
