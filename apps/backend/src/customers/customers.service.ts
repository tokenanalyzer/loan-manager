import { ConflictException, NotFoundException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AuditLogEntity,
  CustomerProfileEntity,
  KycStatus,
  UserEntity,
  UserRole,
} from '../database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRepository } from '../users/user.repository';

import { hashAadhaar } from './aadhaar-hash.util';
import { CustomerProfileRepository } from './customer-profile.repository';
import { KycReviewDto } from './dto/kyc-review.dto';
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
    private readonly notificationsService: NotificationsService,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
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
      panNumber: dto.panNumber,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
      employmentStatus: dto.employmentStatus,
      monthlyIncome: dto.monthlyIncome?.toFixed(2),
      bankAccountNumber: dto.bankAccountNumber,
      bankIfscCode: dto.bankIfscCode,
      bankAccountHolderName: dto.bankAccountHolderName,
      nomineeName: dto.nomineeName,
      nomineeRelationship: dto.nomineeRelationship,
    };

    if (dto.aadhaarNumber !== undefined) {
      payload.aadhaarHash = hashAadhaar(dto.aadhaarNumber);
      payload.aadhaarLast4 = dto.aadhaarNumber.slice(-4);
    }

    if (dto.marketingConsent !== undefined) {
      payload.marketingConsent = dto.marketingConsent;
    }

    // One-way: only ever sets the acceptance timestamp, never clears it.
    if (dto.acceptDataConsent === true) {
      payload.dataConsentAcceptedAt = new Date();
    }

    // Once both PAN and Aadhaar are on file (this update or a prior
    // one), submission moves from NOT_SUBMITTED/REJECTED into
    // PENDING_REVIEW for a staff member to act on. Never overrides an
    // already-VERIFIED profile just because the customer re-saved
    // other fields.
    const panNumber = payload.panNumber ?? existing?.panNumber;
    const hasAadhaar = payload.aadhaarHash !== undefined || Boolean(existing?.aadhaarHash);
    const currentStatus = existing?.kycStatus ?? KycStatus.NOT_SUBMITTED;
    if (
      panNumber &&
      hasAadhaar &&
      (currentStatus === KycStatus.NOT_SUBMITTED || currentStatus === KycStatus.REJECTED)
    ) {
      payload.kycStatus = KycStatus.PENDING_REVIEW;
      payload.kycRejectionReason = null;
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
   * Staff decision on a customer's self-attested KYC submission.
   * `reviewedById`/`reviewedAt` are stamped from the authenticated
   * reviewer — never client-supplied — mirroring
   * `LoanApplicationsService.review`'s pattern for the same reason.
   */
  async reviewKyc(
    customerId: string,
    reviewer: UserEntity,
    dto: KycReviewDto,
  ): Promise<CustomerProfileEntity> {
    await this.getCustomerById(customerId); // 404s if not a customer at all
    const profile = await this.customerProfileRepository.findByUserId(customerId);
    if (!profile) {
      throw new NotFoundException('Customer profile not found.');
    }

    if (profile.kycStatus !== KycStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `This profile's KYC is not pending review (status: ${profile.kycStatus}).`,
      );
    }

    const updated = await this.customerProfileRepository.update(profile.id, {
      kycStatus: dto.decision === 'verify' ? KycStatus.VERIFIED : KycStatus.REJECTED,
      kycRejectionReason: dto.decision === 'reject' ? dto.rejectionReason ?? null : null,
      kycReviewedById: reviewer.id,
      kycReviewedAt: new Date(),
    });
    if (!updated) {
      throw new NotFoundException('Customer profile not found after update.');
    }

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        actorId: reviewer.id,
        action: dto.decision === 'verify' ? 'kyc_verified' : 'kyc_rejected',
        entityName: 'customer_profiles',
        entityId: profile.id,
        metadata: { customerId, rejectionReason: dto.rejectionReason ?? null },
      }),
    );

    await this.notificationsService.createForUser({
      userId: customerId,
      title: dto.decision === 'verify' ? 'KYC verified' : 'KYC submission rejected',
      body:
        dto.decision === 'verify'
          ? 'Your PAN and Aadhaar details have been verified.'
          : `Your KYC submission was rejected. ${dto.rejectionReason ?? 'Please review and resubmit your details.'}`,
      relatedEntityType: 'customer_profile',
      relatedEntityId: profile.id,
    });

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
