var ClientHUD = function() {
    var playerName = '',
        opponentName = '',
        $playerName,
        $opponentName,
        $playerScore,
        $opponentScore,
        $connectionCount,
        $playForm,
        $findNewOpponent,
        $playAgain,
        $action;

    function findDOMElements() {
        $connectionCount = $('span#connection-count');
        $playForm = $('form#login');
        $findNewOpponent = $('#find-new-opponent');
        $playAgain = $('#play-again');
        $action = $('#network-message');

        $playerName  = $('#player-name');
        $opponentName = $('#opponent-name');
        $playerScore = $('#player-score');
        $opponentScore = $('#opponent-score');
    }

    function addButtonListeners(onFindGame, onPlayAgain) {
        $playForm.submit(onFindGame);
        $findNewOpponent.click(onFindGame);
        $playAgain.click(onPlayAgain);
    }

    function updateConnectionCount(data) {
        $connectionCount.html(data.count)
    }

    function showFindOpponentAnimation() {
        $playForm.hide();
        $findNewOpponent.hide();
        $playAgain.hide();
        $action.html('Looking for opponent...');
        $action.show();
    }

    function setPlayerName() {
        var $nameInput = $('#name');
        playerName = $nameInput.val();
        if(playerName.length !== 0) {
            $playerName.html(playerName);
            return true;
        } else {
            alert('Please enter your name.');
            $nameInput.focus();
            return false;
        }
    }

    function getPlayerName() {
        return playerName;
    }

    function setOpponentName(name) {
        opponentName = name;
        $opponentName.html(opponentName);
    }

    function onOpponentLeft() {
        $opponentName.html('');
        $opponentScore.html('');
        $playerScore.html('');
        $action.append('<br />' + opponentName + ' has left the game.');
        $playAgain.hide();
        $findNewOpponent.show();
    }

    function showMessages() {
        $action.show();
    }

    function hideMessages() {
        $action.hide();
    }

    function updateScore(playerScore, opponentScore) {
        $playerScore.html(playerScore);
        $opponentScore.html(opponentScore);
    }

    function showGameOver(winner) {
        if(winner) {
            $action.html('You won!');
        } else {
            $action.html(opponentName + ' won.');
        }
        $findNewOpponent.show();
        $playAgain.show();
    }

    function onPlayAgain() {
        $findNewOpponent.hide();
        $playAgain.hide();
        $action.html('Waiting for ' + opponentName + '...');
    }

    return {
        getPlayerName: getPlayerName,
        init: findDOMElements,
        addButtonListeners: addButtonListeners,
        showFindOpponentAnimation: showFindOpponentAnimation,
        setPlayerName: setPlayerName,
        updateConnectionCount: updateConnectionCount,
        setOpponentName: setOpponentName,
        onOpponentLeft: onOpponentLeft,
        showMessages: showMessages,
        hideMessages: hideMessages,
        updateScore: updateScore,
        showGameOver: showGameOver,
        onPlayAgain: onPlayAgain
    };

};