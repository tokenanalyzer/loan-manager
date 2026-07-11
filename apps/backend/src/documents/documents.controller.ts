import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { DocumentResponseDto } from './dto/document-response.dto';
import { RequiredDocumentStatusDto } from './dto/required-document-status.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

/**
 * DocumentsController — Phase 6 scope: list (with required-doc
 * status), upload/replace, and preview. Only customers manage their
 * own documents here; staff review of uploaded documents is future work.
 *
 * Phase 7 hardening: a `fileFilter` rejects disallowed MIME types
 * before the file ever reaches disk (previously only size was
 * limited), and the preview response sanitizes the stored filename
 * before putting it in a header, closing a header-injection gap.
 */
@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @Auth(UserRole.CUSTOMER)
  async listMine(
    @CurrentAppUser() user: UserEntity,
  ): Promise<{ required: RequiredDocumentStatusDto[]; documents: DocumentResponseDto[] }> {
    return this.documentsService.listMine(user);
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

  @Get(':id/content')
  @Auth(UserRole.CUSTOMER)
  async getContent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() user: UserEntity,
    @Res() res: Response,
  ): Promise<void> {
    const document = await this.documentsService.getOwnedDocumentOrThrow(user, id);
    const { stream } = await this.storageService.getReadStream(document.storagePath);

    // Strip characters that could break out of the quoted-string
    // header value (quotes, CR/LF) — the filename is user-supplied
    // (the original upload's filename) and must never be interpolated
    // into a header raw.
    const safeFileName = document.originalFileName.replace(/["\r\n]/g, '');

    res.setHeader('Content-Type', document.mimeType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
    stream.pipe(res);
  }
}
