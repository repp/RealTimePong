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
          height: 100,
          minSpeed: 7,
          maxSpeed: 17,
          acceleration: 1.1,
          bounceFriction: 0.25,
          slideFriction: 0.68
        },
        ball: {
            diameter: 6
        },
        game: {
            serveDelay: 1500,
            winningScore: 5,
            fps: 32
        }
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

    var spec = gameSpec.ball,
        diameter = spec.diameter,
        START_X = (gameSpec.field.width - diameter) / 2,
        START_Y = (gameSpec.field.height - diameter) / 2;

    function randomServe() {
        this.speedX = 12;
        this.speedY = 0;
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
        this.speedX = -this.speedX;
        this.speedY -= paddle.speed * gameSpec.paddle.bounceFriction;
        this.x = paddle.x + (this.x-this.speedX > paddle.x ? -diameter : paddle.width) ;
    }

    function stop() {
        this.speedX = 0;
        this.speedY = 0;
        this.x = Math.min(Math.max(this.x, diameter), gameSpec.field.width - diameter);
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
        setTimeout(serveBall, gameSpec.game.serveDelay);
    }

    function serveBall() {
        clearTimers();
        positionPaddles();
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
        } else if (ball.x + spec.ball.diameter > spec.field.width) {    //scoring
            ball.stop();
            player2.score++;
            if (player2.score === spec.game.winningScore) {
                updateClients();
                player2.socket.winStreak++;
                gameOver();
                return;
            } else {
                serveTimeout = setTimeout(serveBall, gameSpec.game.serveDelay);
            }
        } else if (ball.x < 0) {                          // scoring
            ball.stop();
            player1.score++;
            if (player1.score === spec.game.winningScore) {
                updateClients();
                player1.socket.winStreak++;
                gameOver();
                return;
            } else {
                serveTimeout = setTimeout(serveBall, gameSpec.game.serveDelay);
            }
        }

        //Broadcast game state
        updateClients();
    }

    function updateClients() {
        var updateData = {
            ball_x:ball.x,
            ball_y:ball.y,
            player1_pos:player1.paddle.y,
            player2_pos:player2.paddle.y,
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

