var ClientGame = function() {
    var stage,
        ball,
        playerPaddle,
        opponentPaddle;

    function setup(spec) {
        stage = new createjs.Stage("pong");

        //Ball
        ball = new createjs.Shape();
        ball.graphics.beginFill("black").drawCircle(0, 0, spec.ballDiameter);
        stage.addChild(ball);

        //Player Paddle
        playerPaddle = new createjs.Shape();
        playerPaddle.graphics.beginFill("black").drawRect(0, 0, spec.paddleWidth, spec.paddleHeight);
        playerPaddle.x = spec.rightPaddleX;
        stage.addChild(playerPaddle);

        //Opponent Paddle
        opponentPaddle = new createjs.Shape();
        opponentPaddle.graphics.beginFill("black").drawRect(0, 0, spec.paddleWidth, spec.paddleHeight);
        opponentPaddle.x = spec.leftPaddleX;
        stage.addChild(opponentPaddle);

        stage.update();
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
        setup: setup,
        updateFirstPlayer: updateFirstPlayer,
        updateSecondPlayer: updateSecondPlayer,
        destroy: destroy
    };

};