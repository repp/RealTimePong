var io
    , connections = 0
    , waitingPlayers = []
    , gameSpec = require('./spec.js').load()
    , Player = require('./player.js')
    , Game = require('./game.js');


exports.init = function(inIO) {
  io =inIO;
  io.sockets.on('connection', socketHandler);
};

function socketHandler (socket) {

    connections++;
    updateConnectionCount();

    socket.currentGame = null;
    socket.winStreak = 0;

    socket.on('disconnect', function () {
        connections--;
        updateConnectionCount();
        if (socket.currentGame !== null) {
            socket.currentGame.destroy();
        } else {
            removeFromWaitingPlayers(socket);
        }
    });

    socket.on('find_game', function (data) {
        if (socket.currentGame !== null) {
            socket.currentGame.destroy();
        }
        var player = Player.createPlayer(socket, data.name, gameSpec);
        if (waitingPlayers.length > 0) {
            var newOpponent = waitingPlayers.shift();
            Game.createGame(player, newOpponent, gameSpec);
        } else {
            waitingPlayers.push(player);
        }
    });

    socket.on('game_setup', function () {
        if (socket.currentGame.setup) {
            socket.currentGame.firstServe();
        } else {
            socket.currentGame.setup = true;
        }
    });

    function updateConnectionCount() {
        io.sockets.emit('connection_count', {
            count:connections
        });
    }

    function removeFromWaitingPlayers(socketToRemove) {
        for (var i = 0; i < waitingPlayers.length; i++) {
            if (waitingPlayers[i].socket === socketToRemove) {
                waitingPlayers.splice(i, 1);
            }
        }
    }

}