exports.createPlayer = function (socket, name, gameSpec) {

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
            width:width,
            height:height,
            speed:speed,
            direction:direction,
            keyDown:keyDown,
            positionX:positionX,
            onEnterFrame:onEnterFrame,
            move:move,
            slideToAStop:slideToAStop,
            reset:reset
        };
    }

    function addKeyListeners() {
        socket.on('key_down', function (data) {
            paddle.keyDown = true;
            paddle.direction = data.direction;
        });

        socket.on('key_up', function () {
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
        } catch (e) {
        }
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
        addKeyListeners:addKeyListeners,
        playAgain:playAgain,
        updateClient:updateClient,
        updateScores:updateScores,
        reset:reset,
        destroyGame:destroyGame,
        gameOver:gameOver
    };

};