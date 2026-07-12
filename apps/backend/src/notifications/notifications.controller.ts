import { Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { UserEntity } from '../database/entities';

import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Auth()
  async listMine(@CurrentAppUser() user: UserEntity): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationsService.listForUser(user.id);
    return notifications.map((n) => NotificationResponseDto.fromEntity(n));
  }

  @Patch(':id/read')
  @Auth()
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() user: UserEntity,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationsService.markAsRead(user.id, id);
    return NotificationResponseDto.fromEntity(notification);
  }
}
