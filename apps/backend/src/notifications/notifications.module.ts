import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationEntity, UserEntity } from '../database/entities';
import { UserRepository } from '../users/user.repository';

import { NotificationRepository } from './notification.repository';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  // `UserEntity` is registered here (not imported via `UsersModule`) so
  // `NotificationsService` can read a recipient's `fcmToken` for push
  // delivery — same "duplicate the repository as a lightweight
  // provider" pattern `SearchModule`/`CustomersModule` already use for
  // the same reason (avoids a module-import cycle back to a module
  // that doesn't need anything from this one).
  imports: [TypeOrmModule.forFeature([NotificationEntity, UserEntity])],
  controllers: [NotificationsController],
  providers: [NotificationRepository, UserRepository, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
