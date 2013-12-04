//Setup
var app = require('express')()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server)
    , express = require('express')
    , port = process.env.PORT || 5000
    , connections = 0
    , waitingPlayers = []
    , gameSpec = {
        fieldWidth:800,
        fieldHeight:525,
        paddleHeight:100,
        paddleWidth:10,
        rightPaddleX:760,
        leftPaddleX:30,
        ballDiameter:6,
        paddleFrictionCoeff:0.25,
        winningScore:5,
        framesPerSecond:32
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
        var player = createPlayer(socket, data.name);
        if (waitingPlayers.length > 0) {
            var newOpponent = waitingPlayers.shift();
            createGame(player, newOpponent, gameSpec);
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

});

var createBall = function () {

    var START_X = (gameSpec.fieldWidth - gameSpec.ballDiameter) / 2,
        START_Y = (gameSpec.fieldHeight - gameSpec.ballDiameter) / 2;

    function randomServe() {
        this.speedX = 12;
        this.speedY = 2;
    }

    function reset() {
        this.x = START_X;
        this.y = START_Y;
    }

    return {
        x:START_X,
        y:START_Y,
        speedX:0,
        speedY:0,
        randomServe: randomServe,
        reset:reset
    };
};

var createPlayer = function (socket, name) {

    var score = 0,
        paddle = createPaddle(),
        playAgain = false;

    function createPaddle() {
        var pos = 0,
            speed = 0,
            direction = null,
            keyDown = false,
            START_Y = (gameSpec.fieldHeight - gameSpec.paddleHeight) / 2;

        function move(data) {
            this.keyDown = true;
            this.direction = data.direction;
        }

        function reset() {
            this.pos = START_Y;
            this.speed = 0;
            this.direction = null;
            this.keyDown = false;
        }

        return {
            pos:pos,
            speed:speed,
            direction:direction,
            keyDown:keyDown,
            move: move,
            reset:reset
        };
    }

    function addKeyListeners() {
        socket.on('key_down', function(data) {
            paddle.keyDown = true;
            paddle.direction = data.direction;
        });

        socket.on('key_up', function() {
            paddle.keyDown = false;
            paddle.direction = null;
        });
    }

    function onGameFound(game, opponentName, isFirstPlayer) {
        socket.currentGame = game;
        this.addKeyListeners();
        socket.emit('game_found', {
            opponent:{ name:opponentName },
            isFirstPlayer:isFirstPlayer,
            gameSpec:gameSpec
        });
    }

    function gameOver() {
        this.playAgain = false;
        socket.emit('game_over', { won:(this.score === gameSpec.winningScore) });
        socket.on('play_again', socket.currentGame.playAgainRequest);
    }

    function destroyGame() {
        socket.emit('opponent_left');
        socket.currentGame = null;
    }

    function reset() {
        this.score = 0;
        this.paddle.reset();
        socket.emit('replay', gameSpec);
        socket.removeListener('play_again', socket.currentGame.playAgainRequest);
    }

    function updateClient(data) {
        socket.emit('update_positions', data);
    }

    return {
        socket:socket,
        name:name,
        score:score,
        paddle:paddle,
        onGameFound:onGameFound,
        addKeyListeners: addKeyListeners,
        playAgain:playAgain,
        updateClient:updateClient,
        reset:reset,
        destroyGame:destroyGame,
        gameOver:gameOver
    };

};

var createGame = function (player1, player2, spec) {

    var game,
        setup = false,
        interval = null,
        serveTimeout = null,
        ball = createBall();

    function init() {
        game = {
            init:init,
            setup:setup,
            firstServe:firstServe,
            serveBall:serveBall,
            playAgainRequest:playAgainRequest,
            destroy:destroy
        };
        player1.onGameFound(game, player2.name, true);
        player2.onGameFound(game, player1.name, false);
    }

    function firstServe() {
        positionPaddles();
        updateClients();
        setTimeout(serveBall, 1000);
    }

    function serveBall() {
        clearTimers();
        positionPaddles();
        ball.randomServe();
        interval = setInterval(onEnterFrame, spec.framesPerSecond);
    }

    function positionPaddles() {
        ball.reset();
        player1.paddle.reset();
        player2.paddle.reset();
    }

    function onEnterFrame() {
        //Move Ball
        ball.x += ball.speedX;
        ball.y += ball.speedY;

        //Handle Top/Bottom Edges
        if (ball.y + spec.ballDiameter > spec.fieldHeight || ball.y - spec.ballDiameter < 0) {
            ball.speedY = -ball.speedY;
            ball.y = Math.min(Math.max(ball.y, 0), spec.fieldWidth - spec.ballDiameter)
        }

        //Move Player Paddles
        if (player1.paddle.keyDown) {
            if (player1.paddle.direction === 'up') {
                player1.paddle.speed = Math.max(Math.min(player1.paddle.speed * 1.1, -7), -17);
            } else if (player1.paddle.direction === 'down') {
                player1.paddle.speed = Math.min(Math.max(player1.paddle.speed * 1.1, 7), 17);
            }
        } else {
            player1.paddle.speed = player1.paddle.speed * 0.68;
            if (Math.abs(player1.paddle.speed) < 0.5) player1.paddle.speed = 0;
        }

        if (player2.paddle.keyDown) {
            if (player2.paddle.direction === 'up') {
                player2.paddle.speed = Math.max(Math.min(player2.paddle.speed * 1.1, -7), -17);
            } else if (player2.paddle.direction === 'down') {
                player2.paddle.speed = Math.min(Math.max(player2.paddle.speed * 1.1, 7), 17);
            }
        } else {
            player2.paddle.speed = player2.paddle.speed * 0.68;
            if (Math.abs(player2.paddle.speed) < 0.5) player2.paddle.speed = 0;
        }

        player1.paddle.pos = Math.max(Math.min(player1.paddle.pos + player1.paddle.speed, 425), 0);
        player2.paddle.pos = Math.max(Math.min(player2.paddle.pos + player2.paddle.speed, 425), 0);

        //Check for collisions with paddles
        if (ball.x + spec.ballDiameter > spec.rightPaddleX && ball.x < spec.rightPaddleX + spec.paddleWidth && ball.y + spec.ballDiameter > player1.paddle.pos && ball.y < player1.paddle.pos + spec.paddleHeight) {
            ball.speedX = -ball.speedX;
            ball.speedY -= player1.paddle.speed * spec.paddleFrictionCoeff;
            ball.x = spec.rightPaddleX - spec.ballDiameter;
        }

        if (ball.x < spec.leftPaddleX + spec.paddleWidth && ball.x + spec.ballDiameter > spec.leftPaddleX && ball.y + spec.ballDiameter > player2.paddle.pos && ball.y < player2.paddle.pos + spec.paddleHeight) {
            ball.speedX = -ball.speedX;
            ball.speedY -= player2.paddle.speed * spec.paddleFrictionCoeff;
            ball.x = spec.leftPaddleX + spec.paddleWidth;
        }

        //Scoring
        if (ball.x + spec.ballDiameter > 800) {
            ball.x = 800 - spec.ballDiameter;
            ball.speedX = 0;
            ball.speedY = 0;
            player2.score++;
            if (player2.score === spec.winningScore) {
                updateClients();
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
            player1.score++;
            if (player1.score === spec.winningScore) {
                updateClients();
                player1.socket.winStreak++;
                gameOver();
                return;
            } else {
                serveTimeout = setTimeout(serveBall, 1500);
            }
        }

        //Broadcast game state
        updateClients();
    }

    function updateClients() {
        var updateData = {
            ball_x:ball.x,
            ball_y:ball.y,
            player1_pos:player1.paddle.pos,
            player2_pos:player2.paddle.pos,
            player1_score:player1.score,
            player2_score:player2.score
        };
        player1.updateClient(updateData);
        player2.updateClient(updateData);
    }

    function gameOver() {
        clearTimers();
        player1.gameOver();
        player2.gameOver();
    }

    function destroy() {
        clearTimers();
        player1.destroyGame();
        player2.destroyGame();
    }

    function playAgainRequest() {
        if(this.id === player1.socket.id) {
            player1.playAgain = true;
        }
        if(this.id === player2.socket.id) {
            player2.playAgain = true;
        }
        if (player1.playAgain && player2.playAgain) {
            resetGame();
        }
    }

    function resetGame() {
        player1.reset();
        player2.reset();
        setup = false;
        serveTimeout = setTimeout(serveBall, 1000);
    }

    function clearTimers() {
        try {
            clearInterval(interval);
        } catch (e) { }
        try {
            clearTimeout(serveTimeout);
        } catch (e) { }
    }

    init();
    return game;
};

