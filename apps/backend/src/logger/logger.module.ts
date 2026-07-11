import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';

/**
 * LoggerModule — structured, request-correlated logging via Pino.
 *
 * Phase 2 scope: replaces Nest's default console logger app-wide.
 * Every HTTP request gets a correlation id and structured JSON logs in
 * production; pretty-printed logs in development. No business-specific
 * log fields are defined here.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('app.env') === 'production';

        return {
          pinoHttp: {
            level: config.get<string>('app.logLevel'),
            genReqId: (req: { headers: Record<string, unknown> }) =>
              (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'HH:MM:ss.l',
                  },
                },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
              ],
              censor: '[REDACTED]',
            },
            customProps: () => ({ context: 'HTTP' }),
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
