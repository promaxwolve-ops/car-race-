"use strict";

/* =========================================================
   BMW NIGHT RUSH
   Racing Game JavaScript
========================================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ageScreen = document.getElementById("ageScreen");
const controlScreen = document.getElementById("controlScreen");
const garageScreen = document.getElementById("garageScreen");
const gameScreen = document.getElementById("gameScreen");

const ageInput = document.getElementById("ageInput");
const ageError = document.getElementById("ageError");

const startButton = document.getElementById("startButton");
const controlStartButton = document.getElementById("controlStartButton");
const raceButton = document.getElementById("raceButton");

const speedValue = document.getElementById("speedValue");
const distanceValue = document.getElementById("distanceValue");
const scoreValue = document.getElementById("scoreValue");

const nitroPercent = document.getElementById("nitroPercent");
const nitroFill = document.getElementById("nitroFill");

const boostEffect = document.getElementById("boostEffect");

const gameOver = document.getElementById("gameOver");

const finalScore = document.getElementById("finalScore");
const finalDistance = document.getElementById("finalDistance");
const finalSpeed = document.getElementById("finalSpeed");

const restartButton = document.getElementById("restartButton");
const pauseButton = document.getElementById("pauseButton");

const tiltMessage = document.getElementById("tiltMessage");


/* =========================================================
   GAME STATE
========================================================= */

let gameRunning = false;
let paused = false;

let selectedControl = "buttons";

let lastTime = 0;

let speed = 0;
let maxSpeed = 320;

let distance = 0;
let score = 0;
let topSpeed = 0;

let nitro = 100;

let activeBoost = 0;
let boostMultiplier = 1;

let roadOffset = 0;

let spawnTimer = 0;

let trafficCars = [];

let stars = [];

let particles = [];

let keys = {
    left: false,
    right: false,
    brake: false
};

let touchLeft = false;
let touchRight = false;
let touchBrake = false;

let tiltValue = 0;


/* =========================================================
   CANVAS
========================================================= */

function resizeCanvas() {

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    createStars();
}

window.addEventListener("resize", resizeCanvas);


/* =========================================================
   SCREEN CONTROL
========================================================= */

function showScreen(screen) {

    ageScreen.classList.remove("active");
    controlScreen.classList.remove("active");
    garageScreen.classList.remove("active");

    screen.classList.add("active");
}


/* =========================================================
   AGE
========================================================= */

startButton.addEventListener("click", function () {

    const age = Number(ageInput.value);

    if (
        !Number.isInteger(age) ||
        age < 0 ||
        age > 100
    ) {

        ageError.textContent =
            "Please select an age from 0 to 100.";

        return;
    }

    ageError.textContent = "";

    showScreen(controlScreen);
});


/* =========================================================
   CONTROL SELECTION
========================================================= */

document.querySelectorAll(".control-option").forEach(function (button) {

    button.addEventListener("click", function () {

        document
            .querySelectorAll(".control-option")
            .forEach(function (item) {
                item.classList.remove("selected");
            });

        button.classList.add("selected");

        selectedControl = button.dataset.control;

        if (selectedControl === "tilt") {

            tiltMessage.textContent =
                "Tilt mode selected. Allow motion access when your phone asks.";

        } else {

            tiltMessage.textContent =
                "Buttons mode selected.";
        }
    });

});


controlStartButton.addEventListener("click", async function () {

    if (selectedControl === "tilt") {

        await enableTilt();

    }

    showScreen(garageScreen);
});


/* =========================================================
   TILT / GYROSCOPE
========================================================= */

async function enableTilt() {

    if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
    ) {

        try {

            const permission =
                await DeviceOrientationEvent.requestPermission();

            if (permission === "granted") {

                window.addEventListener(
                    "deviceorientation",
                    handleOrientation
                );

                tiltMessage.textContent =
                    "Tilt controls enabled.";

            } else {

                tiltMessage.textContent =
                    "Motion permission was not granted. Buttons will still work.";
            }

        } catch (error) {

            tiltMessage.textContent =
                "Tilt unavailable. Buttons will still work.";
        }

    } else if ("DeviceOrientationEvent" in window) {

        window.addEventListener(
            "deviceorientation",
            handleOrientation
        );

        tiltMessage.textContent =
            "Tilt controls enabled.";

    } else {

        tiltMessage.textContent =
            "Tilt is not supported on this device.";
    }
}


function handleOrientation(event) {

    if (typeof event.gamma !== "number") {
        return;
    }

    /*
       Gamma normally represents left/right tilt.

       -25 = strong left
        0  = center
       +25 = strong right
    */

    tiltValue = Math.max(
        -1,
        Math.min(1, event.gamma / 25)
    );
}


/* =========================================================
   GARAGE -> RACE
========================================================= */

raceButton.addEventListener("click", function () {

    startGame();

});


restartButton.addEventListener("click", function () {

    gameOver.classList.remove("active");

    startGame();

});


/* =========================================================
   START GAME
========================================================= */

function startGame() {

    garageScreen.classList.remove("active");

    gameScreen.classList.add("active");

    gameRunning = true;
    paused = false;

    speed = 0;
    distance = 0;
    score = 0;
    topSpeed = 0;

    nitro = 100;

    activeBoost = 0;
    boostMultiplier = 1;

    roadOffset = 0;

    spawnTimer = 0;

    trafficCars = [];
    particles = [];

    player.x = 0;

    createTraffic();

    lastTime = performance.now();

    requestAnimationFrame(gameLoop);
}


/* =========================================================
   PLAYER CAR
========================================================= */

const player = {

    x: 0,

    width: 54,

    height: 100,

    color: "#dce2e8"
};


/* =========================================================
   TRAFFIC
========================================================= */

function createTraffic() {

    trafficCars = [];

    for (let i = 0; i < 5; i++) {

        spawnTraffic(
            -500 - Math.random() * 1800
        );

    }
}


function spawnTraffic(yPosition = -200) {

    const colors = [
        "#171b22",
        "#b7bcc2",
        "#8b101c",
        "#173b62",
        "#e2e2e2",
        "#20242b"
    ];

    const lanes = [-0.68, -0.34, 0, 0.34, 0.68];

    const lane =
        lanes[Math.floor(Math.random() * lanes.length)];

    trafficCars.push({

        x: lane,

        y: yPosition,

        width: 48,

        height: 88,

        speed:
            100 +
            Math.random() * 100,

        color:
            colors[Math.floor(Math.random() * colors.length)],

        passed: false
    });
}


/* =========================================================
   STARS
========================================================= */

function createStars() {

    stars = [];

    const count =
        Math.floor(
            (window.innerWidth * window.innerHeight) / 12000
        );

    for (let i = 0; i < count; i++) {

        stars.push({

            x: Math.random() * window.innerWidth,

            y: Math.random() * window.innerHeight * 0.48,

            radius: Math.random() * 1.5,

            alpha: Math.random()
        });
    }
}


/* =========================================================
   INPUT - KEYBOARD
========================================================= */

window.addEventListener("keydown", function (event) {

    if (
        event.key === "ArrowLeft" ||
        event.key.toLowerCase() === "a"
    ) {

        keys.left = true;

    }

    if (
        event.key === "ArrowRight" ||
        event.key.toLowerCase() === "d"
    ) {

        keys.right = true;

    }

    if (
        event.key === "ArrowDown" ||
        event.key.toLowerCase() === "s"
    ) {

        keys.brake = true;
    }

    if (event.code === "Space") {

        event.preventDefault();

        activateNitro(20);
    }

    if (event.key.toLowerCase() === "p") {

        togglePause();
    }

});


window.addEventListener("keyup", function (event) {

    if (
        event.key === "ArrowLeft" ||
        event.key.toLowerCase() === "a"
    ) {

        keys.left = false;
    }

    if (
        event.key === "ArrowRight" ||
        event.key.toLowerCase() === "d"
    ) {

        keys.right = false;
    }

    if (
        event.key === "ArrowDown" ||
        event.key.toLowerCase() === "s"
    ) {

        keys.brake = false;
    }

});


/* =========================================================
   MOBILE BUTTON INPUT
========================================================= */

function setupHoldButton(id, property) {

    const button = document.getElementById(id);

    if (!button) {
        return;
    }

    const start = function (event) {

        event.preventDefault();

        if (property === "left") {
            touchLeft = true;
        }

        if (property === "right") {
            touchRight = true;
        }

        if (property === "brake") {
            touchBrake = true;
        }
    };


    const end = function (event) {

        event.preventDefault();

        if (property === "left") {
            touchLeft = false;
        }

        if (property === "right") {
            touchRight = false;
        }

        if (property === "brake") {
            touchBrake = false;
        }
    };


    button.addEventListener("touchstart", start, {
        passive: false
    });

    button.addEventListener("touchend", end, {
        passive: false
    });

    button.addEventListener("touchcancel", end, {
        passive: false
    });

    button.addEventListener("mousedown", start);

    button.addEventListener("mouseup", end);

    button.addEventListener("mouseleave", end);
}


setupHoldButton("leftButton", "left");
setupHoldButton("rightButton", "right");
setupHoldButton("brakeButton", "brake");


/* =========================================================
   NITRO BUTTONS
========================================================= */

document.querySelectorAll(".boost-button").forEach(function (button) {

    button.addEventListener("click", function () {

        const boostAmount =
            Number(button.dataset.boost);

        activateNitro(boostAmount);
    });

});


function activateNitro(amount) {

    if (!gameRunning || paused) {
        return;
    }

    if (nitro < amount) {
        return;
    }

    nitro -= amount;

    activeBoost = amount;

    if (amount === 20) {

        boostMultiplier = 1.15;

    } else if (amount === 50) {

        boostMultiplier = 1.35;

    } else {

        boostMultiplier = 1.7;
    }

    boostEffect.classList.add("active");

    setTimeout(function () {

        boostEffect.classList.remove("active");

        activeBoost = 0;
        boostMultiplier = 1;

    }, amount === 20 ? 1000 : amount === 50 ? 2000 : 3500);
}


/* =========================================================
   PAUSE
========================================================= */

pauseButton.addEventListener("click", togglePause);


function togglePause() {

    if (!gameRunning) {
        return;
    }

    paused = !paused;

    pauseButton.textContent =
        paused ? "▶" : "II";

    if (!paused) {

        lastTime = performance.now();

        requestAnimationFrame(gameLoop);
    }
}


/* =========================================================
   GAME LOOP
========================================================= */

function gameLoop(timestamp) {

    if (!gameRunning || paused) {
        return;
    }

    let delta =
        (timestamp - lastTime) / 1000;

    lastTime = timestamp;

    /*
       Prevent huge jumps when a tab is switched.
    */

    delta = Math.min(delta, 0.05);

    update(delta);

    draw();

    requestAnimationFrame(gameLoop);
}


/* =========================================================
   UPDATE
========================================================= */

function update(delta) {

    const left =
        keys.left || touchLeft;

    const right =
        keys.right || touchRight;

    const brake =
        keys.brake || touchBrake;


    /* ---------------- STEERING ---------------- */

    let steering = 0;

    if (left) {
        steering -= 1;
    }

    if (right) {
        steering += 1;
    }

    if (
        selectedControl === "tilt" &&
        Math.abs(tiltValue) > 0.08
    ) {

        steering = tiltValue;
    }


    player.x += steering * delta * 0.95;

    player.x =
        Math.max(
            -0.82,
            Math.min(0.82, player.x)
        );


    /* ---------------- SPEED ---------------- */

    const acceleration = 55;

    if (brake) {

        speed -= 130 * delta;

    } else {

        speed += acceleration * delta;
    }


    if (activeBoost > 0) {

        speed += 110 * delta;
    }


    /*
       Natural drag
    */

    speed -= speed * 0.035 * delta;


    speed =
        Math.max(
            0,
            Math.min(maxSpeed * boostMultiplier, speed)
        );


    if (speed > topSpeed) {
        topSpeed = speed;
    }


    /* ---------------- WORLD ---------------- */

    const worldSpeed =
        speed * 1.25;

    roadOffset +=
        worldSpeed * delta;

    distance +=
        speed * delta / 3.6;

    score +=
        Math.floor(speed * delta * 0.6);


    /* ---------------- NITRO RECHARGE ---------------- */

    if (activeBoost === 0) {

        nitro +=
            5 * delta;

        nitro =
            Math.min(100, nitro);
    }


    /* ---------------- TRAFFIC ---------------- */

    spawnTimer += delta;

    if (spawnTimer > 1.2) {

        spawnTimer = 0;

        spawnTraffic(
            -250
        );
    }


    trafficCars.forEach(function (car) {

        car.y +=
            (worldSpeed - car.speed) * delta;

        if (car.y > window.innerHeight + 200) {

            car.y = -300 -
                Math.random() * 700;

            const lanes = [
                -0.68,
                -0.34,
                0,
                0.34,
                0.68
            ];

            car.x =
                lanes[
                    Math.floor(
                        Math.random() * lanes.length
                    )
                ];

            car.passed = false;
        }


        if (
            !car.passed &&
            car.y > window.innerHeight * 0.78
        ) {

            car.passed = true;

            score += 100;
        }

    });


    checkCollisions();


    /* ---------------- PARTICLES ---------------- */

    updateParticles(delta);


    /* ---------------- UI ---------------- */

    speedValue.textContent =
        Math.round(speed);

    distanceValue.textContent =
        Math.floor(distance);

    scoreValue.textContent =
        score;

    nitroPercent.textContent =
        Math.round(nitro) + "%";

    nitroFill.style.width =
        nitro + "%";
}


/* =========================================================
   COLLISION
========================================================= */

function checkCollisions() {

    const playerScreenX =
        window.innerWidth / 2 +
        player.x *
        getRoadWidth() /
        2;

    const playerScreenY =
        window.innerHeight * 0.78;

    for (const car of trafficCars) {

        const carX =
            window.innerWidth / 2 +
            car.x *
            getRoadWidth() /
            2;

        const carY =
            car.y;

        const distanceX =
            Math.abs(
                playerScreenX - carX
            );

        const distanceY =
            Math.abs(
                playerScreenY - carY
            );


        if (
            distanceX <
                (player.width + car.width) / 2 &&
            distanceY <
                (player.height + car.height) / 2
        ) {

            endGame();

            return;
        }
    }
}


/* =========================================================
   ROAD
========================================================= */

function getRoadWidth() {

    return Math.min(
        window.innerWidth * 0.82,
        900
    );
}


function getRoadBounds(y) {

    const horizon =
        window.innerHeight * 0.40;

    const bottom =
        window.innerHeight;

    const progress =
        Math.max(
            0,
            Math.min(
                1,
                (y - horizon) /
                (bottom - horizon)
            )
        );

    const roadWidth =
        getRoadWidth() *
        (0.1 + progress * 0.9);

    const center =
        window.innerWidth / 2;

    return {

        left:
            center - roadWidth / 2,

        right:
            center + roadWidth / 2,

        width:
            roadWidth
    };
}


/* =========================================================
   DRAW EVERYTHING
========================================================= */

function draw() {

    const width = window.innerWidth;
    const height = window.innerHeight;

    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    drawSky();

    drawStars();

    drawMountains();

    drawRoad();

    drawRoadLights();

    drawTraffic();

    drawPlayer();

    drawParticles();
}


/* =========================================================
   SKY
========================================================= */

function drawSky() {

    const width = window.innerWidth;
    const height = window.innerHeight;

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            height
        );

    gradient.addColorStop(
        0,
        "#010208"
    );

    gradient.addColorStop(
        0.42,
        "#0a1424"
    );

    gradient.addColorStop(
        0.7,
        "#182431"
    );

    gradient.addColorStop(
        1,
        "#080a0e"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
        0,
        0,
        width,
        height
    );
}


/* =========================================================
   STARS
========================================================= */

function drawStars() {

    ctx.save();

    stars.forEach(function (star) {

        ctx.globalAlpha =
            0.25 + star.alpha * 0.75;

        ctx.fillStyle = "#ffffff";

        ctx.beginPath();

        ctx.arc(
            star.x,
            star.y,
            star.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });

    ctx.restore();
}


/* =========================================================
   MOUNTAINS
========================================================= */

function drawMountains() {

    const width = window.innerWidth;
    const horizon =
        window.innerHeight * 0.4;

    ctx.fillStyle = "#05080e";

    ctx.beginPath();

    ctx.moveTo(0, horizon);

    for (
        let x = 0;
        x <= width;
        x += 50
    ) {

        const peak =
            horizon -
            Math.abs(
                Math.sin(x * 0.018)
            ) * 80 -
            Math.abs(
                Math.cos(x * 0.04)
            ) * 40;

        ctx.lineTo(
            x,
            peak
        );
    }

    ctx.lineTo(
        width,
        horizon + 100
    );

    ctx.lineTo(
        0,
        horizon + 100
    );

    ctx.closePath();

    ctx.fill();
}


/* =========================================================
   ROAD
========================================================= */

function drawRoad() {

    const width = window.innerWidth;
    const height = window.innerHeight;

    const horizon =
        height * 0.40;

    const bottomBounds =
        getRoadBounds(height);

    const horizonBounds =
        getRoadBounds(horizon);


    /* Road */

    ctx.fillStyle = "#15191f";

    ctx.beginPath();

    ctx.moveTo(
        horizonBounds.left,
        horizon
    );

    ctx.lineTo(
        horizonBounds.right,
        horizon
    );

    ctx.lineTo(
        bottomBounds.right,
        height
    );

    ctx.lineTo(
        bottomBounds.left,
        height
    );

    ctx.closePath();

    ctx.fill();


    /* Left shoulder */

    ctx.fillStyle = "#30343a";

    ctx.beginPath();

    ctx.moveTo(
        horizonBounds.left - 8,
        horizon
    );

    ctx.lineTo(
        horizonBounds.left,
        horizon
    );

    ctx.lineTo(
        bottomBounds.left,
        height
    );

    ctx.lineTo(
        bottomBounds.left - 18,
        height
    );

    ctx.closePath();

    ctx.fill();


    /* Right shoulder */

    ctx.beginPath();

    ctx.moveTo(
        horizonBounds.right,
        horizon
    );

    ctx.lineTo(
        horizonBounds.right + 8,
        horizon
    );

    ctx.lineTo(
        bottomBounds.right + 18,
        height
    );

    ctx.lineTo(
        bottomBounds.right,
        height
    );

    ctx.closePath();

    ctx.fill();


    /* Road texture */

    ctx.save();

    ctx.globalAlpha = 0.15;

    for (
        let y = horizon + 10;
        y < height;
        y += 35
    ) {

        const bounds =
            getRoadBounds(y);

        ctx.strokeStyle = "#7d838b";

        ctx.beginPath();

        ctx.moveTo(
            bounds.left,
            y
        );

        ctx.lineTo(
            bounds.right,
            y
        );

        ctx.stroke();
    }

    ctx.restore();


    /* Lane markers */

    drawLaneMarker(-0.33);
    drawLaneMarker(0.33);
}


function drawLaneMarker(lane) {

    const horizon =
        window.innerHeight * 0.40;

    const height =
        window.innerHeight;

    const dashLength = 55;

    const gap = 75;

    const offset =
        roadOffset %
        (dashLength + gap);


    for (
        let y = horizon + offset;
        y < height;
        y += dashLength + gap
    ) {

        const endY =
            Math.min(
                y + dashLength,
                height
            );

        if (endY <= horizon) {
            continue;
        }

        const start =
            getRoadBounds(y);

        const end =
            getRoadBounds(endY);

        const x1 =
            window.innerWidth / 2 +
            lane *
            start.width /
            2;

        const x2 =
            window.innerWidth / 2 +
            lane *
            end.width /
            2;

        ctx.strokeStyle =
            "rgba(225,230,235,0.75)";

        ctx.lineWidth =
            Math.max(
                1,
                (endY / height) * 7
            );

        ctx.beginPath();

        ctx.moveTo(
            x1,
            y
        );

        ctx.lineTo(
            x2,
            endY
        );

        ctx.stroke();
    }
}


/* =========================================================
   ROAD LIGHTS
========================================================= */

function drawRoadLights() {

    const horizon =
        window.innerHeight * 0.40;

    const height =
        window.innerHeight;

    const spacing = 100;

    const offset =
        roadOffset %
        spacing;

    for (
        let y = horizon + offset;
        y < height;
        y += spacing
    ) {

        const bounds =
            getRoadBounds(y);

        drawLamp(
            bounds.left - 25,
            y
        );

        drawLamp(
            bounds.right + 25,
            y
        );
    }
}


function drawLamp(x, y) {

    const size =
        Math.max(
            2,
            y / window.innerHeight * 7
        );

    ctx.save();

    ctx.shadowBlur = 15;

    ctx.shadowColor = "#ffeaa7";

    ctx.fillStyle = "#fff2b0";

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        size,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
}


/* =========================================================
   TRAFFIC CARS
========================================================= */

function drawTraffic() {

    trafficCars.forEach(function (car) {

        if (
            car.y <
                window.innerHeight * 0.37 ||
            car.y >
                window.innerHeight + 100
        ) {

            return;
        }

        const road =
            getRoadBounds(car.y);

        const x =
            window.innerWidth / 2 +
            car.x *
            road.width /
            2;

        const scale =
            0.35 +
            0.65 *
            Math.max(
                0,
                Math.min(
                    1,
                    (car.y -
                        window.innerHeight * 0.4) /
                    (window.innerHeight * 0.6)
                )
            );

        drawCar(
            x,
            car.y,
            car.width * scale,
            car.height * scale,
            car.color,
            false
        );
    });
}


/* =========================================================
   PLAYER
========================================================= */

function drawPlayer() {

    const x =
        window.innerWidth / 2 +
        player.x *
        getRoadWidth() /
        2;

    const y =
        window.innerHeight * 0.78;

    if (activeBoost > 0) {

        drawNitroFlames(
            x,
            y + player.height / 2
        );
    }

    drawCar(
        x,
        y,
        player.width,
        player.height,
        player.color,
        true
    );
}


/* =========================================================
   CAR DRAWING
========================================================= */

function drawCar(
    x,
    y,
    width,
    height,
    color,
    isPlayer
) {

    ctx.save();

    ctx.translate(
        x,
        y
    );


    /* Shadow */

    ctx.fillStyle =
        "rgba(0,0,0,0.55)";

    ctx.beginPath();

    ctx.ellipse(
        0,
        height * 0.43,
        width * 0.75,
        height * 0.18,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* Main body */

    const bodyGradient =
        ctx.createLinearGradient(
            -width / 2,
            0,
            width / 2,
            0
        );

    bodyGradient.addColorStop(
        0,
        "#080a0d"
    );

    bodyGradient.addColorStop(
        0.2,
        color
    );

    bodyGradient.addColorStop(
        0.5,
        "#e8edf2"
    );

    bodyGradient.addColorStop(
        0.8,
        color
    );

    bodyGradient.addColorStop(
        1,
        "#06080a"
    );

    ctx.fillStyle =
        bodyGradient;

    roundRect(
        ctx,
        -width / 2,
        -height / 2,
        width,
        height,
        width * 0.22
    );

    ctx.fill();


    /* Roof */

    ctx.fillStyle =
        "#101821";

    roundRect(
        ctx,
        -width * 0.34,
        -height * 0.48,
        width * 0.68,
        height * 0.45,
        width * 0.18
    );

    ctx.fill();


    /* Windows */

    ctx.fillStyle =
        "#172f42";

    ctx.beginPath();

    ctx.moveTo(
        -width * 0.27,
        -height * 0.42
    );

    ctx.lineTo(
        width * 0.27,
        -height * 0.42
    );

    ctx.lineTo(
        width * 0.20,
        -height * 0.12
    );

    ctx.lineTo(
        -width * 0.20,
        -height * 0.12
    );

    ctx.closePath();

    ctx.fill();


    /* Window shine */

    ctx.strokeStyle =
        "rgba(180,220,255,0.45)";

    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(
        -width * 0.24,
        -height * 0.39
    );

    ctx.lineTo(
        width * 0.17,
        -height * 0.39
    );

    ctx.stroke();


    /* Wheels */

    drawWheel(
        -width * 0.42,
        height * 0.28,
        width * 0.15
    );

    drawWheel(
        width * 0.42,
        height * 0.28,
        width * 0.15
    );


    /* BMW-inspired grille */

    ctx.fillStyle =
        "#06080a";

    ctx.beginPath();

    ctx.ellipse(
        0,
        -height * 0.39,
        width * 0.13,
        height * 0.11,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.strokeStyle =
        "#555d66";

    ctx.lineWidth = 1;

    ctx.stroke();


    /* Headlights */

    drawHeadlight(
        -width * 0.30,
        -height * 0.39
    );

    drawHeadlight(
        width * 0.30,
        -height * 0.39
    );


    /* Tail lights */

    ctx.fillStyle =
        "#e31531";

    roundRect(
        ctx,
        -width * 0.39,
        height * 0.25,
        width * 0.17,
        height * 0.055,
        3
    );

    ctx.fill();

    roundRect(
        ctx,
        width * 0.22,
        height * 0.25,
        width * 0.17,
        height * 0.055,
        3
    );

    ctx.fill();


    /* Player blue glow */

    if (isPlayer) {

        ctx.save();

        ctx.shadowBlur = 25;

        ctx.shadowColor =
            activeBoost === 100
                ? "#a855f7"
                : activeBoost === 50
                    ? "#ffd21f"
                    : "#148cff";

        ctx.strokeStyle =
            activeBoost === 100
                ? "#a855f7"
                : activeBoost === 50
                    ? "#ffd21f"
                    : "#148cff";

        ctx.lineWidth = 2;

        roundRect(
            ctx,
            -width / 2,
            -height / 2,
            width,
            height,
            width * 0.22
        );

        ctx.stroke();

        ctx.restore();
    }


    ctx.restore();
}


/* =========================================================
   CAR HELPERS
========================================================= */

function drawWheel(x, y, radius) {

    ctx.fillStyle =
        "#050608";

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle =
        "#707984";

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        radius * 0.5,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle =
        "#12161b";

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        radius * 0.23,
        0,
        Math.PI * 2
    );

    ctx.fill();
}


function drawHeadlight(x, y) {

    ctx.save();

    ctx.fillStyle =
        "#eaf8ff";

    ctx.shadowBlur = 15;

    ctx.shadowColor =
        "#6ac7ff";

    ctx.beginPath();

    ctx.ellipse(
        x,
        y,
        5,
        2,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
}


function roundRect(
    context,
    x,
    y,
    width,
    height,
    radius
) {

    const r =
        Math.min(
            radius,
            width / 2,
            height / 2
        );

    context.beginPath();

    context.moveTo(
        x + r,
        y
    );

    context.arcTo(
        x + width,
        y,
        x + width,
        y + height,
        r
    );

    context.arcTo(
        x + width,
        y + height,
        x,
        y + height,
        r
    );

    context.arcTo(
        x,
        y + height,
        x,
        y,
        r
    );

    context.arcTo(
        x,
        y,
        x + width,
        y,
        r
    );

    context.closePath();
}


/* =========================================================
   NITRO FLAMES
========================================================= */

function drawNitroFlames(x, y) {

    const flameColor =
        activeBoost === 100
            ? "#a855f7"
            : activeBoost === 50
                ? "#ffd21f"
                : "#148cff";

    ctx.save();

    for (let i = 0; i < 5; i++) {

        const flameWidth =
            5 + Math.random() * 8;

        const flameLength =
            20 + Math.random() * 35;

        const offset =
            (i - 2) * 8;

        const gradient =
            ctx.createLinearGradient(
                x + offset,
                y,
                x + offset,
                y + flameLength
            );

        gradient.addColorStop(
            0,
            "#ffffff"
        );

        gradient.addColorStop(
            0.3,
            flameColor
        );

        gradient.addColorStop(
            1,
            "transparent"
        );

        ctx.fillStyle =
            gradient;

        ctx.beginPath();

        ctx.moveTo(
            x + offset - flameWidth,
            y
        );

        ctx.lineTo(
            x + offset,
            y + flameLength
        );

        ctx.lineTo(
            x + offset + flameWidth,
            y
        );

        ctx.closePath();

        ctx.fill();
    }

    ctx.restore();
}


/* =========================================================
   PARTICLES
========================================================= */

function createParticle() {

    const x =
        window.innerWidth / 2 +
        player.x *
        getRoadWidth() /
        2;

    particles.push({

        x:
            x +
            (Math.random() - 0.5) * 40,

        y:
            window.innerHeight * 0.82,

        size:
            1 + Math.random() * 4,

        speed:
            100 + Math.random() * 250,

        life:
            0.4 + Math.random() * 0.6
    });
}


function updateParticles(delta) {

    if (speed > 180) {

        createParticle();
    }

    particles.forEach(function (particle) {

        particle.y +=
            particle.speed * delta;

        particle.life -=
            delta;
    });

    particles =
        particles.filter(function (particle) {

            return particle.life > 0;
        });
}


function drawParticles() {

    particles.forEach(function (particle) {

        ctx.save();

        ctx.globalAlpha =
            particle.life;

        ctx.fillStyle =
            "#b7dfff";

        ctx.beginPath();

        ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    });
}


/* =========================================================
   END GAME
========================================================= */

function endGame() {

    gameRunning = false;

    boostEffect.classList.remove("active");

    finalScore.textContent =
        score;

    finalDistance.textContent =
        Math.floor(distance) + " M";

    finalSpeed.textContent =
        Math.round(topSpeed) + " KM/H";

    gameOver.classList.add("active");
}


/* =========================================================
   INITIALIZATION
========================================================= */

resizeCanvas();

createStars();

showScreen(ageScreen);


/* =========================================================
   EXTRA TOUCH PREVENTION
========================================================= */

document.addEventListener(
    "touchmove",
    function (event) {

        if (gameScreen.classList.contains("active")) {

            event.preventDefault();
        }

    },
    {
        passive: false
    }
);