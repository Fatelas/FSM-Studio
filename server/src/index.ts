/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
const express = require("express");
const http = require('http');
const path = require('path');

const app = express();

const port = parseInt(process.argv[2]) || 80;

app.use('/', express.static(path.resolve('./client/dist')));

http.createServer(app).listen(port, 'localhost', () => {

    console.log(`HTTP server running on port ${port}`);

});