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

    var paddleHeight = 100;
    var paddleWidth = 10;
    var rightPaddleX = 760;
    var leftPaddleX = 30;
    var ballDiameter = 6;
    var paddleFrictionCoeff = 0.25;
    var winningScore = 2;

    socket.currentGame = null;
    socket.player = null;
    socket.winStreak = 0;

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
        if(socket.currentGame !== null) {
            socket.currentGame.destroy();
        }
        var player = {
              socket: socket,
              name: data.name,
              paddle: {
                  pos: 0,
                  speed: 0,
                  direction: null,
                  keyDown: false
              }
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
            p1Score: 0,
            p2Score: 0,
            setup: false,
            interval: null,
            serveTimeout: null,
            p1PlayAgain: false,
            p2PlayerAgain: false,
            ball: {
                x: 0,
                y: 0,
                speedX: 0,
                speedY: 0
            },
            serveBall: function() {
                try {
                    clearInterval(this.interval);
                } catch(e) {}
                try {
                    clearTimeout(this.serveTimeout);
                } catch(e) {}
                this.ball.y = 260;
                this.ball.x = 397;
                this.ball.speedX = 12;
                this.ball.speedY = 2;
                this.player1.paddle.pos = 225;
                this.player2.paddle.pos = 225;
                var g = this;
                this.interval = setInterval(function() { g.onEnterFrame(); }, 31);
            },
            onEnterFrame: function() {
                //Move Ball
                this.ball.x += this.ball.speedX;
                this.ball.y += this.ball.speedY;

                //Handle Top/Bottom Edges
                if(this.ball.y+ballDiameter > 525 || this.ball.y-ballDiameter < 0) {
                    this.ball.speedY = -this.ball.speedY;
                    this.ball.y = Math.min(Math.max(this.ball.y, 0), 525-ballDiameter)
                }

                //Move Player Paddles
                if(player1.paddle.keyDown) {
                    if(player1.paddle.direction === 'up') {
                        player1.paddle.speed = Math.max(Math.min(player1.paddle.speed*1.1, -7), -17);
                    } else if(player1.paddle.direction === 'down') {
                        player1.paddle.speed = Math.min(Math.max(player1.paddle.speed*1.1, 7), 17);
                    }
                } else {
                    player1.paddle.speed = player1.paddle.speed * 0.68;
                    if(Math.abs(player1.paddle.speed) < 0.5) player1.paddle.speed = 0;
                }

                if(player2.paddle.keyDown) {
                    if(player2.paddle.direction === 'up') {
                        player2.paddle.speed = Math.max(Math.min(player2.paddle.speed*1.1, -7), -17);
                    } else if(player2.paddle.direction === 'down') {
                        player2.paddle.speed = Math.min(Math.max(player2.paddle.speed*1.1, 7), 17);
                    }
                } else {
                    player2.paddle.speed = player2.paddle.speed * 0.68;
                    if(Math.abs(player2.paddle.speed) < 0.5) player2.paddle.speed = 0;
                }

                player1.paddle.pos = Math.max(Math.min(player1.paddle.pos + player1.paddle.speed, 425), 0);
                player2.paddle.pos = Math.max(Math.min(player2.paddle.pos + player2.paddle.speed, 425), 0);

                //Check for collisions with paddles
                if(this.ball.x+ballDiameter > rightPaddleX && this.ball.x < rightPaddleX+paddleWidth && this.ball.y+ballDiameter > player1.paddle.pos && this.ball.y < player1.paddle.pos+paddleHeight) {
                    this.ball.speedX = -this.ball.speedX;
                    this.ball.speedY -= player1.paddle.speed * paddleFrictionCoeff;
                    this.ball.x = rightPaddleX-ballDiameter;
                }

                if(this.ball.x < leftPaddleX+paddleWidth && this.ball.x+ballDiameter > leftPaddleX && this.ball.y+ballDiameter > player2.paddle.pos && this.ball.y < player2.paddle.pos+paddleHeight ) {
                    this.ball.speedX = -this.ball.speedX;
                    this.ball.speedY -= player2.paddle.speed * paddleFrictionCoeff;
                    this.ball.x = leftPaddleX+paddleWidth;
                }

                //Scoring
                if(this.ball.x+ballDiameter > 800) {
                    this.ball.x = 800-ballDiameter;
                    this.ball.speedX = 0;
                    this.ball.speedY = 0;
                    this.p2Score++;
                    if(this.p2Score === winningScore) {
                        this.player2.socket.winStreak++;
                        this.gameOver();
                    } else {
                        var g = this;
                        this.serveTimeout = setTimeout(function() {g.serveBall();}, 1000);
                    }
                }
                if (this.ball.x < 0) {
                    this.ball.x = 0+ballDiameter;
                    this.ball.speedX = 0;
                    this.ball.speedY = 0;
                    this.p1Score++;
                    if(this.p1Score === winningScore) {
                        this.player1.socket.winStreak++;
                        this.gameOver();
                    } else {
                        var g = this;
                        this.serveTimeout = setTimeout(function() {g.serveBall();}, 1000);
                    }
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
                  player1_pos: this.player1.paddle.pos,
                  player2_pos: this.player2.paddle.pos,
                  player1_score: this.p1Score,
                  player2_score: this.p2Score
              };
            },
            gameOver: function() {
                clearInterval(this.interval);
                clearTimeout(this.serveTimeout);
                this.p1PlayAgain = false;
                this.p2PlayAgain = false;
                this.player1.socket.on('play_again', this.playAgainRequest);
                this.player2.socket.on('play_again', this.playAgainRequest);
                this.player1.socket.emit('game_over', { won: (this.p1Score === winningScore) });
                this.player2.socket.emit('game_over', { won: (this.p2Score === winningScore) });
            },
            destroy: function() {
                clearInterval(this.interval);
                clearTimeout(this.serveTimeout);
                this.player1.socket.emit('opponent_left');
                this.player2.socket.emit('opponent_left');
                this.player1.socket.currentGame = null;
                this.player2.socket.currentGame = null;
                this.player1.socket.player = null;
                this.player2.socket.player = null;
            },
            playAgainRequest: function() {
                if(this.player === this.currentGame.player1){
                    this.currentGame.p1PlayAgain = true;
                }
                if(this.player === this.currentGame.player2){
                    this.currentGame.p2PlayAgain = true;
                }

                if(this.currentGame.p1PlayAgain && this.currentGame.p2PlayAgain) {
                    this.currentGame.resetGame();
                }
            },
            resetGame: function() {
                this.p1Score = 0;
                this.p2Score = 0;
                this.player1.paddle.direction = null;
                this.player2.paddle.direction = null;
                this.player1.paddle.keyDown = false;
                this.player2.paddle.keyDown = false;
                this.setup = false;
                this.interval = null;
                this.serveTimeout = null;


                this.player1.socket.emit('replay', {
                    paddleHeight: paddleHeight,
                    paddleWidth: paddleWidth,
                    rightPaddleX: rightPaddleX,
                    leftPaddleX: leftPaddleX,
                    ballDiameter: ballDiameter
                });
                this.player2.socket.emit('replay', {
                    paddleHeight: paddleHeight,
                    paddleWidth: paddleWidth,
                    rightPaddleX: rightPaddleX,
                    leftPaddleX: leftPaddleX,
                    ballDiameter: ballDiameter
                });
                var g = this;
                this.player1.socket.removeListener('play_again', g.playAgainRequest);
                this.player2.socket.removeListener('play_again', g.playAgainRequest);
                this.serveTimeout = setTimeout(function() {g.serveBall();}, 1000);
            }
        };
        player1.socket.currentGame = game;
        player2.socket.currentGame = game;
        player1.socket.player = player1;
        player2.socket.player = player2;

        player1.socket.on('key_down', function(data) {
            player1.paddle.keyDown = true;
            player1.paddle.direction = data.direction;
        });

        player2.socket.on('key_down', function(data) {
            player2.paddle.keyDown = true;
            player2.paddle.direction = data.direction;
        });

        player1.socket.on('key_up', function() {
            player1.paddle.keyDown = false;
        });

        player2.socket.on('key_up', function() {
            player2.paddle.keyDown = false;
        });

        player1.socket.emit('game_found', {
            opponent: {name: player2.name},
            isFirstPlayer: true,
            gameSpec: {
                paddleHeight: paddleHeight,
                paddleWidth: paddleWidth,
                rightPaddleX: rightPaddleX,
                leftPaddleX: leftPaddleX,
                ballDiameter: ballDiameter
            }
        });

        player2.socket.emit('game_found', {
            opponent: {name: player1.name},
            isFirstPlayer: false,
            gameSpec: {
                paddleHeight: paddleHeight,
                paddleWidth: paddleWidth,
                rightPaddleX: rightPaddleX,
                leftPaddleX: leftPaddleX,
                ballDiameter: ballDiameter
            }
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

