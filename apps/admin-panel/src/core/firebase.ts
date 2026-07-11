import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';

import { env } from './env';

/**
 * Guarded Firebase bootstrap for the Admin Panel.
 *
 * Phase 4 scope: initializes the Firebase JS SDK only when
 * `env.firebase.enabled` is true — mirrors the guarded pattern used
 * by both Flutter apps (`core/firebase/firebase_bootstrap.dart`), so
 * the admin panel still builds and runs without a real Firebase
 * project configured (the default).
 */
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

if (env.firebase.enabled) {
  firebaseApp = initializeApp({
    apiKey: env.firebase.apiKey,
    authDomain: env.firebase.authDomain,
    projectId: env.firebase.projectId,
    storageBucket: env.firebase.storageBucket,
    messagingSenderId: env.firebase.messagingSenderId,
    appId: env.firebase.appId,
  });
  firebaseAuth = getAuth(firebaseApp);
}

export { firebaseApp, firebaseAuth };
