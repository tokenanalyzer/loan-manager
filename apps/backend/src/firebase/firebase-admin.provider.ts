import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, initializeApp } from 'firebase-admin/app';
import { PinoLogger } from 'nestjs-pino';

export const FIREBASE_ADMIN_APP = Symbol('FIREBASE_ADMIN_APP');

/**
 * Firebase Admin SDK provider — placeholder configuration.
 *
 * Phase 2 scope: wires up *how* the Firebase Admin app will be
 * initialized (project id, client email, private key from env), but
 * does not implement Authentication, Storage, or Messaging usage —
 * those arrive in later phases alongside login/OTP and file/notification
 * features.
 *
 * When `FIREBASE_ENABLED=false` (the default) or credentials are
 * missing, this provider resolves to `null` rather than throwing, so
 * the backend still starts successfully without a real Firebase
 * project configured.
 */
export const firebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN_APP,
  inject: [ConfigService, PinoLogger],
  useFactory: (config: ConfigService, logger: PinoLogger): App | null => {
    logger.setContext('FirebaseAdmin');

    const enabled = config.get<boolean>('firebase.enabled');
    const projectId = config.get<string>('firebase.projectId');
    const clientEmail = config.get<string>('firebase.clientEmail');
    const privateKey = config.get<string>('firebase.privateKey');

    if (!enabled || !projectId || !clientEmail || !privateKey) {
      logger.warn(
        'Firebase Admin is not configured (FIREBASE_ENABLED=false or credentials missing) — skipping initialization.',
      );
      return null;
    }

    try {
      const app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          // Private keys in .env are typically newline-escaped.
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });

      logger.log('Firebase Admin initialized.');
      return app;
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize Firebase Admin.');
      return null;
    }
  },
};
