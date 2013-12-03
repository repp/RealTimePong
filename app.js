//Setup
var app = require('express')()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server)
    , express = require('express')
    , port = process.env.PORT || 5000
    , connections = 0
    , waitingPlayers = []
    , gameSpec = {
        fieldWidth: 800,
        fieldHeight: 525,
        paddleHeight: 100,
        paddleWidth: 10,
        rightPaddleX: 760,
        leftPaddleX: 30,
        ballDiameter: 6,
        paddleFrictionCoeff: 0.25,
        winningScore: 5,
        framesPerSecond: 32
    };

app.use("/css", express.static(__dirname + '/css'));
app.use("/images", express.static(__dirname + '/images'));
app.use("/css/fonts", express.static(__dirname + '/css/fonts'));
app.use("/js", express.static(__dirname + '/js'));
app.use("/js/vendor_js", express.static(__dirname + '/js/vendor_js'));
app.use("/views", express.static(__dirname + '/views'));

//Routes
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/views/index.html');
});

server.listen(port);

io.sockets.on('connection', function (socket) {

    connections++;
    updateConnectionCount();

    socket.currentGame = null;
    socket.player = null;
    socket.winStreak = 0;

    socket.on('disconnect', function () {
        connections--;
        updateConnectionCount();
        if(socket.currentGame !== null) {
            socket.currentGame.destroy();
        } else {
            removeFromWaitingPlayers(socket);
        }
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
            var newOpponent = waitingPlayers.shift();
            newGame(player, newOpponent, gameSpec);
        } else {
            waitingPlayers.push(player);
        }
    });

    socket.on('game_setup', function() {
       if(socket.currentGame.setup) {
           socket.currentGame.firstServe();
       } else {
           socket.currentGame.setup = true;
       }
    });

    function updateConnectionCount() {
        io.sockets.emit('connection_count', {
            count: connections
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

var newGame = function(player1, player2, spec) {

    var game,
        p1Score = 0,
        p2Score = 0,
        setup = false,
        interval = null,
        serveTimeout = null,
        p1PlayAgain = false,
        p2PlayAgain = false,
        ball = {
            x: 0,
            y: 0,
            speedX: 0,
            speedY: 0
        };

    function init() {
        game = {
            init: init,
            setup: setup,
            firstServe: firstServe,
            serveBall: serveBall,
            destroy: destroy
        };
        addSocketListeners(player1, player2.name, true);
        addSocketListeners(player2, player1.name, false);
    }

    function addSocketListeners(player, opponentName, isFirstPlayer) {
        player.socket.currentGame = game;
        player.socket.player = player;

        player.socket.on('key_down', function(data) {
            player.paddle.keyDown = true;
            player.paddle.direction = data.direction;
        });

        player.socket.on('key_up', function() {
            player.paddle.keyDown = false;
        });

        player.socket.emit('game_found', {
            opponent: {name: opponentName},
            isFirstPlayer: isFirstPlayer,
            gameSpec: spec
        });
    }

    function firstServe() {
        positionPaddles();
        update();
        setTimeout(serveBall, 1000);
    }

    function serveBall() {
        try {
            clearInterval(interval);
        } catch(e) {}
        try {
            clearTimeout(serveTimeout);
        } catch(e) {}
        positionPaddles();
        ball.speedX = 12;
        ball.speedY = 2;
        interval = setInterval(onEnterFrame, spec.framesPerSecond);
    }

    function positionPaddles() {
        ball.y = (spec.fieldHeight-spec.ballDiameter) / 2;
        ball.x = (spec.fieldWidth-spec.ballDiameter) / 2;

        var startingPaddlePosition = (spec.fieldHeight-spec.paddleHeight) / 2;
        player1.paddle.pos = startingPaddlePosition;
        player2.paddle.pos = startingPaddlePosition;
    }

    function onEnterFrame() {
        //Move Ball
        ball.x += ball.speedX;
        ball.y += ball.speedY;

        //Handle Top/Bottom Edges
        if(ball.y+spec.ballDiameter > spec.fieldHeight || ball.y-spec.ballDiameter < 0) {
            ball.speedY = -ball.speedY;
            ball.y = Math.min(Math.max(ball.y, 0), spec.fieldWidth-spec.ballDiameter)
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
        if(ball.x+spec.ballDiameter > spec.rightPaddleX && ball.x < spec.rightPaddleX+spec.paddleWidth && ball.y+spec.ballDiameter > player1.paddle.pos && ball.y < player1.paddle.pos+spec.paddleHeight) {
            ball.speedX = -ball.speedX;
            ball.speedY -= player1.paddle.speed * spec.paddleFrictionCoeff;
            ball.x = spec.rightPaddleX-spec.ballDiameter;
        }

        if(ball.x < spec.leftPaddleX+spec.paddleWidth && ball.x+spec.ballDiameter > spec.leftPaddleX && ball.y+spec.ballDiameter > player2.paddle.pos && ball.y < player2.paddle.pos+spec.paddleHeight ) {
            ball.speedX = -ball.speedX;
            ball.speedY -= player2.paddle.speed * spec.paddleFrictionCoeff;
            ball.x = spec.leftPaddleX+spec.paddleWidth;
        }

        //Scoring
        if(ball.x+spec.ballDiameter > 800) {
            ball.x = 800-spec.ballDiameter;
            ball.speedX = 0;
            ball.speedY = 0;
            p2Score++;
            if(p2Score === spec.winningScore) {
                update();
                player2.socket.winStreak++;
                gameOver();
                return;
            } else {
                serveTimeout = setTimeout(serveBall, 1500);
            }
        }
        if (ball.x < 0) {
            ball.x = spec.ballDiameter;
            ball.speedX = 0;
            ball.speedY = 0;
            p1Score++;
            if(p1Score === spec.winningScore) {
                update();
                player1.socket.winStreak++;
                gameOver();
                return;
            } else {
                serveTimeout = setTimeout(serveBall, 1500);
            }
        }

        //Broadcast game state
        update();
    }

    function update() {
        player1.socket.emit('update_positions', updateData());
        player2.socket.emit('update_positions', updateData());
    }

    function updateData() {
        return {
            ball_x: ball.x,
            ball_y: ball.y,
            player1_pos: player1.paddle.pos,
            player2_pos: player2.paddle.pos,
            player1_score: p1Score,
            player2_score: p2Score
        };
    }

    function gameOver() {
        clearInterval(interval);
        clearTimeout(serveTimeout);
        p1PlayAgain = false;
        p2PlayAgain = false;
        player1.socket.on('play_again', playAgainRequest);
        player2.socket.on('play_again', playAgainRequest);
        player1.socket.emit('game_over', { won: (p1Score === spec.winningScore) });
        player2.socket.emit('game_over', { won: (p2Score === spec.winningScore) });
    }

    function destroy () {
        clearInterval(interval);
        clearTimeout(serveTimeout);
        player1.socket.emit('opponent_left');
        player2.socket.emit('opponent_left');
        player1.socket.currentGame = null;
        player2.socket.currentGame = null;
        player1.socket.player = null;
        player2.socket.player = null;
    }

    function playAgainRequest() {
        p1PlayAgain = p1PlayAgain || this.player === player1;
        p2PlayAgain = p2PlayAgain || this.player === player2;

        if(p1PlayAgain && p2PlayAgain) {
            resetGame();
        }
    }

    function resetGame() {
        p1Score = 0;
        p2Score = 0;
        player1.paddle.direction = null;
        player2.paddle.direction = null;
        player1.paddle.keyDown = false;
        player2.paddle.keyDown = false;
        setup = false;

        player1.socket.emit('replay', spec);
        player2.socket.emit('replay', spec);
        player1.socket.removeListener('play_again', playAgainRequest);
        player2.socket.removeListener('play_again', playAgainRequest);
        serveTimeout = setTimeout(serveBall, 1000);
    }

  init();
  return game;
};

