import { randomUUID } from 'crypto';

import { ConflictException, Injectable } from '@nestjs/common';

import { UserRole } from '../database/entities';
import { EmployeeProfileRepository } from '../work-status/employee-profile.repository';

import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { PaginatedStaffUserResponseDto, StaffUserResponseDto } from './dto/staff-user-response.dto';
import { UserRepository } from './user.repository';

/** Prefix identifying a not-yet-activated staff account's placeholder `firebaseUid` — see `AuthService`'s linking check for why this exists instead of a nullable column. */
export const PENDING_STAFF_UID_PREFIX = 'pending-staff:';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly employeeProfileRepository: EmployeeProfileRepository,
  ) {}

  async createStaffUser(dto: CreateStaffUserDto): Promise<StaffUserResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const user = await this.userRepository.create({
      firebaseUid: `${PENDING_STAFF_UID_PREFIX}${randomUUID()}`,
      email,
      fullName: dto.fullName,
      role: dto.role,
      isActive: true,
      invitedAt: new Date(),
      activatedAt: null,
    });

    if (dto.role === UserRole.EMPLOYEE) {
      // employeeCode is required by CreateStaffUserDto's @ValidateIf when role === EMPLOYEE.
      await this.employeeProfileRepository.create({
        userId: user.id,
        employeeCode: dto.employeeCode as string,
        department: dto.department ?? null,
        branch: dto.branch ?? null,
      });
    }

    const withProfile = await this.userRepository.findOneWithEmployeeProfile(user.id);
    return StaffUserResponseDto.fromEntity(withProfile ?? user);
  }

  async listStaff(page: number, pageSize: number): Promise<PaginatedStaffUserResponseDto> {
    const { items, total } = await this.userRepository.findStaffPaginated(page, pageSize);
    return {
      items: items.map((item) => StaffUserResponseDto.fromEntity(item)),
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }
}
