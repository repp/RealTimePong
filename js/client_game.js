var ClientGame = function() {
    var stage,
        ball,
        playerPaddle,
        opponentPaddle;

    function setup(spec) {
        stage = new createjs.Stage("pong");

        //Ball
        ball = new createjs.Container();
        var outterBall = new createjs.Shape();
            outterBall.graphics.beginFill("#89edfd").drawCircle(0, 0, spec.ballDiameter);
            outterBall.shadow = new createjs.Shadow("#2b72b4", 0, 0, 22);
        var innerBall = new createjs.Shape();
            innerBall.graphics.beginFill("#c4f3fc").drawCircle(1, 1, spec.ballDiameter/3);
            innerBall.shadow = new createjs.Shadow("#ccf4fc", 0, 0, 2);
        ball.addChild(outterBall);
        ball.addChild(innerBall);
        stage.addChild(ball);

        //Player Paddle
        playerPaddle = new createjs.Container();
        var outerPlayerPaddle = new createjs.Shape();
            outerPlayerPaddle.graphics.beginFill("#89edfd").drawRoundRect(0, 0, spec.paddleWidth, spec.paddleHeight, spec.paddleWidth/2);
            outerPlayerPaddle.shadow = new createjs.Shadow("#2b72b4", 0, 0, 22);
        var innerPlayerPaddle = new createjs.Shape();
            innerPlayerPaddle.graphics.beginFill("#aef2fe").drawRoundRect(4, 4, spec.paddleWidth-8, spec.paddleHeight-8, spec.paddleWidth/2);
            innerPlayerPaddle.shadow = new createjs.Shadow("#acf2fe", 0, 0, 4);
        playerPaddle.x = spec.rightPaddleX;
        playerPaddle.addChild(outerPlayerPaddle);
        playerPaddle.addChild(innerPlayerPaddle);
        stage.addChild(playerPaddle);

        //Opponent Paddle
        opponentPaddle = new createjs.Container();
        var outerPlayerPaddle2 = new createjs.Shape();
            outerPlayerPaddle2.graphics.beginFill("#89edfd").drawRoundRect(0, 0, spec.paddleWidth, spec.paddleHeight, spec.paddleWidth/2);
            outerPlayerPaddle2.shadow = new createjs.Shadow("#2b72b4", 0, 0, 22);
        var innerPlayerPaddle2 = new createjs.Shape();
            innerPlayerPaddle.graphics.beginFill("#aef2fe").drawRoundRect(4, 4, spec.paddleWidth-8, spec.paddleHeight-8, spec.paddleWidth/2);
            innerPlayerPaddle.shadow = new createjs.Shadow("#acf2fe", 0, 0, 4);
        opponentPaddle.x = spec.leftPaddleX;
        opponentPaddle.addChild(outerPlayerPaddle2);
        opponentPaddle.addChild(innerPlayerPaddle2);
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