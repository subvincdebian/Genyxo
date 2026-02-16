import { Module, Global } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class RedisCacheModule {}
