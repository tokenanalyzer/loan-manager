import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator';
import { UserRole } from '../database/entities';

import { DocumentTypesService } from './document-types.service';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { DocumentTypeResponseDto } from './dto/document-type-response.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';

/**
 * DocumentTypesController — catalog management, admin-only.
 *
 * This is the API surface a future Admin Panel builds its "Document
 * Types" screen against. It already exists and already works — the
 * Admin Panel itself is out of scope for this sprint, but the backend
 * work it needs is not deferred; wiring a UI to these three endpoints
 * requires zero further backend changes.
 */
@Controller({ path: 'document-types', version: '1' })
export class DocumentTypesController {
  constructor(private readonly documentTypesService: DocumentTypesService) {}

  @Get()
  @Auth(UserRole.ADMIN)
  async findAll(): Promise<DocumentTypeResponseDto[]> {
    const types = await this.documentTypesService.findAll();
    return types.map((type) => DocumentTypeResponseDto.fromEntity(type));
  }

  @Post()
  @Auth(UserRole.ADMIN)
  async create(@Body() dto: CreateDocumentTypeDto): Promise<DocumentTypeResponseDto> {
    const created = await this.documentTypesService.create(dto);
    return DocumentTypeResponseDto.fromEntity(created);
  }

  @Patch(':code')
  @Auth(UserRole.ADMIN)
  async update(
    @Param('code') code: string,
    @Body() dto: UpdateDocumentTypeDto,
  ): Promise<DocumentTypeResponseDto> {
    const updated = await this.documentTypesService.update(code, dto);
    return DocumentTypeResponseDto.fromEntity(updated);
  }
}
