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
var waitingPlayers = [];
var games = [];

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

    console.log('hit4');
    socket.on('find_game', function(data) {
        console.log('hit1');
        var player = {socket: socket, name: data.name};
        if(waitingPlayers.length > 0) {
            var newOpponent = waitingPlayers.pop();
            createGame(player, newOpponent);
            console.log('CREATE GAME');
        } else {
            waitingPlayers.push(player);
            console.log('LIST UP');
            console.log(waitingPlayers);
        }
    });


    function createGame(player1, player2) {
        var game = {
            player1: player1,
            player2: player2
        };
        games.push(game);

        player1.socket.emit('game_found', {
            opponent: {name: player2.name}
        });

        player2.socket.emit('game_found', {
            opponent: {name: player1.name}
        });
    }

});

