import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ProfileController } from './profile.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
  ],
  controllers: [ProfileController]
})
export class ProfileModule {}
