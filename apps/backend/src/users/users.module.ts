import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from '../database/entities';

import { UserRepository } from './user.repository';

/**
 * UsersModule — provides UserRepository for anything (currently just
 * AuthModule) that needs to read/write the `users` table.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UsersModule {}
