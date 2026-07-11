/* eslint-disable no-console */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Minimal structured console logger for the admin panel.
 *
 * Keeps a single, consistent call-site (`logger.info(...)`) so a real
 * remote logging sink can be swapped in later without touching call
 * sites throughout the app.
 */
function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  const consoleMethod = level === 'debug' ? 'log' : level;
  console[consoleMethod](entry);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
};
