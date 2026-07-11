import { Global, Module } from '@nestjs/common';

import { firebaseAdminProvider } from './firebase-admin.provider';

/**
 * Global module exposing the (possibly null) Firebase Admin app instance
 * via the FIREBASE_ADMIN_APP injection token. Marked @Global so any
 * future feature module can inject it without re-importing.
 */
@Global()
@Module({
  providers: [firebaseAdminProvider],
  exports: [firebaseAdminProvider],
})
export class FirebaseAdminModule {}
