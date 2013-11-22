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
    socket.player = null;

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
        var player = {
              socket: socket,
              name: data.name,
              pos: 0,
              speed: 2,
              keyDown: false,
              direction: null
        };
        if(waitingPlayers.length > 0) {
            var newOpponent = waitingPlayers.shift(); // Optimize later
            createGame(player, newOpponent);
        } else {
            waitingPlayers.push(player);
        }
    });

    socket.on('game_setup', function() {
       if(socket.currentGame.setup) {
            socket.currentGame.serveBall();
       } else {
           socket.currentGame.setup = true;
       }
    });

    function createGame(player1, player2) {
        var game = {
            player1: player1,
            player2: player2,
            setup: false,
            interval: null,
            ball: {
                x: 0,
                y: 0,
                speedX: 0,
                speedY: 0,
                diameter: 6
            },
            serveBall: function() {
                this.ball.y = 260;
                this.ball.x = 397;
                this.ball.speedX = 6;
                this.ball.speedY = 2;
                this.player1.pos = 225;
                this.player2.pos = 425;
                var g = this;
                this.interval = setInterval(function() { g.onEnterFrame(); }, 31);
            },
            onEnterFrame: function() {
                //Move Ball
                this.ball.x += this.ball.speedX;
                this.ball.y += this.ball.speedY;

                //Handle Edges
                if(this.ball.x+this.ball.diameter > 800 || this.ball.x-this.ball.diameter < 0) {
                    this.ball.speedX = -this.ball.speedX;
                    this.ball.x = Math.min(Math.max(this.ball.x, 0), 800-this.ball.diameter)
                }
                if(this.ball.y+this.ball.diameter > 525 || this.ball.y-this.ball.diameter < 0) {
                    this.ball.speedY = -this.ball.speedY;
                    this.ball.y = Math.min(Math.max(this.ball.y, 0), 525-this.ball.diameter)
                }

                //Move Player Paddles
                if(player1.keyDown) {
                    player1.speed = player1.direction === 'up' ? -10 : 10;
                    player1.pos += player1.speed;
                }

                if(player2.keyDown) {
                    player2.speed = player2.direction === 'up' ? -10 : 10;
                    player2.pos += player2.speed;
                }

                //Broadcast game state
                this.update();
            },
            update: function() {
                this.player1.socket.emit('update_positions', this.updateData());
                this.player2.socket.emit('update_positions', this.updateData());
            },
            updateData: function () {
              return {
                  ball_x: this.ball.x,
                  ball_y: this.ball.y,
                  player1_pos: this.player1.pos,
                  player2_pos: this.player2.pos
              };
            },
            destroy: function() {
                this.player1.socket.emit('opponent_left');
                this.player2.socket.emit('opponent_left');
                this.player1.socket.currentGame = null;
                this.player2.socket.currentGame = null;
            }
        };
        player1.socket.currentGame = game;
        player2.socket.currentGame = game;
        player1.socket.player = player1;
        player2.socket.player = player2;

        player1.socket.on('key_down', function(data) {
            player1.keyDown = true;
            player1.direction = data.direction;
        });

        player2.socket.on('key_down', function(data) {
            player1.keyDown = true;
            player1.direction = data.direction;
        });

        player1.socket.on('key_up', function(data) {
            player1.keyDown = false;
        });

        player2.socket.on('key_down', function(data) {
            player1.keyDown = false;
        });

        player1.socket.emit('game_found', {
            opponent: {name: player2.name},
            isFirstPlayer: true
        });

        player2.socket.emit('game_found', {
            opponent: {name: player1.name},
            isFirstPlayer: false
        });
    }

    function removeFromWaitingPlayers(socketToRemove) {
        for(var i = 0; i < waitingPlayers.length; i++) {
            if(waitingPlayers[i].socket === socketToRemove) {
                waitingPlayers.splice(i, 1);
            }
        }
    }

});

