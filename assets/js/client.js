var pongClient = (function() {

    var socket,
        isFirstPlayer,
        opponentPresent = false,
        hud = new ClientHUD(), // See client_hud.js
        sfx = new ClientSFX(), // See client_sfx.js
        game = new ClientGame(sfx); // See client_game.js

    function openConnection() {
        socket = io.connect(window.location.hostname);
        socket.on('connection_count', hud.updateConnectionCount);
    }

    function login(e) {
        e.preventDefault();
        opponentPresent = false;
        if(hud.setPlayerName()) {
            findAnOpponent();
            hud.showFindOpponentAnimation();
        }
        return false;
    }

    function findAnOpponent() {
        socket.on('game_found', onGameFound);
        socket.emit('find_game', {
            name: hud.getPlayerName()
        });
    }

    function onGameFound(data) {
        socket.removeListener('game_found', onGameFound);
        socket.on('opponent_left', onOpponentLeft);
        isFirstPlayer = data.isFirstPlayer;
        game.setFirstPlayer(isFirstPlayer);
        opponentPresent = true;
        hud.setOpponentName(data.opponent.name);
        setupGame(data.gameSpec);
    }

    function onOpponentLeft() {
        if(opponentPresent) {
            opponentPresent = false;
            hud.onOpponentLeft();
            destroyGame();
        }
        socket.removeListener('opponent_left', onOpponentLeft);
    }

    function setupGame(spec) {
        try {
            socket.removeListener('replay', setupGame);
        } catch(e) {}

        hud.showPong();
        game.setup(spec);
        hud.hideMessages();
        sfx.play(sfx.START_SOUND);

        document.addEventListener('keydown', keyDown);
        document.addEventListener('keyup', keyUp);

        socket.on('update_positions', game.updatePositions);
        socket.on('fix_drift', game.fixDrift);
        socket.on('update_scores', updateScores);
        socket.on('game_over', onGameOver);
        socket.emit('game_setup');
    }

    function updateScores(data) {
        game.onScore();
        playScoreSound(data.player1_score, data.player2_score);
        if(isFirstPlayer) {
            hud.updateScore(data.player1_score, data.player2_score);
        } else {
            hud.updateScore(data.player2_score, data.player1_score);
        }
    }

    function playScoreSound(newP1Score, newP2Score) {
        if( (isFirstPlayer && newP1Score > hud.playerScore) || (!isFirstPlayer && newP2Score > hud.playerScore) ) {
            sfx.play(sfx.START_SOUND);
        } else {
            sfx.play(sfx.SCORE_SOUND);
        }
    }

    function keyDown(e) {
        if(e.keyCode === 87 || e.keyCode === 38) {
            game.onKeyDown('UP');
            socket.emit('key_down', {direction: 'up'});
        } else if(e.keyCode === 83 || e.keyCode === 40) {
            game.onKeyDown('DOWN');
            socket.emit('key_down', {direction: 'down'});
        }
    }

    function keyUp(e) {
        if(e.keyCode === 87 || e.keyCode === 38) {
            socket.emit('key_up', {direction: 'up'});
            game.onKeyUp('UP');
        } else if(e.keyCode === 83 || e.keyCode === 40) {
            socket.emit('key_up', {direction: 'down'});
            game.onKeyUp('DOWN');
        }
    }

    function onGameOver(data) {
        socket.removeListener('game_over', onGameOver);
        hud.hidePong();
        hud.showGameOver(data.won);
        destroyGame();
    }

    function destroyGame() {
        game.destroy();
        hud.showMessages();
        this.document.removeEventListener('keydown', keyDown);
        this.document.removeEventListener('keyup', keyUp);
        socket.removeListener('update_positions', game.updatePositions);
        socket.removeListener('fix_drift', game.fixDrift);
        socket.removeListener('update_scores', updateScores);
    }

    function playAgain() {
        socket.on('replay', setupGame);
        hud.onPlayAgain();
        socket.emit('play_again');
    }

    function toggleSFX() {
        sfx.toggle();
    }

    return {
        init: function() {
            hud.init();
            hud.addButtonListeners(login, playAgain, toggleSFX);
            openConnection();
        }
    };

})();

$(document).ready(pongClient.init);
