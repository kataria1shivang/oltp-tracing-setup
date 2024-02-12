const express = require('express');
const app = express();
const request = require('request');
const wikip = require('wiki-infobox-parser');
const { trace } = require('@opentelemetry/api');

// ejs
app.set("view engine", 'ejs');

// Ensure OpenTelemetry is initialized at the start
require('./tracing');

// routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/index', (req, response) => {
    const tracer = trace.getTracer('express-server');
    const span = tracer.startSpan('wikipedia_search');

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

    // Span for Wikipedia API Request
    const requestSpan = tracer.startSpan('wikipedia_api_request', {
        parent: span,
    });

    // Get Wikipedia search string
    request(url, (err, res, body) => {
        requestSpan.end(); // End the request span as soon as the request completes

        if (err) {
            span.recordException(err);
            span.end();
            response.redirect('404');
            return;
        }
        
        let result = JSON.parse(body);
        let x = result[3][0];
        x = x.substring(30, x.length);
        
        // Span for Parsing Wikipedia Data
        const parsingSpan = tracer.startSpan('parse_wikipedia_data', {
            parent: span,
        });

        // Get Wikipedia JSON
        wikip(x, (err, final) => {
            parsingSpan.end(); // End the parsing span as soon as parsing completes

            if (err) {
                span.recordException(err);
                span.end();
                response.redirect('404');
                return;
            }

            const answers = final;
            span.end(); // Ensure the overall span ends after the request is completely processed
            response.send(answers);
        });
    });
});

// port
app.listen(5000, () => console.log("Listening at port 5000..."));
