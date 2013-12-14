var ClientGame = function(sfxModule) {
    var stage,
        upInstruction,
        downInstruction,
        pressedUp,
        pressedDown,
        ball,
        tail,
        ball_speed_x,
        ball_speed_y,
        maxSpeed,
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

        maxSpeed = Math.sqrt(spec.ball.maxSpeed*spec.ball.maxSpeed*2);

        //Ball
        ball = createBall(spec.ball);
        stage.addChild(ball);

        //Player Paddle
        playerPaddle = createPaddle(spec.paddle);
        playerPaddle.x = spec.field.rightPaddleX;
        stage.addChild(playerPaddle);

        //Opponent Paddle
        opponentPaddle = createPaddle(spec.paddle);
        opponentPaddle.x = spec.field.leftPaddleX;
        stage.addChild(opponentPaddle);

        showInstructions(spec);
        stage.update();
        startSmoothing(spec.game.fps);
    }

    function createBall(ballSpec) {
        var ball = new createjs.Container();

        var outterBall = new createjs.Shape();
        outterBall.graphics.beginFill("#89edfd").drawCircle(0, 0, ballSpec.diameter);
        outterBall.shadow = new createjs.Shadow("#2b72b4", 0, 0, 22);

        var innerBall = new createjs.Shape();
        innerBall.graphics.beginFill("#c4f3fc").drawCircle(0.333, 0.333, ballSpec.diameter/3);
        innerBall.shadow = new createjs.Shadow("#ccf4fc", 0, 0, 2);

        tail = new createjs.Bitmap('images/tail.png');
        tail.y = -14;
        tail.x = -48;

        ball.addChild(outterBall);
        ball.addChild(innerBall);
        ball.addChild(tail);
        return ball;
    }

    function createPaddle(paddleSpec) {
        var paddle = new createjs.Container(),
            outerPlayerPaddle = new createjs.Shape(),
            innerPlayerPaddle = new createjs.Shape();
        outerPlayerPaddle.graphics.beginFill("#89edfd").drawRoundRect(0, 0, paddleSpec.width, paddleSpec.height, paddleSpec.width/2);
        outerPlayerPaddle.shadow = new createjs.Shadow("#2b72b4", 0, 0, 22);

        innerPlayerPaddle.graphics.beginFill("#aef2fe").drawRoundRect(4, 4, paddleSpec.width-8, paddleSpec.height-8, paddleSpec.width/2);
        innerPlayerPaddle.shadow = new createjs.Shadow("#acf2fe", 0, 0, 4);

        paddle.addChild(outerPlayerPaddle);
        paddle.addChild(innerPlayerPaddle);
        return paddle;
    }

    function showInstructions(spec) {
        upInstruction = new createjs.Bitmap('images/up_instructions.png');
        downInstruction = new createjs.Bitmap('images/down_instructions.png');
        upInstruction.x = downInstruction.x = spec.field.width - 80;
        upInstruction.y = 35;
        downInstruction.y = spec.field.height - 135;
        if(!pressedUp) stage.addChild(upInstruction);
        if(!pressedDown) stage.addChild(downInstruction);
    }

    function hideUpInstruction() {
        if(!pressedUp) {
            pressedUp = true;
            stage.removeChild(upInstruction);
        }
    }

    function hideDownInstruction() {
        if(!pressedDown) {
            pressedDown = true;
            stage.removeChild(downInstruction);
        }
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
        updateTail(ball_speed_x, ball_speed_y);
        playerPaddle.y = data.player1_pos;
        opponentPaddle.y = data.player2_pos;
        stage.update();
    }

    function updateSecondPlayer(data) {
        ball.x = 800 - data.ball_x;
        ball.y = data.ball_y;
        updateTail(-ball_speed_x, ball_speed_y);
        playerPaddle.y = data.player2_pos;
        opponentPaddle.y = data.player1_pos;
        stage.update();
    }

    function updateTail(x_speed, y_speed) {
        ball.rotation = getRotation(x_speed, y_speed);
        tail.alpha = Math.sqrt(x_speed*x_speed + y_speed*y_speed) / maxSpeed;
    }

    function getRotation(x_speed, y_speed) {
        return radiansToDegrees( Math.atan2(y_speed, x_speed) );
    }

    function radiansToDegrees(angle) {
        return angle * (180 / Math.PI);
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
        hideUpInstruction: hideUpInstruction,
        hideDownInstruction: hideDownInstruction,
        onScore: onScore,
        updatePositions: updatePositions,
        destroy: destroy
    };

};