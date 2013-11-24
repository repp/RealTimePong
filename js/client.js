var socket,
    isFirstPlayer,
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
    $connectionCount = $('span#connection-count');
    $playForm = $('form#login');
    $findNewOpponent = $('#find-new-opponent');
    $action = $('#network-message');

    $playerName  = $('#player-name');
    $opponentName = $('#opponent-name');

    $playForm.submit(findGame);
    $findNewOpponent.click(findGame);
    openConnection();
});

function openConnection() {
    socket = io.connect(window.location.hostname);
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
        isFirstPlayer = data.isFirstPlayer;
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

    this.document.onkeydown = keyDown;
    this.document.onkeyup = keyUp;

    socket.on('update_positions', function(data) {
        if(isFirstPlayer) {
            ball.x = data.ball_x;
            ball.y = data.ball_y;
            playerPaddle.y = data.player1_pos;
            opponentPaddle.y = data.player2_pos;
        } else {
            ball.x = 800 - data.ball_x;
            ball.y = data.ball_y;
            playerPaddle.y = data.player2_pos;
            opponentPaddle.y = data.player1_pos;
        }
        stage.update();
    });
    socket.emit('game_setup');
}

function keyDown(e) {
    if(e.keyCode === 87 || e.keyCode === 38) {
        socket.emit('key_down', {direction: 'up'});
    } else if(e.keyCode === 83 || e.keyCode === 40) {
        socket.emit('key_down', {direction: 'down'});
    }
}

function keyUp(e) {
    if(e.keyCode === 87 || e.keyCode === 38) {
        socket.emit('key_up', {direction: 'up'});
    } else if(e.keyCode === 83 || e.keyCode === 40) {
        socket.emit('key_up', {direction: 'down'});
    }
}
