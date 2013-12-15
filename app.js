var app = require('express')()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server)
    , pong = require('./pong/index').init(io)
    , express = require('express')
    , port = process.env.PORT || 5000;

app.use("/assets", express.static(__dirname + '/assets'));
app.use(express.favicon(__dirname + '/images/favicon.ico'));

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});

server.listen(port);


