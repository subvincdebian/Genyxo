import { Injectable } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService {
  private readonly redis: Redis;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getOrThrow();
  }

  async getUserBalance(userId: number): Promise<number | null> {
    const balance = await this.redis.get(`user_balance:${userId}`);
    return balance ? parseFloat(balance) : null;
  }

  async setUserBalance(userId: number, balance: number) {
    await this.redis.set(`user_balance:${userId}`, balance.toString(), 'EX', 3600);
  }

  async invalidateBalance(userId: number) {
    await this.redis.del(`user_balance:${userId}`);
  }
}
