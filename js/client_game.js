var ClientGame = function() {
    var stage,
        ball,
        ball_speed_x,
        ball_speed_y,
        playerPaddle,
        opponentPaddle,
        isFirstPlayer,
        smoothingFactor = 3,
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
        ball_speed_x = data.ball_speed_x;
        ball_speed_y = data.ball_speed_y;
        if(isFirstPlayer) {
            updateFirstPlayer(data);
        } else {
            updateSecondPlayer(data);
        }
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
        smoothingInterval = setInterval(smooth, fps/smoothingFactor);
    }

    function smooth() {
        if(isFirstPlayer) {
            ball.x += ball_speed_x/smoothingFactor;
        } else {
            ball.x -= ball_speed_x/smoothingFactor;
        }
        ball.y += ball_speed_y/smoothingFactor;
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
        updatePositions: updatePositions,
        destroy: destroy
    };

};