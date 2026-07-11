/**
 * Typed access to Vite environment variables.
 *
 * Centralizing this avoids scattering `import.meta.env.VITE_*` (and
 * its untyped `any` values) throughout the app.
 */
export interface AppEnv {
  apiBaseUrl: string;
  firebase: {
    enabled: boolean;
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

function readEnv(key: string, fallback = ''): string {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export const env: AppEnv = {
  apiBaseUrl: readEnv('VITE_API_BASE_URL', 'http://localhost:3000/api'),
  firebase: {
    enabled: readEnv('VITE_FIREBASE_ENABLED') === 'true',
    apiKey: readEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('VITE_FIREBASE_APP_ID'),
  },
};
