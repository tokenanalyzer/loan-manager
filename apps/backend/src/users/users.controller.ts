import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator';
import { UserRole } from '../database/entities';

import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import { PaginatedStaffUserResponseDto, StaffUserResponseDto } from './dto/staff-user-response.dto';
import { UsersService } from './users.service';

/**
 * UsersController — staff account provisioning, Admin-only.
 *
 * The only way an employee/admin account comes into existence — see
 * `AuthService`'s doc comment on why a Firebase sign-in alone can
 * never create one. Replaces the previous "insert a row directly
 * against the database" process.
 */
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Auth(UserRole.ADMIN)
  async create(@Body() dto: CreateStaffUserDto): Promise<StaffUserResponseDto> {
    return this.usersService.createStaffUser(dto);
  }

  @Get()
  @Auth(UserRole.ADMIN)
  async findAll(@Query() query: ListStaffQueryDto): Promise<PaginatedStaffUserResponseDto> {
    return this.usersService.listStaff(query.page, query.pageSize);
  }
}
