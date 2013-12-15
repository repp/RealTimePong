var ClientHUD = function() {
    var playerName = '',
        opponentName = '',
        playerScore = 0,
        opponentScore = 0,
        $logo,
        $playerName,
        $opponentName,
        $playerScore,
        $opponentScore,
        $scoreLights,
        $connectionCount,
        $sfxToggle,
        $sfxOn,
        $sfxOff,
        $playForm,
        $findNewOpponent,
        $findOpponentAnim,
        $playAgain,
        $action,
        $game,
        $pong;



    function init() {
        findDOMElements();
        glowLogo();
    }

    function findDOMElements() {
        $logo = $('header h1');
        $connectionCount = $('span#connection-count');

        $sfxToggle = $('#sfx-toggle');
        $sfxOn = $sfxToggle.find('.on');
        $sfxOff = $sfxToggle.find('.off');

        $playForm = $('form#login');
        $findNewOpponent = $('#find-new-opponent');
        $playAgain = $('#play-again');
        $action = $('#network-message');

        $game = $('#game');
        $pong = $('#pong');
        $playerName  = $('#player-name');
        $opponentName = $('#opponent-name');
        $playerScore = $('#player-score');
        $opponentScore = $('#opponent-score');
        $scoreLights = $('.score-light');
        $findOpponentAnim = $('#loading-animation');
        $findOpponentAnim.hide();
    }

    function glowLogo() {
        $logo.addClass('glowing');
    }

    function addButtonListeners(onFindGame, onPlayAgain, toggleSFX) {
        $playForm.submit(onFindGame);
        $findNewOpponent.click(onFindGame);
        $playAgain.click(onPlayAgain);
        $sfxToggle.click(function() {
            toggleSFXButton();
            toggleSFX();
        });
    }

    function updateConnectionCount(data) {
        $connectionCount.html(data.count)
    }

    function toggleSFXButton() {
        if($sfxOn.hasClass('active')){
            $sfxOn.removeClass('active');
            $sfxOff.addClass('active');
        } else {
            $sfxOn.addClass('active');
            $sfxOff.removeClass('active');
        }
    }

    function showFindOpponentAnimation() {
        clearScoreboard();
        $playForm.hide();
        $findNewOpponent.hide();
        $playAgain.hide();
        $action.html('Looking for an opponent.');
        $findOpponentAnim.show();
        $action.show();
        $game.addClass('active');
        $scoreLights.fadeIn();
    }

    function setPlayerName() {
        var $nameInput = $('#name');
        playerName = $nameInput.val();
        if(playerName.length >= 2 && playerName.length <= 16) {
            $playerName.html(playerName);
            return true;
        } else {
            alert('Please enter a name between 2 and 16 characters.');
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
        clearScoreboard();
        $opponentName.html('');
        $action.append('<br />' + opponentName + ' has left the game.');
        $playAgain.hide();
        $findNewOpponent.show();
    }

    function showPong() {
        $pong.show();
    }

    function hidePong() {
        $pong.hide();
    }

    function showMessages() {
        $action.show();
    }

    function hideMessages() {
        $action.hide();
        $findOpponentAnim.hide();
    }

    function updateScore(playerScore, opponentScore) {
        var i, j;
        this.playerScore = playerScore;
        this.opponentScore = opponentScore;
        for(i = 0; i <= playerScore; i++) {
            $('#player-score .'+i).addClass('active');
        }

        for(j = 0; j <= opponentScore; j++) {
            $('#opponent-score .'+j).addClass('active');
        }
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
        clearScoreboard();
        $findNewOpponent.hide();
        $playAgain.hide();
        $action.html('Waiting for ' + opponentName + '...');
    }

    function clearScoreboard() {
        $scoreLights.removeClass('active');
        this.playerScore = 0;
        this.opponentScore = 0;
    }

    return {
        playerScore: playerScore,
        opponentScore: opponentScore,
        getPlayerName: getPlayerName,
        init: init,
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
        onPlayAgain: onPlayAgain,
        showPong: showPong,
        hidePong: hidePong
    };

};