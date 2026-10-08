import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "@liaoliaots/nestjs-redis";
import Redis from "ioredis";

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly redis: Redis;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getOrThrow();
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as unknown as T;
      }
    } catch (err: any) {
      this.logger.warn(`Redis GET error for key "${key}": ${err.message}`);
      return null;
    }
  }

  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    if (!keys || keys.length === 0) return [];
    try {
      const results = await this.redis.mget(...keys);
      return results.map((data) => {
        if (!data) return null;
        try {
          return JSON.parse(data) as T;
        } catch {
          return data as unknown as T;
        }
      });
    } catch (err: any) {
      this.logger.warn(`Redis MGET error: ${err.message}`);
      return keys.map(() => null);
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    try {
      const serialized =
        typeof value === "string" ? value : JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.redis.set(key, serialized, "EX", ttlSeconds);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (err: any) {
      this.logger.warn(`Redis SET error for key "${key}": ${err.message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (err: any) {
      this.logger.warn(`Redis DEL error for keys "${keys.join(", ")}": ${err.message}`);
    }
  }

  async getBalance(userId: number): Promise<number | null> {
    try {
      const res = await this.redis.get(`user_balance:${userId}`);
      return res ? parseFloat(res) : null;
    } catch (err: any) {
      this.logger.warn(`Redis getBalance error for user ${userId}: ${err.message}`);
      return null;
    }
  }

  async setBalance(userId: number, amount: number): Promise<void> {
    try {
      await this.redis.set(
        `user_balance:${userId}`,
        amount.toString(),
        "EX",
        3600,
      );
    } catch (err: any) {
      this.logger.warn(`Redis setBalance error for user ${userId}: ${err.message}`);
    }
  }

  async invalidate(userId: number): Promise<void> {
    try {
      await this.redis.del(
        `user_balance:${userId}`,
        `user_profile:${userId}`,
        `user_auth:${userId}`,
        `affiliate_stats:${userId}`,
      );
    } catch (err: any) {
      this.logger.warn(`Redis invalidate error for user ${userId}: ${err.message}`);
    }
  }
}
