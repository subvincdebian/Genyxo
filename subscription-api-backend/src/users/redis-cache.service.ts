import { Injectable } from "@nestjs/common";
import { RedisService } from "@liaoliaots/nestjs-redis";
import Redis from "ioredis";

@Injectable()
export class RedisCacheService {
  private readonly redis: Redis;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getOrThrow();
  }

  async getBalance(userId: number): Promise<number | null> {
    const res = await this.redis.get(`user:balance:${userId}`);
    return res ? parseFloat(res) : null;
  }

  async setBalance(userId: number, amount: number) {
    await this.redis.set(
      `user:balance:${userId}`,
      amount.toString(),
      "EX",
      3600,
    );
  }

  async invalidate(userId: number) {
    await this.redis.del(`user:balance:${userId}`);
  }
}
