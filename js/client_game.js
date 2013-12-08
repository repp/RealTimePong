var ClientGame = function(sfxModule) {
    var stage,
        ball,
        ball_speed_x,
        ball_speed_y,
        playerPaddle,
        opponentPaddle,
        isFirstPlayer,
        smoothingFactor = 3,
        updateFactor,
        smoothingInterval;

    function setFirstPlayer(fp) {
        isFirstPlayer = fp;
    }

    function setup(spec) {
        stage = new createjs.Stage("pong");

        //Ball
        ball = new createjs.Container();
        var outterBall = new createjs.Shape();
            outterBall.graphics.beginFill("#89edfd").drawCircle(0, 0, spec.ball.diameter);
            outterBall.shadow = new createjs.Shadow("#2b72b4", 0, 0, 22);
        var innerBall = new createjs.Shape();
            innerBall.graphics.beginFill("#c4f3fc").drawCircle(1, 1, spec.ball.diameter/3);
            innerBall.shadow = new createjs.Shadow("#ccf4fc", 0, 0, 2);
        ball.addChild(outterBall);
        ball.addChild(innerBall);
        stage.addChild(ball);

        //Player Paddle
        playerPaddle = new createjs.Container();
        var outerPlayerPaddle = new createjs.Shape();
            outerPlayerPaddle.graphics.beginFill("#89edfd").drawRoundRect(0, 0, spec.paddle.width, spec.paddle.height, spec.paddle.width/2);
            outerPlayerPaddle.shadow = new createjs.Shadow("#2b72b4", 0, 0, 22);
        var innerPlayerPaddle = new createjs.Shape();
            innerPlayerPaddle.graphics.beginFill("#aef2fe").drawRoundRect(4, 4, spec.paddle.width-8, spec.paddle.height-8, spec.paddle.width/2);
            innerPlayerPaddle.shadow = new createjs.Shadow("#acf2fe", 0, 0, 4);

        playerPaddle.x = spec.field.rightPaddleX;
        playerPaddle.addChild(outerPlayerPaddle);
        playerPaddle.addChild(innerPlayerPaddle);
        stage.addChild(playerPaddle);

        //Opponent Paddle
        opponentPaddle = new createjs.Container();
        var outerPlayerPaddle2 = new createjs.Shape();
            outerPlayerPaddle2.graphics.beginFill("#89edfd").drawRoundRect(0, 0, spec.paddle.width, spec.paddle.height, spec.paddle.width/2);
            outerPlayerPaddle2.shadow = new createjs.Shadow("#2b72b4", 0, 0, 22);
        var innerPlayerPaddle2 = new createjs.Shape();
            innerPlayerPaddle.graphics.beginFill("#aef2fe").drawRoundRect(4, 4, spec.paddle.width-8, spec.paddle.height-8, spec.paddle.width/2);
            innerPlayerPaddle.shadow = new createjs.Shadow("#acf2fe", 0, 0, 4);
        opponentPaddle.x = spec.field.leftPaddleX;
        opponentPaddle.addChild(outerPlayerPaddle2);
        opponentPaddle.addChild(innerPlayerPaddle2);
        stage.addChild(opponentPaddle);

        stage.update();
        startSmoothing(spec.game.fps);
    }

    function updatePositions(data) {
        if(ballChangedDirections(data.ball_speed_x, data.ball_speed_y)) {
            playHitSound();
        }
        ball_speed_x = data.ball_speed_x;
        ball_speed_y = data.ball_speed_y;
        if(isFirstPlayer) {
            updateFirstPlayer(data);
        } else {
            updateSecondPlayer(data);
        }
    }

    function ballChangedDirections(new_x_speed, new_y_speed) {
        return Math.abs(new_x_speed + ball_speed_x) < Math.abs(new_x_speed) || Math.abs(new_y_speed + ball_speed_y) < Math.abs(new_y_speed);
    }

    function playHitSound() {
        sfxModule.play(sfxModule.HIT_SOUND);
    }

    function updateFirstPlayer(data) {
        ball.x = data.ball_x;
        ball.y = data.ball_y;
        playerPaddle.y = data.player1_pos;
        opponentPaddle.y = data.player2_pos;
        stage.update();
    }

    function updateSecondPlayer(data) {
        ball.x = 800 - data.ball_x;
        ball.y = data.ball_y;
        playerPaddle.y = data.player2_pos;
        opponentPaddle.y = data.player1_pos;
        stage.update();
    }

    function onScore() {
        ball_speed_x = 0;
        ball_speed_y = 0;
    }

    function destroy() {
        stopSmoothing();
        if(stage !== null) {
            stage.removeAllChildren();
            stage.update();
            opponentPaddle = null;
            playerPaddle = null;
            ball = null;
            stage = null;
        }
    }

    function startSmoothing(fps) {
        var rounded = Math.round(fps/smoothingFactor);
        updateFactor = fps/rounded;
        smoothingInterval = setInterval(smooth, rounded);
    }

    function smooth() {
        if(isFirstPlayer) {
            ball.x += ball_speed_x/updateFactor;
        } else {
            ball.x -= ball_speed_x/updateFactor;
        }
        ball.y += ball_speed_y/updateFactor;
        stage.update();
    }

    function stopSmoothing() {
        try {
            clearInterval(smoothingInterval);
        } catch (e) { }
    }

    return {
        setFirstPlayer: setFirstPlayer,
        setup: setup,
        onScore: onScore,
        updatePositions: updatePositions,
        destroy: destroy
    };

};