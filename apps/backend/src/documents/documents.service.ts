import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { DocumentEntity, UserEntity } from '../database/entities';
import { StorageService } from '../storage/storage.service';
import { REQUIRED_CUSTOMER_DOCUMENT_TYPES } from './documents.constants';
import { DocumentResponseDto } from './dto/document-response.dto';
import { RequiredDocumentStatusDto } from './dto/required-document-status.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentRepository } from './document.repository';

/**
 * DocumentsService — Phase 6 scope: upload (with replace-on-reupload
 * semantics), list-with-required-status, and preview/download. No
 * document verification/approval workflow (staff reviewing uploaded
 * docs) exists yet — future work.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly storageService: StorageService,
  ) {}

  async listMine(user: UserEntity): Promise<{
    required: RequiredDocumentStatusDto[];
    documents: DocumentResponseDto[];
  }> {
    const documents = await this.documentRepository.findAllByOwner(user.id);

    const required = REQUIRED_CUSTOMER_DOCUMENT_TYPES.map(({ type, label }) => {
      const match = documents.find((doc) => doc.documentType === type);
      const status = new RequiredDocumentStatusDto();
      status.documentType = type;
      status.label = label;
      status.isUploaded = Boolean(match);
      status.document = match ? DocumentResponseDto.fromEntity(match) : undefined;
      return status;
    });

    return {
      required,
      documents: documents.map((doc) => DocumentResponseDto.fromEntity(doc)),
    };
  }

  /**
   * Uploads a document. If the user already has a document of this
   * type, the old file is deleted from storage and the DB row is
   * replaced — this is what makes "replace document" work: the same
   * endpoint handles both first upload and replacement.
   */
  async upload(
    user: UserEntity,
    dto: UploadDocumentDto,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<DocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('No file was provided.');
    }

    const existing = await this.documentRepository.findByOwnerAndType(user.id, dto.documentType);

    const stored = await this.storageService.save({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: `documents/${user.id}`,
    });

    if (existing) {
      await this.storageService.delete(existing.storagePath);
      const updated = await this.documentRepository.update(existing.id, {
        storagePath: stored.storagePath,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: String(file.size),
        uploadedAt: new Date(),
      });
      if (!updated) {
        throw new NotFoundException('Document not found after update.');
      }
      return DocumentResponseDto.fromEntity(updated);
    }

    const created = await this.documentRepository.create({
      ownerId: user.id,
      documentType: dto.documentType,
      storagePath: stored.storagePath,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: String(file.size),
      uploadedAt: new Date(),
    });
    return DocumentResponseDto.fromEntity(created);
  }

  /** Returns the entity (with storagePath) for streaming — ownership-checked. */
  async getOwnedDocumentOrThrow(user: UserEntity, documentId: string): Promise<DocumentEntity> {
    const document = await this.documentRepository.findOneById(documentId);
    if (!document) {
      throw new NotFoundException('Document not found.');
    }
    if (document.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this document.');
    }
    return document;
  }
}
