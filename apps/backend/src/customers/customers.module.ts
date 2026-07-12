import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogEntity, CustomerProfileEntity } from '../database/entities';
import { UsersModule } from '../users/users.module';

import { CustomerProfileRepository } from './customer-profile.repository';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerProfileEntity, AuditLogEntity]), UsersModule],
  controllers: [CustomersController],
  providers: [CustomerProfileRepository, CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
