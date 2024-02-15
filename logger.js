const winston = require('winston');
const LokiTransport = require('winston-loki');
const { context, trace } = require('@opentelemetry/api');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      const activeSpan = trace.getSpan(context.active());
      const traceId = activeSpan ? activeSpan.spanContext().traceId : 'none';
      return `${info.timestamp} [TraceID: ${traceId}] ${info.level}: ${info.message}`;
    })
  ),
  transports: [
    new LokiTransport({
      host: 'http://localhost:3101',
      labels: { job: 'nodejs' }
    }),
    new winston.transports.Console()
  ],
});

module.exports = logger;
