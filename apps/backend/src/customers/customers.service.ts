import { NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLogEntity, CustomerProfileEntity, UserEntity, UserRole } from '../database/entities';
import { UserRepository } from '../users/user.repository';
import { CustomerProfileRepository } from './customer-profile.repository';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

/**
 * CustomersService — the CRM piece: customers manage their own
 * profile; employees/admins look customers up.
 *
 * Phase 5 scope: profile read/upsert and a simple list/get-by-id.
 * Phase 6 adds consent fields on the existing profile update path and
 * an account-deletion-request action (audit-logged, not a hard
 * delete). No notes, search, or pagination yet.
 */
@Injectable()
export class CustomersService {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
    private readonly userRepository: UserRepository,
    @InjectRepository(AuditLogEntity) private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async getOwnProfile(user: UserEntity): Promise<CustomerProfileEntity | null> {
    return this.customerProfileRepository.findByUserId(user.id);
  }

  /** Creates the profile row on first save; updates it thereafter. */
  async upsertOwnProfile(
    user: UserEntity,
    dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileEntity> {
    const existing = await this.customerProfileRepository.findByUserId(user.id);

    const payload: Record<string, unknown> = {
      dateOfBirth: dto.dateOfBirth,
      nationalIdNumber: dto.nationalIdNumber,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
      employmentStatus: dto.employmentStatus,
      monthlyIncome: dto.monthlyIncome?.toFixed(2),
    };

    if (dto.marketingConsent !== undefined) {
      payload.marketingConsent = dto.marketingConsent;
    }

    // One-way: only ever sets the acceptance timestamp, never clears it.
    if (dto.acceptDataConsent === true) {
      payload.dataConsentAcceptedAt = new Date();
    }

    if (!existing) {
      return this.customerProfileRepository.create({ userId: user.id, ...payload });
    }

    const updated = await this.customerProfileRepository.update(existing.id, payload);
    if (!updated) {
      throw new NotFoundException('Customer profile not found after update.');
    }
    return updated;
  }

  /**
   * Records an account-deletion request. Deliberately does *not*
   * delete or deactivate anything itself — see the migration that
   * added `deletionRequestedAt` for why hard-deleting a financial/loan
   * customer record needs a safeguarded, likely manual, process.
   * Also writes an audit trail entry so the request is discoverable
   * even before that process exists.
   */
  async requestAccountDeletion(user: UserEntity): Promise<Date> {
    const requestedAt = new Date();
    await this.userRepository.update(user.id, { deletionRequestedAt: requestedAt });

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        actorId: user.id,
        action: 'account_deletion_requested',
        entityName: 'users',
        entityId: user.id,
        metadata: { requestedAt: requestedAt.toISOString() },
      }),
    );

    return requestedAt;
  }

  async listCustomers(): Promise<UserEntity[]> {
    return this.userRepository.findAllByRole(UserRole.CUSTOMER);
  }

  async getCustomerById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOneById(id);
    if (!user || user.role !== UserRole.CUSTOMER) {
      throw new NotFoundException('Customer not found.');
    }
    return user;
  }

  async getCustomerProfileById(id: string): Promise<CustomerProfileEntity | null> {
    await this.getCustomerById(id); // 404s if not a customer at all
    return this.customerProfileRepository.findByUserId(id);
  }
}
