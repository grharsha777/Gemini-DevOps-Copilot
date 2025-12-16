import winston from 'winston';

declare module 'winston' {
  interface Logger {
    error: winston.LeveledLogMethod;
    warn: winston.LeveledLogMethod;
    info: winston.LeveledLogMethod;
    http: winston.LeveledLogMethod;
    verbose: winston.LeveledLogMethod;
    debug: winston.LeveledLogMethod;
    silly: winston.LeveledLogMethod;
  }

  interface LoggerOptions {
    level?: string;
    levels?: Record<string, number>;
    format?: Format;
    transports?: Transport[] | Transport;
    exitOnError?: boolean;
    silent?: boolean;
  }

  const format: {
    combine: (...formats: Format[]) => Format;
    timestamp: (opts?: { format?: string }) => Format;
    printf: (template: (info: any) => string) => Format;
    colorize: (opts?: { all?: boolean }) => Format;
    align: () => Format;
    errors: (opts?: { stack?: boolean }) => Format;
  };

  const transports: {
    Console: new (opts?: any) => Transport;
    File: new (opts: any) => Transport;
  };

  const createLogger: (options: LoggerOptions) => Logger;
}

declare const logger: winston.Logger;
export default logger;
