import { Injectable } from "@nestjs/common";
import { ThrottlerStorage } from "@nestjs/throttler";
import Redis from "ioredis";

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(key: string, ttl: number): Promise<any> {
    const results = await this.redis
      .multi()
      .set(key, 0, "PX", ttl, "NX")
      .incr(key)
      .pexpire(key, ttl)
      .exec();

    if (!results) {
      throw new Error("Redis multi exec failed");
    }

    const count = results[1][1] as number;

    return {
      totalHits: count,
      timeToExpire: ttl / 1000,
    };
  }
}
