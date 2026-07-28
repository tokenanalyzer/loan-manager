import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { UserEntity, UserRole } from '../database/entities';
import { AuditTrailEntryDto } from '../loan-applications/dto/audit-trail-entry.dto';

import { CustomerDocumentExportService } from './customer-document-export.service';
import { CustomerOverviewService } from './customer-overview.service';
import { CustomersService } from './customers.service';
import { CustomerOverviewResponseDto } from './dto/customer-overview-response.dto';
import { CustomerProfileResponseDto } from './dto/customer-profile-response.dto';
import { CustomerSummaryResponseDto } from './dto/customer-summary-response.dto';
import { KycReviewDto } from './dto/kyc-review.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

/**
 * CustomersController — the CRM API surface.
 *
 * Phase 5 scope: self-service profile (customer) + read-only
 * lookup (employee/admin). No notes, search, or pagination yet.
 */
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly customerOverviewService: CustomerOverviewService,
    private readonly customerDocumentExportService: CustomerDocumentExportService,
  ) {}

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
  async listCustomers(@CurrentAppUser() requester: UserEntity): Promise<CustomerSummaryResponseDto[]> {
    const customers = await this.customersService.listCustomers(requester);
    return customers.map((customer) => CustomerSummaryResponseDto.fromEntity(customer));
  }

  @Get(':id')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async getCustomer(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerSummaryResponseDto> {
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

  /** Customer 360 — identity + full profile + every application + every document, one round trip. See CustomerOverviewService. */
  @Get(':id/overview')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async getCustomerOverview(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerOverviewResponseDto> {
    return this.customerOverviewService.getOverview(id);
  }

  /** Customer 360's Audit Trail — merges decision/assignment events across every one of this customer's applications, plus their own KYC/deletion audit rows. */
  @Get(':id/audit-trail')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async getCustomerAuditTrail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditTrailEntryDto[]> {
    return this.customerOverviewService.getAuditTrail(id);
  }

  /**
   * The mandatory "Download All Documents" feature — streams
   * `LM-<CASE_NUMBER>-Documents.zip` (real documents grouped by their
   * real category, plus a generated `Case_Summary.pdf`) directly to the
   * response. See CustomerDocumentExportService.
   */
  @Get(':id/documents/download-all')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async downloadAllDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() actor: UserEntity,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.customerDocumentExportService.streamDownloadAll(id, actor, req, res);
  }

  /**
   * Staff decision on a customer's self-attested PAN/Aadhaar KYC
   * submission — see CustomersService.reviewKyc.
   */
  @Patch(':id/kyc-review')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async reviewKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() reviewer: UserEntity,
    @Body() dto: KycReviewDto,
  ): Promise<CustomerProfileResponseDto> {
    const profile = await this.customersService.reviewKyc(id, reviewer, dto);
    return CustomerProfileResponseDto.fromEntity(profile);
  }
}
