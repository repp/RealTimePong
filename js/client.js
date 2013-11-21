var socket,
    playerName,
    opponentName,
    stage,
    ball,
    playerPaddle,
    opponentPaddle,
    $playerName,
    $opponentName,
    $connectionCount,
    $playForm,
    $findNewOpponent,
    $action;

$(document).ready(function() {
    $connectionCount = $('span#connection-count'),
    $playForm = $('form#login'),
    $findNewOpponent = $('#find-new-opponent'),
    $action = $('#network-message');

    $playerName  = $('#player-name');
    $opponentName = $('#opponent-name');

    $playForm.submit(findGame);
    $findNewOpponent.click(findGame);
    openConnection();
});

function openConnection() {
    socket = io.connect(window.location.hostname),
    socket.on('connection_count', function (data) {
        $connectionCount.html(data.count)
    });
}

function findGame(e) {
    e.preventDefault();
    var $nameInput = $('#name');
    playerName = $nameInput.val();
    if(playerName.length !== 0) {
        $playerName.html(playerName);
        showFindOpponentAnimation();
        findAnOpponent();
    } else {
        alert('Please enter your name.');
        $nameInput.focus();
    }
    return false;
}

function showFindOpponentAnimation() {
    $playForm.hide();
    $findNewOpponent.hide();
    $action.html('Looking for opponent...');
    $action.show();
}

function findAnOpponent() {
    socket.on('game_found', function(data) {
        opponentName = data.opponent.name;
        $opponentName.html(opponentName);
        $action.html('Opponent found. Setting up game...');
        setupGame();
    });

    socket.emit('find_game', {
        name: playerName
    });

    socket.on('opponent_left', function(data) {
        $opponentName.html('');
        $action.html('Your opponent has left the game.');
        $findNewOpponent.show();
    });
}

function setupGame() {
    stage = new createjs.Stage("pong");

    //Ball
    ball = new createjs.Shape();
    ball.graphics.beginFill("black").drawCircle(0, 0, 6);
    stage.addChild(ball);

    //Player Paddle
    playerPaddle = new createjs.Shape();
    playerPaddle.graphics.beginFill("black").drawRect(0, 0, 10, 100);
    playerPaddle.x = 760;
    stage.addChild(playerPaddle);

    //Opponent Paddle
    opponentPaddle = new createjs.Shape();
    opponentPaddle.graphics.beginFill("black").drawRect(0, 0, 10, 100);
    opponentPaddle.x = 30;
    stage.addChild(opponentPaddle);

    stage.update();
    $action.hide();

    socket.on('update_positions', function(data) {
        console.log(data);
        ball.x = data.ball_x;
        ball.y = data.ball_y;
        playerPaddle.y = data.player1_pos;
        opponentPaddle.y = data.player1_pos;
        stage.update();
    });

    socket.emit('game_setup');
}
