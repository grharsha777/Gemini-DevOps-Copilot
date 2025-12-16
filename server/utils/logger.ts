import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { combine, timestamp, printf, colorize, align, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  const stackTrace = stack ? `\n${stack}` : '';
  return `${timestamp} [${level}]: ${message}${metaString}${stackTrace}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    align(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log') 
    })
  ],
  exitOnError: false
});

// Create a stream for morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

export default logger;
