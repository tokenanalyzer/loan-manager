/** Download Audit — who accessed/downloaded/verified a document, and when. */
export class DocumentAuditEntryDto {
  id!: string;
  action!: string;
  actorId!: string | null;
  actorName!: string | null;
  createdAt!: Date;

  static fromEntity(entity: {
    id: string;
    action: string;
    actorId?: string | null;
    actor?: { fullName?: string | null } | null;
    createdAt: Date;
  }): DocumentAuditEntryDto {
    const dto = new DocumentAuditEntryDto();
    dto.id = entity.id;
    dto.action = entity.action;
    dto.actorId = entity.actorId ?? null;
    dto.actorName = entity.actor?.fullName ?? null;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
