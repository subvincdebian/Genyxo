import { Module, Global } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';
import { RedisModule } from '@liaoliaots/nestjs-redis';

@Global()
@Module({
    imports: [RedisModule],
    providers: [RedisCacheService],
    exports: [RedisCacheService],
})
export class RedisCacheModule {}
