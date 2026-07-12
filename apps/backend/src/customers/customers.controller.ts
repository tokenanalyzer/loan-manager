import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { UserEntity, UserRole } from '../database/entities';

import { CustomersService } from './customers.service';
import { CustomerProfileResponseDto } from './dto/customer-profile-response.dto';
import { CustomerSummaryResponseDto } from './dto/customer-summary-response.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

/**
 * CustomersController — the CRM API surface.
 *
 * Phase 5 scope: self-service profile (customer) + read-only
 * lookup (employee/admin). No notes, search, or pagination yet.
 */
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  @Auth(UserRole.CUSTOMER)
  async getOwnProfile(
    @CurrentAppUser() user: UserEntity,
  ): Promise<CustomerProfileResponseDto | null> {
    const profile = await this.customersService.getOwnProfile(user);
    return profile ? CustomerProfileResponseDto.fromEntity(profile) : null;
  }

  @Patch('me')
  @Auth(UserRole.CUSTOMER)
  async updateOwnProfile(
    @CurrentAppUser() user: UserEntity,
    @Body() dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileResponseDto> {
    const profile = await this.customersService.upsertOwnProfile(user, dto);
    return CustomerProfileResponseDto.fromEntity(profile);
  }

  /**
   * Records an account-deletion request (audit-logged). Does not
   * delete anything itself — see CustomersService.requestAccountDeletion.
   */
  @Post('me/deletion-request')
  @HttpCode(HttpStatus.OK)
  @Auth(UserRole.CUSTOMER)
  async requestAccountDeletion(
    @CurrentAppUser() user: UserEntity,
  ): Promise<{ deletionRequestedAt: Date }> {
    const deletionRequestedAt = await this.customersService.requestAccountDeletion(user);
    return { deletionRequestedAt };
  }

  @Get()
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async listCustomers(): Promise<CustomerSummaryResponseDto[]> {
    const customers = await this.customersService.listCustomers();
    return customers.map((customer) => CustomerSummaryResponseDto.fromEntity(customer));
  }

  @Get(':id')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async getCustomer(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerSummaryResponseDto> {
    const customer = await this.customersService.getCustomerById(id);
    return CustomerSummaryResponseDto.fromEntity(customer);
  }

  @Get(':id/profile')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async getCustomerProfile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerProfileResponseDto | null> {
    const profile = await this.customersService.getCustomerProfileById(id);
    return profile ? CustomerProfileResponseDto.fromEntity(profile) : null;
  }
}
