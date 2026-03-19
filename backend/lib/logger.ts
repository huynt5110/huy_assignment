import winston from 'winston';

const customFormat = winston.format.printf((info) => {
  const { timestamp, level, message, service, correlationId, stack, ...meta } = info;

  const srv = typeof service === 'string' ? `[${service.toUpperCase()}]` : '[APP]';
  const cid = correlationId ? ` [CID:${correlationId}]` : '';

  // Base log line
  let log = `${timestamp} ${level} ${srv} ${cid}: ${message}`;

  // Add stack trace if it's an error
  if (stack) {
    log += `\n\x1b[31mSTACK TRACE:\x1b[0m\n${stack}`;
  } else if (Object.keys(meta).length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }

  return log;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),
  ],
});
