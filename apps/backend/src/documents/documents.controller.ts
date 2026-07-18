import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { UserEntity, UserRole } from '../database/entities';
import { StorageService } from '../storage/storage.service';

import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_FILE_SIZE_BYTES } from './documents.constants';
import { DocumentsService } from './documents.service';
import { DocumentAuditEntryDto } from './dto/document-audit-response.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { DocumentsOverviewResponseDto } from './dto/documents-overview-response.dto';
import { UpdateDocumentVerificationDto } from './dto/update-document-verification.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

/**
 * DocumentsController — customer document operations: catalog-driven
 * list, upload/replace (slot-aware), delete, and preview.
 *
 * Phase 2 hardening: `DELETE :id` is new (the original Phase 6 scope
 * only had upload-replaces-on-reupload, no real delete).
 */
@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @Auth(UserRole.CUSTOMER)
  async getOverview(
    @CurrentAppUser() user: UserEntity,
    @Query('categoryId') categoryId?: string,
  ): Promise<DocumentsOverviewResponseDto> {
    return this.documentsService.getOverview(user, categoryId);
  }

  /**
   * Staff read-only view of a specific customer's documents — needed
   * for KYC/loan review (Employee App). Distinct path segment
   * (`staff/customer/:customerId`) so it can't collide with the
   * customer-scoped `:id/content` route below.
   */
  @Get('staff/customer/:customerId')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async getOverviewForCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<DocumentsOverviewResponseDto> {
    return this.documentsService.getOverviewForCustomer(customerId, categoryId);
  }

  @Post()
  @Auth(UserRole.CUSTOMER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DOCUMENT_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_DOCUMENT_MIME_TYPES.join(', ')}.`,
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async upload(
    @CurrentAppUser() user: UserEntity,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<DocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('No file was provided (expected multipart field "file").');
    }
    return this.documentsService.upload(user, dto, file);
  }

  @Delete(':id')
  @Auth(UserRole.CUSTOMER)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() user: UserEntity,
  ): Promise<{ deleted: true }> {
    await this.documentsService.delete(user, id);
    return { deleted: true };
  }

  @Get(':id/content')
  @Auth(UserRole.CUSTOMER)
  async getContent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() user: UserEntity,
    @Res() res: Response,
  ): Promise<void> {
    const document = await this.documentsService.getOwnedDocumentOrThrow(user, id);
    await this.documentsService.logDownload(document, user);
    await this.streamDocument(document.storagePath, document.mimeType, document.originalFileName, res);
  }

  /**
   * Staff equivalent of `getContent` — Secure Access: an employee can
   * only reach a document belonging to a customer they're assigned a
   * lead for (see `DocumentsService.getDocumentForStaffOrThrow`);
   * admins can reach any. Every successful access is Download-Audited.
   */
  @Get('staff/:id/content')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async getContentForStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() staff: UserEntity,
    @Res() res: Response,
  ): Promise<void> {
    const document = await this.documentsService.getDocumentForStaffOrThrow(id, staff);
    await this.documentsService.logDownload(document, staff);
    await this.streamDocument(document.storagePath, document.mimeType, document.originalFileName, res);
  }

  /** Verification Status — staff-only, ownership-scoped (see DocumentsService.updateVerification). */
  @Patch('staff/:id/verification')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async updateVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() staff: UserEntity,
    @Body() dto: UpdateDocumentVerificationDto,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.updateVerification(id, staff, dto);
  }

  /** Download Audit, surfaced — every download/verification event on this document. */
  @Get('staff/:id/audit')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async getAudit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() staff: UserEntity,
  ): Promise<DocumentAuditEntryDto[]> {
    return this.documentsService.getAuditForDocument(id, staff);
  }

  private async streamDocument(
    storagePath: string,
    mimeType: string | null | undefined,
    originalFileName: string,
    res: Response,
  ): Promise<void> {
    const { stream } = await this.storageService.getReadStream(storagePath);

    // Strip characters that could break out of the quoted-string
    // header value (quotes, CR/LF) — the filename is user-supplied
    // (the original upload's filename) and must never be interpolated
    // into a header raw.
    const safeFileName = originalFileName.replace(/["\r\n]/g, '');

    res.setHeader('Content-Type', mimeType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
    stream.pipe(res);
  }
}
