import { Injectable } from "@nestjs/common";
import { ThrottlerStorage } from "@nestjs/throttler";
import Redis from "ioredis";
import * as crypto from "crypto";

export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

const LUA_THROTTLER_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local pttl = redis.call('PTTL', KEYS[1])
if pttl < 0 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
    pttl = tonumber(ARGV[1])
end
return {current, pttl}
`;

const SCRIPT_SHA = crypto
  .createHash("sha1")
  .update(LUA_THROTTLER_SCRIPT)
  .digest("hex");

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    let results: [number, number];
    try {
      results = (await this.redis.evalsha(
        SCRIPT_SHA,
        1,
        key,
        ttl,
      )) as [number, number];
    } catch (err: any) {
      if (err?.message?.includes("NOSCRIPT")) {
        results = (await this.redis.eval(
          LUA_THROTTLER_SCRIPT,
          1,
          key,
          ttl,
        )) as [number, number];
      } else {
        throw err;
      }
    }

    const totalHits = Number(results[0]);
    const pttl = Number(results[1]);
    const isBlocked = totalHits > limit;
    const timeToExpire = Math.max(0, Math.ceil(pttl / 1000));

    return {
      totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire: isBlocked
        ? blockDuration > 0
          ? Math.ceil(blockDuration / 1000)
          : timeToExpire
        : 0,
    };
  }
}
