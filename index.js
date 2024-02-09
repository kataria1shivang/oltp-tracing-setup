const { createServer } = require('http2');
const express = require('express');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { CollectorTraceExporter } = require('@opentelemetry/exporter-collector-grpc');

const app = express();

const provider = new NodeTracerProvider();
provider.register();

const otlpExporter = new CollectorTraceExporter({
    serviceName: 'tempo',
    url: 'http://tempo:3100/v1/traces', // Tempo endpoint
});

provider.addSpanProcessor(new BatchSpanProcessor(otlpExporter, {
    bufferSize: 100, // Change this buffer size as per your requirement
}));

registerInstrumentations({
    instrumentations: [new ExpressInstrumentation()],
});

// const server = createServer({
//   allowHTTP1: true, // Allow HTTP/1.1 for compatibility
//   maxSessionMemory: 100, // Adjust as per your requirement
// }, app);

server.listen(3001, () => {
    console.log('Server listening on port 3001');
});
