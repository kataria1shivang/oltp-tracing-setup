const express = require('express');
const request = require('request');
const wikip = require('wiki-infobox-parser');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const winston = require('winston');
const LokiTransport = require('winston-loki');
const client = require('prom-client');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

const app = express();

const provider = new NodeTracerProvider();
provider.register();

const exporter = new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces', 
});

// Use BatchSpanProcessor for better control over batching
const batchProcessor = new BatchSpanProcessor(exporter, {
    maxQueueSize: 100, 
    maxExportBatchSize: 10, 
    scheduledDelayMillis: 500, 
    exportTimeoutMillis: 30000, 
});
provider.addSpanProcessor(batchProcessor);

// Automatically instrument Express.js
registerInstrumentations({
    instrumentations: [
        new ExpressInstrumentation(),
    ],
});

// Create a Winston Logger with Loki transport for logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new LokiTransport({
            host: 'http://192.168.10.73:3101', 
            labels: { app: 'wikipedia' }
        })
    ]
});

// Prometheus Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// EJS View Engine
app.set("view engine", 'ejs');

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/index', async (req, response) => {
    let url = "https://en.wikipedia.org/w/api.php";
    let params = {
        action: "opensearch",
        search: req.query.person,
        limit: "1",
        namespace: "0",
        format: "json"
    };

    url = url + "?";
    Object.keys(params).forEach((key) => {
        url += '&' + key + '=' + params[key];
    });

    // Start a new span for the Wikipedia API request
    const span = provider.getTracer('wikipedia-service').startSpan('Wikipedia API Request');
    // Set attributes to the span
    span.setAttribute('search_term', req.query.person);

    try {
        const result = await new Promise((resolve, reject) => {
            request(url, (err, res, body) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });

        let x = result[3][0];
        if (x) {
            x = x.substring(30, x.length);
            wikip(x, (err, final) => {
                if (err) {
                    logger.error('Wikipedia Infobox Parser failed', { error: err });
                    span.setStatus({ code: 2, message: 'Wikipedia Infobox Parser failed' });
                    span.end();
                    response.status(500).send('Error processing request');
                } else {
                    span.end();
                    response.send(final);
                }
            });
        } else {
            span.end();
            response.send('No results found');
        }
    } catch (err) {
        logger.error('Wikipedia API request failed', { error: err });
        span.setStatus({ code: 2, message: 'Wikipedia API request failed' });
        span.end();
        response.redirect('404');
    }
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Change the port to 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Listening at port ${PORT}...`));