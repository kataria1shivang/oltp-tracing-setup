const logger = require('./logger'); 
const { context, trace } = require('@opentelemetry/api');

// Function to retrieve the current trace ID
function getTraceId() {
    const activeSpan = trace.getSpan(context.active());
    return activeSpan ? activeSpan.spanContext().traceId : 'none';
}

// Centralized logging functions
const log = {
    info: (message) => {
        logger.info(`[TraceID: ${getTraceId()}] ${message}`);
    },
    error: (message) => {
        logger.error(`[TraceID: ${getTraceId()}] ${message}`);
    },
    debug: (message) => {
        logger.debug(`[TraceID: ${getTraceId()}] ${message}`);
    },
};

module.exports = log;
