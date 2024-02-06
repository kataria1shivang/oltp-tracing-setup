const express = require('express');
const app = express();
const request = require('request');
const wikip = require('wiki-infobox-parser');
const winston = require('winston');
// Update the require statement for winston-loki
const LokiTransport = require('winston-loki');
const client = require('prom-client');

// Updated Winston Loki Logger Configuration to use winston-loki
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new LokiTransport({
      host: 'http://192.168.10.73:3100', 
      labels: { app: 'wikipedia' } // Ensure this label matches your actual application name or identifier
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

app.get('/index', (req, response) => {
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

    // Get Wikipedia search string
    request(url, (err, res, body) => {
        if (err) {
            logger.error('Wikipedia API request failed', { error: err });
            response.redirect('404');
        } else {
            let result = JSON.parse(body);
            let x = result[3][0];
            if (x) {
                x = x.substring(30, x.length);
                // Get Wikipedia JSON
                wikip(x, (err, final) => {
                    if (err) {
                        logger.error('Wikipedia Infobox Parser failed', { error: err });
                        response.redirect('404');
                    } else {
                        response.send(final);
                    }
                });
            } else {
                response.send('No results found');
            }
        }
    });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Change the port to 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Listening at port ${PORT}...`));
