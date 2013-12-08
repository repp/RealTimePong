//Setup
var app = require('express')()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server)
    , express = require('express')
    , port = process.env.PORT || 5000
    , connections = 0
    , waitingPlayers = []
    , gameSpec = {
        field: {
            width: 800,
            height: 525,
            leftPaddleX: 30,
            rightPaddleX: 760
        },
        paddle: {
          width: 10,
          height: 90,
          minSpeed: 8,
          maxSpeed: 18,
          acceleration: 1.15,
          bounceFriction: 0.3,
          slideFriction: 0.7
        },
        ball: {
            diameter: 7,
            maxServeSpeed: 12,
            minServeSpeed: 11,
            acceleration: 1.08,
            maxSpeed: 18
        },
        game: {
            serveDelay: 1500,
            winningScore: 5,
            fps: 24 // ~ 42 fps (1000/24)
        }
    };

app.use("/css", express.static(__dirname + '/css'));
app.use("/images", express.static(__dirname + '/images'));
app.use("/sfx", express.static(__dirname + '/sfx'));
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

    var spec = gameSpec.ball,
        diameter = spec.diameter,
        START_X = (gameSpec.field.width - diameter) / 2,
        START_Y = (gameSpec.field.height - diameter) / 2;

    function randomServe() {
        var direction = Math.random() > 0.5 ? 1 : -1;
        this.speedX = direction * spec.minServeSpeed + (spec.maxServeSpeed-spec.minServeSpeed)*Math.random();
        var maxSpeedY = (this.speedX*(gameSpec.field.height/2))/(gameSpec.field.width/2);
        this.speedY = -maxSpeedY + maxSpeedY*2*Math.random();
    }

    function onEnterFrame() {
        //Move
        this.x += this.speedX;
        this.y += this.speedY;

        //Handle Top/Bottom Edges
        if (this.y + diameter > gameSpec.field.height || this.y - diameter < 0) {
            this.speedY = -this.speedY;
            this.y = Math.min( Math.max(this.y, 0) , (gameSpec.field.width-diameter) );
        }
    }

    function hasCollidedWith(paddle) {
        return (this.x + diameter > paddle.x && this.x < paddle.x + paddle.width && this.y + diameter > paddle.y && this.y < paddle.y + paddle.height);
    }

    function bounceOff(paddle) {
        this.speedX = Math.min(-this.speedX*spec.acceleration, spec.maxSpeed);
        this.speedY = Math.min((this.speedY * spec.acceleration) - paddle.speed * gameSpec.paddle.bounceFriction, spec.maxSpeed);
        this.x = paddle.x + (paddle.x === gameSpec.field.rightPaddleX ? -diameter : paddle.width + diameter);
    }

    function stop() {
        this.speedX = 0;
        this.speedY = 0;
        this.reset();
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
        onEnterFrame: onEnterFrame,
        hasCollidedWith: hasCollidedWith,
        bounceOff: bounceOff,
        stop: stop,
        reset:reset
    };
};

var createPlayer = function (socket, name) {

    var score = 0,
        spec = gameSpec.paddle,
        paddle = createPaddle(),
        playAgain = false;

    function createPaddle() {
        var y = 0,
            x = 0,
            width = spec.width,
            height = spec.height,
            speed = 0,
            direction = null,
            keyDown = false,
            START_Y = (gameSpec.field.height - spec.height) / 2,
            MAX_Y = gameSpec.field.height - spec.height,
            MIN_Y = 0;


        function positionX(rightSide) {
          this.x = rightSide ? gameSpec.field.rightPaddleX : gameSpec.field.leftPaddleX
        }

        function onEnterFrame() {
            if (this.keyDown) {
               this.move();
            } else if (this.speed !== 0) {
               this.slideToAStop();
            }
            // Ensure we never go off either edge.
            this.y = Math.max(Math.min(this.y + this.speed, MAX_Y), MIN_Y);
        }

        function move() {
            if (this.direction === 'up') {
                this.speed = Math.max(Math.min(this.speed * spec.acceleration, -spec.minSpeed), -spec.maxSpeed);
            } else if (this.direction === 'down') {
                this.speed = Math.min(Math.max(this.speed * spec.acceleration, spec.minSpeed), spec.maxSpeed);
            }
        }

        function slideToAStop() {
            this.speed = this.speed * spec.slideFriction;
            if (Math.abs(this.speed) < 0.25) this.speed = 0;
        }

        function reset() {
            this.y = START_Y;
            this.speed = 0;
            this.direction = null;
            this.keyDown = false;
        }

        return {
            y:y,
            x:x,
            width: width,
            height: height,
            speed:speed,
            direction:direction,
            keyDown:keyDown,
            positionX: positionX,
            onEnterFrame: onEnterFrame,
            move: move,
            slideToAStop: slideToAStop,
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
        this.paddle.positionX(isFirstPlayer);
        this.addKeyListeners();
        socket.emit('game_found', {
            opponent:{ name:opponentName },
            isFirstPlayer:isFirstPlayer,
            gameSpec:gameSpec
        });
    }

    function gameOver() {
        this.playAgain = false;
        socket.emit('game_over', { won:(this.score === gameSpec.game.winningScore) });
        socket.on('play_again', socket.currentGame.playAgainRequest);
    }

    function destroyGame() {
        socket.emit('opponent_left');
        try {
            socket.removeListener('play_again', socket.currentGame.playAgainRequest);
        } catch (e) {}
        socket.currentGame = null;
        this.playAgain = false;
    }

    function reset() {
        this.score = 0;
        this.paddle.reset();
        this.playAgain = false;
        socket.emit('replay', gameSpec);
        socket.removeListener('play_again', socket.currentGame.playAgainRequest);
    }

    function updateClient(data) {
        socket.emit('update_positions', data);
    }

    function updateScores(data) {
        socket.emit('update_scores', data);
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
        updateScores: updateScores,
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
        setTimeout(serveBall, gameSpec.game.serveDelay);
    }

    function serveBall() {
        clearTimers();
        ball.randomServe();
        interval = setInterval(onEnterFrame, spec.game.fps);
    }

    function positionPaddles() {
        ball.reset();
        player1.paddle.reset();
        player2.paddle.reset();
    }

    function onEnterFrame() {
        ball.onEnterFrame();

        player1.paddle.onEnterFrame();
        player2.paddle.onEnterFrame();

        if(ball.hasCollidedWith(player1.paddle)) {        //Check for collisions with paddles
            ball.bounceOff(player1.paddle);
        } else if(ball.hasCollidedWith(player2.paddle)) { //Check for collisions with paddles
            ball.bounceOff(player2.paddle);
        } else if (ball.x > spec.field.width) {           //scoring
            onScore(player2);
            return;
        } else if (ball.x < 0) {                          // scoring
            onScore(player1);
            return;
        }

        updateClients();
    }

    function onScore(scoringPlayer) {
        ball.stop();
        scoringPlayer.score++;
        updateScores();
        if (scoringPlayer.score === spec.game.winningScore) {
            onPlayerWon(scoringPlayer);
        } else {
            serveTimeout = setTimeout(serveBall, gameSpec.game.serveDelay/2);
        }
    }

    function onPlayerWon(winningPlayer) {
        updateClients();
        winningPlayer.socket.winStreak++;
        gameOver();
    }

    function updateClients() {
        var updateData = {
            ball_x: Math.round(ball.x),
            ball_y: Math.round(ball.y),
            ball_speed_x: ball.speedX,
            ball_speed_y: ball.speedY,
            player1_pos: Math.round(player1.paddle.y),
            player2_pos: Math.round(player2.paddle.y)
        };
        player1.updateClient(updateData);
        player2.updateClient(updateData);
    }

    function updateScores() {
        var updateData = {
            player1_score:player1.score,
            player2_score:player2.score
        };
        player1.updateScores(updateData);
        player2.updateScores(updateData);
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
        if(this === player1.socket) {
            player1.playAgain = true;
        }
        if(this === player2.socket) {
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
        serveTimeout = setTimeout(serveBall, gameSpec.game.serveDelay);
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

