import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { CustomerProfileEntity } from '../database/entities';

@Injectable()
export class CustomerProfileRepository extends BaseRepository<CustomerProfileEntity> {
  constructor(
    @InjectRepository(CustomerProfileEntity) repository: Repository<CustomerProfileEntity>,
  ) {
    super(repository);
  }

  async findByUserId(userId: string): Promise<CustomerProfileEntity | null> {
    return this.repository.findOne({ where: { userId } });
  }

  /**
   * Global Search's PAN/Aadhaar matching — "masked search": Aadhaar is
   * never stored in full (only `aadhaarLast4`, see the entity's own
   * doc comment), so a query only matches it when it's exactly 4
   * digits. PAN matches as a normal substring. Guards against a
   * too-short PAN fragment (<3 chars) matching almost everyone.
   */
  async findUserIdsByPanOrAadhaar(query: string): Promise<string[]> {
    const normalized = query.trim();
    const isFourDigits = /^\d{4}$/.test(normalized);
    if (!isFourDigits && normalized.length < 3) return [];

    const qb = this.repository
      .createQueryBuilder('profile')
      .select('profile.user_id', 'userId')
      .where('LOWER(profile.pan_number) LIKE :lower', { lower: `%${normalized.toLowerCase()}%` });

    if (isFourDigits) {
      qb.orWhere('profile.aadhaar_last4 = :digits', { digits: normalized });
    }

    const rows = await qb.getRawMany<{ userId: string }>();
    return rows.map((row) => row.userId);
  }
}
