var app = require('express')()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server)
    , express = require('express')
    , port = process.env.PORT || 5000;

server.listen(port);

app.use("/css", express.static(__dirname + '/css'));
app.use("/vendor_js", express.static(__dirname + '/vendor_js'));
app.use("/views", express.static(__dirname + '/views'));

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/views/index.html');
});

var connections = 0;

io.sockets.on('connection', function (socket) {
    connections++;
    io.sockets.emit('connection_count', {
        count: connections
    });

    socket.on('disconnect', function () {
        connections--;
        io.sockets.emit('connection_count', {
            count: connections
        });
    });

//    socket.emit('news', { hello: 'world' });
//    socket.on('my other event', function (data) {
//        console.log(data);
//    });

});

