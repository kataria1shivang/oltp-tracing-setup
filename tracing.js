const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const otlpExporter = new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces', 
  });

const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'nodejs', 
});

const sdk = new NodeSDK({
  resource: resource,
  traceExporter: otlpExporter,
  spanProcessor: new BatchSpanProcessor(otlpExporter, {
    scheduledDelayMillis: 5000, 
    maxQueueSize: 100, 
    maxExportBatchSize: 10, 
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

console.log('Tracing initialized');

module.exports = sdk;