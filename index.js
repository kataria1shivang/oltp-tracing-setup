const express = require('express');
const app = express();
const request = require('request');
const wikip = require('wiki-infobox-parser');
require('./tracing'); 
const log = require('./tracelogger'); 

app.set("view engine", 'ejs');

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/index', (req, response) => {
    log.info('Wikipedia search initiated.');

    let url = "https://en.wikipedia.org/w/api.php";
    let params = {
        action: "opensearch",
        search: req.query.person,
        limit: "1",
        namespace: "0",
        format: "json"
    };

    url += "?" + Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');

    request(url, (err, res, body) => {
        if (err) {
            log.error(`Error during Wikipedia API request: ${err.message}`);
            response.redirect('404');
            return;
        }
        
        let result;
        try {
            result = JSON.parse(body);
        } catch (parseError) {
            log.error(`Error parsing Wikipedia response: ${parseError.message}`);
            response.redirect('404');
            return;
        }

        let pageName = result[3][0]?.substring(30) || '';

        wikip(pageName, (err, final) => {
            if (err) {
                log.error(`Error parsing Wikipedia data: ${err.message}`);
                response.redirect('404');
                return;
            }

            response.send(final);
        });
    });
});

app.listen(5000, () => log.info("Server listening at port 5000..."));
