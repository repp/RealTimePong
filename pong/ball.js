exports.createBall = function (gameSpec) {

    var spec = gameSpec.ball,
        diameter = spec.diameter,
        START_X = (gameSpec.field.width - diameter) / 2,
        START_Y = (gameSpec.field.height - diameter) / 2;

    function randomServe() {
        var direction = Math.random() > 0.5 ? 1 : -1;
        this.speedX = direction * spec.minServeSpeed + (spec.maxServeSpeed - spec.minServeSpeed) * Math.random();
        var maxSpeedY = (this.speedX * (gameSpec.field.height / 2)) / (gameSpec.field.width / 2);
        this.speedY = -maxSpeedY + maxSpeedY * 2 * Math.random();
    }

    function onEnterFrame() {
        //Move
        this.x += this.speedX;
        this.y += this.speedY;

        //Handle Top/Bottom Edges
        if (this.y + diameter > gameSpec.field.height || this.y - diameter < 0) {
            this.speedY = -this.speedY;
            this.y = Math.min(Math.max(this.y, 0), (gameSpec.field.width - diameter));
        }
    }

    function hasCollidedWith(paddle) {
        return (this.x + diameter > paddle.x && this.x < paddle.x + paddle.width && this.y + diameter > paddle.y && this.y < paddle.y + paddle.height);
    }

    function bounceOff(paddle) {
        this.speedX = Math.min(-this.speedX * spec.acceleration, spec.maxSpeed);
        this.speedY = Math.min((this.speedY * spec.acceleration) - paddle.speed * gameSpec.paddle.bounceFriction, spec.maxSpeed);
        this.x = paddle.x + (paddle.x === gameSpec.field.rightPaddleX ? -diameter : paddle.width + diameter);
    }

    function stop() {
        this.speedX = 0;
        this.speedY = 0;
        this.reset();
    }

    function reset() {
        this.x = START_X;
        this.y = START_Y;
    }

    return {
        x:START_X,
        y:START_Y,
        speedX:0,
        speedY:0,
        randomServe:randomServe,
        onEnterFrame:onEnterFrame,
        hasCollidedWith:hasCollidedWith,
        bounceOff:bounceOff,
        stop:stop,
        reset:reset
    };
};