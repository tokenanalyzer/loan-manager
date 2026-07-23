import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { UserEntity, UserRole } from '../database/entities';

import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { DisburseLoanDto } from './dto/disburse-loan.dto';
import { LoanApplicationResponseDto } from './dto/loan-application-response.dto';
import { ReviewLoanApplicationDto } from './dto/review-loan-application.dto';
import { UpdateNotesDto } from './dto/update-notes.dto';
import { LoanApplicationsService } from './loan-applications.service';

/**
 * LoanApplicationsController — the loan-form business logic's API
 * surface: submit, list (role-scoped), get one, review, and disburse.
 * No repayment or document endpoints here (see DocumentsController).
 */
@Controller({ path: 'loan-applications', version: '1' })
export class LoanApplicationsController {
  constructor(private readonly loanApplicationsService: LoanApplicationsService) {}

  @Post()
  @Auth(UserRole.CUSTOMER)
  async submit(
    @CurrentAppUser() user: UserEntity,
    @Body() dto: CreateLoanApplicationDto,
  ): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationsService.submit(user, dto);
    return LoanApplicationResponseDto.fromEntity(application);
  }

  /** Customers see only their own; employees see only assigned leads; admins see everything. */
  @Get()
  @Auth()
  async findAll(@CurrentAppUser() user: UserEntity): Promise<LoanApplicationResponseDto[]> {
    const applications = await this.loanApplicationsService.findAllForUser(user);
    return applications.map((application) => LoanApplicationResponseDto.fromEntity(application));
  }

  @Get(':id')
  @Auth()
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() user: UserEntity,
  ): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationsService.findOneForUser(id, user);
    return LoanApplicationResponseDto.fromEntity(application);
  }

  @Patch(':id/review')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() reviewer: UserEntity,
    @Body() dto: ReviewLoanApplicationDto,
  ): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationsService.review(id, reviewer, dto);
    return LoanApplicationResponseDto.fromEntity(application);
  }

  /** Approve → Disburse. Records the bank transaction reference and activates the loan (see LoanApplicationsService.disburse). */
  @Patch(':id/disburse')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async disburse(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() actor: UserEntity,
    @Body() dto: DisburseLoanDto,
  ): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationsService.disburse(id, actor, dto);
    return LoanApplicationResponseDto.fromEntity(application);
  }

  /** Employee Workspace — autosaved internal notes on a lead assigned to the caller. */
  @Patch(':id/notes')
  @Auth(UserRole.EMPLOYEE)
  async updateNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() employee: UserEntity,
    @Body() dto: UpdateNotesDto,
  ): Promise<LoanApplicationResponseDto> {
    const application = await this.loanApplicationsService.updateNotes(id, employee, dto);
    return LoanApplicationResponseDto.fromEntity(application);
  }
}
