import type { LoggerService } from '@nestjs/common';
import { requestContextStorage } from './middleware/request-id.middleware';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

export class RequestContextLogger implements LoggerService {
  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, optionalParams);
  }

  private write(
    level: LogLevel,
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const structured =
      typeof message === 'object' && message !== null && !Array.isArray(message)
        ? (message as Record<string, unknown>)
        : {};
    const strings = optionalParams.filter(
      (param): param is string => typeof param === 'string',
    );
    const entry = {
      ...structured,
      timestamp: new Date().toISOString(),
      level,
      context: strings[strings.length - 1] ?? structured.context,
      message:
        typeof message === 'string'
          ? message
          : structured.message ?? structured.msg ?? JSON.stringify(message),
      ...(optionalParams.length > 0 ? { details: optionalParams } : {}),
      requestId:
        requestContextStorage.getStore()?.requestId ?? structured.requestId,
    };
    const output = JSON.stringify(entry);

    if (level === 'error' || level === 'fatal') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
}
