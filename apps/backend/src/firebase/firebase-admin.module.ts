import { Global, Module } from '@nestjs/common';

import { firebaseAdminProvider } from './firebase-admin.provider';
import { FirebaseAdminService } from './firebase-admin.service';

/**
 * Global module exposing the (possibly null) Firebase Admin app instance
 * via the FIREBASE_ADMIN_APP injection token, plus FirebaseAdminService
 * (user-management operations built on top of it). Marked @Global so any
 * future feature module can inject either without re-importing.
 */
@Global()
@Module({
  providers: [firebaseAdminProvider, FirebaseAdminService],
  exports: [firebaseAdminProvider, FirebaseAdminService],
})
export class FirebaseAdminModule {}
