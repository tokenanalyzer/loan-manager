export class NotificationResponseDto {
  id!: string;
  title!: string;
  body!: string;
  relatedEntityType!: string | null;
  relatedEntityId!: string | null;
  isRead!: boolean;
  createdAt!: Date;

  static fromEntity(entity: {
    id: string;
    title: string;
    body: string;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    isRead: boolean;
    createdAt: Date;
  }): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.body = entity.body;
    dto.relatedEntityType = entity.relatedEntityType ?? null;
    dto.relatedEntityId = entity.relatedEntityId ?? null;
    dto.isRead = entity.isRead;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
