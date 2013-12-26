var ClientGame = function(sfxModule) {
    var stage,
        gameSpec,
        upInstruction,
        downInstruction,
        pressedUp,
        pressedDown,
        keyDown,
        playerDirection,
        playerSpeed,
        MAX_PADDLE_Y,
        ball,
        tail,
        ball_speed_x,
        ball_speed_y,
        maxSpeed,
        playerPaddle,
        opponentPaddle,
        isFirstPlayer,
        smoothingInterval,
        paddleTweenDuration;

    function setFirstPlayer(fp) {
        isFirstPlayer = fp;
    }

    function setup(spec) {
        gameSpec = spec;
        MAX_PADDLE_Y = gameSpec.field.height - gameSpec.paddle.height;
        stage = new createjs.Stage("pong");

        maxSpeed = Math.sqrt(spec.ball.maxSpeed*spec.ball.maxSpeed*2);

        //Ball
        ball = createBall(spec.ball);
        stage.addChild(ball);

        paddleTweenDuration = spec.game.updateInterval;

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

        tail = new createjs.Bitmap('/assets/images/tail.png');
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
        upInstruction = new createjs.Bitmap('/assets/images/up_instructions.png');
        downInstruction = new createjs.Bitmap('/assets/images/down_instructions.png');
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
        moveOpponentPaddle(data.player2_pos);
        playerSpeed = data.player1_speed;
        stage.update();
    }

    function updateSecondPlayer(data) {
        ball.x = 800 - data.ball_x;
        ball.y = data.ball_y;
        updateTail(-ball_speed_x, ball_speed_y);
        playerPaddle.y = data.player2_pos;
        moveOpponentPaddle(data.player1_pos);
        playerSpeed = data.player2_speed;
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

    function onKeyDown(direction) {
        keyDown = true;
        playerDirection = direction;
        if(direction === 'UP') {
            hideUpInstruction();
        } else {
            hideDownInstruction();
        }
    }

    function onKeyUp(direction) {
        keyDown = false;
        playerDirection = null;
    }

    function startSmoothing(fps) {
        var rounded = Math.round(1000/fps);
        smoothingInterval = setInterval(smooth, rounded);
    }

    function smooth() {
        moveBall();
        //movePlayerPaddle();
        checkForCollisions();
        stage.update();
    }

    function stopSmoothing() {
        try {
            clearInterval(smoothingInterval);
        } catch (e) { }
    }

//    function movePlayerPaddle() {
//        if (keyDown) {
//           // move();
//        } else if (playerSpeed !== 0) {
//            //slideToAStop();
//        }
//        // Ensure we never go off either edge.
//        playerPaddle.y = Math.max(Math.min(playerPaddle.y + playerSpeed, MAX_PADDLE_Y), 0);
//    }
//
//    function move() {
//        if (playerDirection === 'UP') {
//            playerSpeed = Math.max(Math.min(playerSpeed * gameSpec.paddle.acceleration, -gameSpec.paddle.minSpeed), -gameSpec.paddle.maxSpeed);
//        } else if (playerDirection === 'DOWN') {
//            playerSpeed = Math.min(Math.max(playerSpeed * gameSpec.paddle.acceleration, gameSpec.paddle.minSpeed), gameSpec.paddle.maxSpeed);
//        }
//    }
//
//    function slideToAStop() {
//        playerSpeed = playerSpeed * gameSpec.paddle.slideFriction;
//        if (Math.abs(playerSpeed) < 0.25) playerSpeed = 0;
//    }

    function moveOpponentPaddle(position) {
        createjs.Tween.get(opponentPaddle).to({y:position}, paddleTweenDuration,createjs.Ease.linear);
    }

    function moveBall() {
        if(isFirstPlayer) {
            ball.x += ball_speed_x;
        } else {
            ball.x -= ball_speed_x;
        }
        ball.y += ball_speed_y;
    }

    function checkForCollisions() {
        if(ball.y + gameSpec.ball.diameter > gameSpec.field.height || ball.y - gameSpec.ball.diameter < 0) {
            ball_speed_y = -ball_speed_y;
        }
        if(hasCollidedWith(playerPaddle)) {
            bounceOff(playerPaddle);
        }
        if(hasCollidedWith(opponentPaddle)) {
            bounceOff(opponentPaddle);
        }
    }

    function hasCollidedWith(paddle) {
        var diameter = gameSpec.ball.diameter;
        var paddleWidth = gameSpec.paddle.width;
        var paddleHeight = gameSpec.paddle.height;
        return (ball.x + diameter > paddle.x && ball.x < paddle.x + paddleWidth && ball.y + diameter > paddle.y && ball.y < paddle.y + paddleHeight);
    }

    function bounceOff(paddle) {
        var diameter = gameSpec.ball.diameter;
        ball.x = paddle.x + (paddle.x === gameSpec.field.rightPaddleX ? -diameter : gameSpec.paddle.width + diameter);
        ball_speed_x = -ball_speed_x;
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

    return {
        setFirstPlayer: setFirstPlayer,
        setup: setup,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onScore: onScore,
        updatePositions: updatePositions,
        destroy: destroy
    };

};