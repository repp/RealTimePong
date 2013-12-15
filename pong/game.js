var Ball = require('./ball.js');

exports.createGame = function (player1, player2, spec) {

    var game,
        setup = false,
        interval = null,
        serveTimeout = null,
        ball = Ball.createBall(spec);

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
        setTimeout(serveBall, spec.game.serveDelay);
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
        player1.paddle.onEnterFrame();
        player2.paddle.onEnterFrame();

        ball.onEnterFrame();

        if (ball.hasCollidedWith(player1.paddle)) {        //Check for collisions with paddles
            ball.bounceOff(player1.paddle);
        } else if (ball.hasCollidedWith(player2.paddle)) { //Check for collisions with paddles
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
            serveTimeout = setTimeout(serveBall, spec.game.serveDelay / 2);
        }
    }

    function onPlayerWon(winningPlayer) {
        updateClients();
        winningPlayer.socket.winStreak++;
        gameOver();
    }

    function updateClients() {
        var updateData = {
            ball_x:Math.round(ball.x),
            ball_y:Math.round(ball.y),
            ball_speed_x:ball.speedX,
            ball_speed_y:ball.speedY,
            player1_pos:Math.round(player1.paddle.y),
            player2_pos:Math.round(player2.paddle.y)
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
        if (this === player1.socket) {
            player1.playAgain = true;
        }
        if (this === player2.socket) {
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
        serveTimeout = setTimeout(serveBall, spec.game.serveDelay);
    }

    function clearTimers() {
        try {
            clearInterval(interval);
        } catch (e) {
        }
        try {
            clearTimeout(serveTimeout);
        } catch (e) {
        }
    }

    init();
    return game;
};