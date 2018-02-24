const express = require('express');
const app = express();
const routes = require('./routes');
const redis = require('redis');

app.set('port', 3000);
app.use(express.static('public'));
routes.configure(app);

const server = require('http').createServer(app);

server.listen(app.get('port'), function () {
  console.log(`Node app is running on port ${app.get('port')}`);
})
