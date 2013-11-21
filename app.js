//Setup
var app = require('express')()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server)
    , express = require('express')
    , port = process.env.PORT || 5000;

server.listen(port);

app.use("/css", express.static(__dirname + '/css'));
app.use("/js", express.static(__dirname + '/js'));
app.use("/js/vendor_js", express.static(__dirname + '/js/vendor_js'));
app.use("/views", express.static(__dirname + '/views'));

//Routes
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/views/index.html');
});

//Connections
var connections = 0;
var waitingPlayers = [];

io.sockets.on('connection', function (socket) {

    socket.currentGame = null;

    connections++;
    io.sockets.emit('connection_count', {
        count: connections
    });

    socket.on('disconnect', function () {
        connections--;
        if(socket.currentGame !== null) {
            socket.currentGame.destroy();
        } else {
            removeFromWaitingPlayers(socket);
        }
        io.sockets.emit('connection_count', {
            count: connections
        });
    });

    socket.on('find_game', function(data) {
        console.log("FIND GAME");
        console.log(waitingPlayers);
        var player = {socket: socket, name: data.name};
        if(waitingPlayers.length > 0) {
            var newOpponent = waitingPlayers.shift(); // Optimize later
            createGame(player, newOpponent);
            console.log('got new opponent');
        } else {
            waitingPlayers.push(player);
            console.log('added to waiting players');
        }
    });


    function createGame(player1, player2) {
        var game = {
            player1: player1,
            player2: player2,
            destroy: function() {
                this.player1.socket.emit('opponent_left');
                this.player2.socket.emit('opponent_left');
                this.player1.socket.currentGame = null;
                this.player2.socket.currentGame = null;
            }
        };
        player1.socket.currentGame = game;
        player2.socket.currentGame = game;

        player1.socket.emit('game_found', {
            opponent: {name: player2.name}
        });

        player2.socket.emit('game_found', {
            opponent: {name: player1.name}
        });
        return game;
    }

    function removeFromWaitingPlayers(socketToRemove) {
        for(var i = 0; i < waitingPlayers.length; i++) {
            if(waitingPlayers[i].socket === socketToRemove) {
                waitingPlayers.splice(i, 1);
                console.log('REMOVED: ' + i);
                console.log(waitingPlayers);
            }
        }
    }


});

