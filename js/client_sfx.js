var ClientSFX = function() {

    var START_SOUND = 'START_SOUND',
        HIT_SOUND = 'HIT_SOUND',
        SCORE_SOUND = 'SCORE_SOUND',
        preLoader,
        library = [
            {src:"/sfx/beep.mp3|/sfx/beep.ogg", id:START_SOUND},
            {src:"/sfx/peep.mp3|/sfx/peep.ogg", id:SCORE_SOUND},
            {src:"/sfx/plop.mp3|/sfx/plop.ogg", id:HIT_SOUND}
        ];

    init();

    function init() {
        if (createjs.SoundJS.checkPlugin(true)) {
            createPreLoader();
            loadLibrary();
        } else {
            console.log("ERROR: failed to initialize sounds!");
        }
    }

    function createPreLoader() {
        preLoader = new createjs.PreloadJS();
        preLoader.installPlugin(createjs.SoundJS);
        preLoader.setMaxConnections(5);
    }

    function loadLibrary() {
        while(library.length > 0) {
            loadNext();
        }
    }

    function loadNext() {
        var item = library.shift();
        preLoader.loadFile(item);
    }

    function play(sound_name) {
        createjs.SoundJS.play(sound_name);
    }

    return {
        START_SOUND: START_SOUND,
        HIT_SOUND: HIT_SOUND,
        SCORE_SOUND: SCORE_SOUND,
        play: play
    }

};