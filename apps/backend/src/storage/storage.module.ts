import { Global, Module } from '@nestjs/common';

import { LocalDiskStorageService } from './local-disk-storage.service';
import { StorageService } from './storage.service';

/**
 * StorageModule — @Global() so any feature module (currently just
 * DocumentsModule) can inject `StorageService` without importing this
 * module explicitly, mirroring AuthModule/FirebaseAdminModule.
 */
@Global()
@Module({
  providers: [{ provide: StorageService, useClass: LocalDiskStorageService }],
  exports: [StorageService],
})
export class StorageModule {}
