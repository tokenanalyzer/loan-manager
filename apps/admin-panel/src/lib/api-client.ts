import axios, { AxiosError, AxiosInstance } from 'axios';

import type { ApiErrorResponse } from '@loan-manager/shared-types';

import { env } from '../core/env';
import { logger } from './logger';

/**
 * API client architecture.
 *
 * A single, pre-configured Axios instance used for all backend calls.
 * Base URL, timeouts, and generic request/response/error handling.
 *
 * Phase 4 adds real bearer-token attachment via
 * [setAuthTokenProvider] — the provider is called fresh on every
 * request (rather than setting a static header once) so a refreshed
 * Firebase ID token is always used, not a stale one.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authTokenProvider: (() => Promise<string | null>) | null = null;

/** Called by AuthProvider once a user is signed in. */
export function setAuthTokenProvider(provider: () => Promise<string | null>): void {
  authTokenProvider = provider;
}

/** Called by AuthProvider on sign-out, so no stale token is attached later. */
export function clearAuthTokenProvider(): void {
  authTokenProvider = null;
}

apiClient.interceptors.request.use(async (config) => {
  if (authTokenProvider) {
    const token = await authTokenProvider();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  logger.debug('API request', { method: config.method, url: config.url });
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const message = error.response?.data?.message ?? error.message;

    logger.error('API request failed', { status, message, url: error.config?.url });

    return Promise.reject(error);
  },
);
