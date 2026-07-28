import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { FollowUpStatus, UserEntity, UserRole } from '../database/entities';

import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { FollowUpResponseDto } from './dto/follow-up-response.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { UpdateFollowUpStatusDto } from './dto/update-follow-up-status.dto';
import { FollowUpsService } from './follow-ups.service';

/**
 * FollowUpsController — Employee CRM. Employee-only throughout (no
 * admin surface requested); every route is implicitly scoped to the
 * caller's own follow-ups by the service layer.
 */
@Controller({ path: 'follow-ups', version: '1' })
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Get()
  @Auth(UserRole.EMPLOYEE)
  async list(
    @CurrentAppUser() employee: UserEntity,
    @Query('status') status?: FollowUpStatus,
  ): Promise<FollowUpResponseDto[]> {
    const followUps = await this.followUpsService.listForEmployee(employee, status);
    return followUps.map((followUp) => FollowUpResponseDto.fromEntity(followUp));
  }

  @Post()
  @Auth(UserRole.EMPLOYEE)
  async create(
    @CurrentAppUser() employee: UserEntity,
    @Body() dto: CreateFollowUpDto,
  ): Promise<FollowUpResponseDto> {
    const followUp = await this.followUpsService.create(employee, dto);
    return FollowUpResponseDto.fromEntity(followUp);
  }

  @Patch(':id')
  @Auth(UserRole.EMPLOYEE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() employee: UserEntity,
    @Body() dto: UpdateFollowUpDto,
  ): Promise<FollowUpResponseDto> {
    const followUp = await this.followUpsService.update(id, employee, dto);
    return FollowUpResponseDto.fromEntity(followUp);
  }

  @Patch(':id/status')
  @Auth(UserRole.EMPLOYEE)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() employee: UserEntity,
    @Body() dto: UpdateFollowUpStatusDto,
  ): Promise<FollowUpResponseDto> {
    const followUp = await this.followUpsService.updateStatus(id, employee, dto);
    return FollowUpResponseDto.fromEntity(followUp);
  }
}
