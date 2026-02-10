function getTexture(type) {
    const defined = {
        default: "default.webp",
        strafe: "nonStop.webp",
        tracking: "nonStop.webp"
    };

    return "assets/target/" + (defined[type] || defined.default);
}

function touchHandle(self, target) {
    const obj = target.element;
    let handled = false;
    let startX = 0;
    let startY = 0;

    obj.addEventListener("touchstart", e => {
        const touch = e.touches && e.touches[0];

        if (touch) {
            startX = touch.clientX;
            startY = touch.clientY;
            handled = false;
        }
    }, { passive: true });

    obj.addEventListener("touchmove", e => {
        const touch = e.touches && e.touches[0];
        if (!touch || handled) return;

        const dX = touch.clientX - startX;
        const dY = touch.clientY - startY;

        if (Math.hypot(dX, dY) > 10) {
            handled = true;

            e.preventDefault();
            self.hitTarget(target);
        }
    }, { passive: false });

    obj.addEventListener("touchend", () => {
        if (!handled) self.hitTarget(target);
    }, { passive: true });
}

const TRACKING = {
    BASE_MULT: 1.2,
    TURN_LERP: 0.04,
    SPEED_LERP: 0.02,
    DIR_CHANGE_MIN: 120, // min frames to change dir
    DIR_CHANGE_MAX: 300, // max frames to change dir
    SPEED_EVENT_MIN: 300,
    SPEED_EVENT_MAX: 900,
    SPEED_TIMER_MIN: 60,
    SPEED_TIMER_MAX: 180,
    BARRIER_PUSH: 6,
    BORDER_ANGLE_RANGE: Math.PI / 6,
    BOUNCE_DAMP: 0.6
};

const STRAFE = {
    SIGN_FLIP_CHANCE: 0.005,
    VEL_LERP: 0.06,
    MAX_SPEED_MULT: 1.4,
    TWEAK_MIN: 0.9,
    TWEAK_MAX: 1.2,
    CHANGE_MIN: 90,
    CHANGE_MAX: 180,
    MOVE_CHANGE_MIN: 140,
    MOVE_CHANGE_MAX: 380,
    BOUNCE_DAMP: 0.6
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const randomRange = (min, max) => Math.floor(Math.random() * (max - min) + min);

function normalizeAngle(angle) {
    if (angle > Math.PI || angle < -Math.PI) return ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;

    return angle;
}

const reflectedAngleHorizontally = (angle) => Math.PI - angle;
const reflectedAngleVertically = (angle) => -angle;

const angleDiff = (a, b) => {
    let diff = a - b;

    diff = (diff + Math.PI) % (2 * Math.PI);
    if (diff < 0) diff += 2 * Math.PI;

    return diff - Math.PI;
};

/**
 * Reflects an angle-based target off bounds
 * @param target Target instance
 * @returns True if a border has been hit, false otherwise.
 */
function handleAngleBounds(target) {
    const size = parseInt(window.game.getSizeClass(), 10);
    const maxX = window.innerWidth - size;
    const maxY = window.innerHeight - size;
    let hit = false;
    let newAngle = target.angle;

    if (target.x <= 0 || target.x >= maxX) {
        target.x = target.x <= 0 ? 0 : maxX;
        newAngle = reflectedAngleHorizontally(newAngle);
        hit = true;
    }

    if (target.y <= 0 || target.y >= maxY) {
        target.y = target.y <= 0 ? 0 : maxY;
        newAngle = reflectedAngleVertically(newAngle);
        hit = true;
    }

    if (hit) {
        target.angle = normalizeAngle(newAngle);
        target.speed *= TRACKING.BOUNCE_DAMP;
    }

    return hit;
}

/**
 * Reflects a velocity-based target off bounds
 * @param target Target instance
 */
function handleVectorBounds(target) {
    const size = parseInt(window.game.getSizeClass(), 10);
    const maxX = window.innerWidth - size;
    const maxY = window.innerHeight - size;
    const d = STRAFE.BOUNCE_DAMP;

    if (target.x <= 0 || target.x >= maxX) {
        const dir = target.x <= 0 ? 1 : -1;

        target.x = target.x <= 0 ? 0 : maxX;
        target.vx = dir * Math.abs(target.vx) * d;
        target.vxTarget = dir * Math.abs(target.vxTarget) * d;
    }

    if (target.y <= 0 || target.y >= maxY) {
        const dir = target.y <= 0 ? 1 : -1;

        target.y = target.y <= 0 ? 0 : maxY;
        target.vy = dir * Math.abs(target.vy) * d;
        target.vyTarget = dir * Math.abs(target.vyTarget) * d;
    }
}

class Target {
    constructor(type = "default") {
        this.type = type;
        this.element = document.createElement("img");
        this.element.classList.add("target");
        this.element.src = getTexture(type);
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
    }

    applySize(size) {
        this.element.style.width = this.element.style.height = size;
    }

    teleportRandom() {
        const size = parseInt(window.game.getSizeClass(), 10);

        this.x = Math.random() * (window.innerWidth - size);
        this.y = Math.random() * (window.innerHeight - size);
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }

    addHandlers(game) {
        this.element.addEventListener("click", () => game.hitTarget(this));
        this.element.addEventListener("dragstart", e => {
            e.preventDefault();
            game.hitTarget(this);
        });

        touchHandle(game, this);
    }

    remove() {
        this.element.remove();
    }

    hit() {
        this.element.classList.add("hit");

        setTimeout(() => {
            this.teleportRandom();
            this.element.classList.remove("hit");
        }, 300);
    }

    tick() {}
}

class TrackingTarget extends Target {
    constructor() {
        super("tracking");

        this.angle = 0;
        this.angleTarget = 0;
        this.speed = 1;
        this.speedTarget = 1;
        this.nextDirChange = 0;
        this.nextSpeedEvent = 0;
        this.speedTimer = 0;

        const base = TRACKING.BASE_MULT * window.game.getSpeedMultiplier();

        this.vx = (Math.random() - 0.5) * base;
        this.vy = (Math.random() - 0.5) * base;
        this.angle = Math.atan2(this.vy || 0.0001, this.vx || 0.0001);
        this.angleTarget = this.angle;

        this.speed = Math.hypot(this.vx, this.vy) || 0.9;
        this.speedTarget = 1;
        this.speedTimer = 0;

        this.avoidAngle = null;
        this.avoidNextTurn = false;
    }

    init() {
        const base = TRACKING.BASE_MULT * window.game.getSpeedMultiplier();

        this.vx = (Math.random() - .5) * base;
        this.vy = (Math.random() - .5) * base;
        this.angle = Math.atan2(this.vy || 0.0001, this.vx || 0.0001);
        this.angleTarget = this.angle;
        this.speed = Math.hypot(this.vx, this.vy) || 0.9;
        this.speedTarget = 1;
        this.speedTimer = 0;

        this.nextDirChange = Math.floor(Math.random() * (TRACKING.DIR_CHANGE_MAX - TRACKING.DIR_CHANGE_MIN) + TRACKING.DIR_CHANGE_MIN);
        this.nextSpeedEvent = Math.floor(Math.random() * (TRACKING.SPEED_EVENT_MAX - TRACKING.SPEED_EVENT_MIN) + TRACKING.SPEED_EVENT_MIN);

        this.avoidAngle = null;
        this.avoidNextTurn = false;
    }

    addHandlers(game) {
        let hover = false;

        this.element.addEventListener("mouseenter", () => hover = true);
        this.element.addEventListener("mouseleave", () => hover = false);
        this.trackingInterval = setInterval(() => {
            if (hover) {
                game.trackingScore++;
                game.addScore(1);
            }
        }, 100);
    }

    remove() {
        clearInterval(this.trackingInterval);

        super.remove();
    }

    tick() {
        if (--this.nextDirChange <= 0) {
            let candidate;
            let attempts = 0;

            do {
                candidate = Math.random() * Math.PI * 2;
                attempts++;

                if (!this.avoidNextTurn || !this.avoidAngle) break;
                if (Math.abs(((candidate - this.avoidAngle.center + Math.PI) % (2 * Math.PI)) - Math.PI) > this.avoidAngle.range) break;
            } while (attempts < 12);

            this.angleTarget = candidate;
            this.nextDirChange = Math.floor(Math.random() * (TRACKING.DIR_CHANGE_MAX - TRACKING.DIR_CHANGE_MIN) + TRACKING.DIR_CHANGE_MIN);
            this.avoidNextTurn = false;
            this.avoidAngle = null;
        }

        if (--this.nextSpeedEvent <= 0) {
            this.speedTarget = (Math.random() * 1.2) + 0.6;
            this.speedTimer = Math.floor(Math.random() * (TRACKING.SPEED_TIMER_MAX - TRACKING.SPEED_TIMER_MIN) + TRACKING.SPEED_TIMER_MIN);
            this.nextSpeedEvent = Math.floor(Math.random() * (TRACKING.SPEED_EVENT_MAX - TRACKING.SPEED_EVENT_MIN) + TRACKING.SPEED_EVENT_MIN);
        }

        if (this.speedTimer > 0) {
            this.speedTimer--;

            if (this.speedTimer === 0) this.speedTarget = 1;
        }

        this.angle += angleDiff(this.angleTarget, this.angle) * TRACKING.TURN_LERP;
        this.speed += (this.speedTarget - this.speed) * TRACKING.SPEED_LERP;
        this.x += Math.cos(this.angle) * this.speed * window.game.getSpeedMultiplier();
        this.y += Math.sin(this.angle) * this.speed * window.game.getSpeedMultiplier();

        if (handleAngleBounds(this)) {
            this.angleTarget = this.angle;
            this.avoidAngle = {
                center: normalizeAngle(this.angle + Math.PI),
                range: TRACKING.BORDER_ANGLE_RANGE
            };
            this.avoidNextTurn = true;
            this.nextDirChange = Math.floor(Math.random() * (TRACKING.DIR_CHANGE_MAX - TRACKING.DIR_CHANGE_MIN) + TRACKING.DIR_CHANGE_MIN);
            this.x += Math.cos(this.angle) * TRACKING.BARRIER_PUSH;
            this.y += Math.sin(this.angle) * TRACKING.BARRIER_PUSH;
        }


        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }
}

class StrafeTarget extends Target {
    constructor() {
        super("strafe");

        this.vx = 0;
        this.vy = 0;
        this.vxTarget = 0;
        this.vyTarget = 0;
        this.strafeTimer = 0;
        this.nextChangeTime = 0;
        this.nextMovementChange = 0;
        this.movementMode = "horizontal";

        const moveModes = ["horizontal", "vertical", "diagonal"];
        this.movementMode = moveModes[Math.floor(Math.random() * moveModes.length)];

        const base = .9 * window.game.getSpeedMultiplier();

        if (this.movementMode === "horizontal") {
            this.vxTarget = (Math.random() > .5 ? 1 : -1) * base * (Math.random() * .4 + .8);
            this.vyTarget = 0;
        } else if (this.movementMode === "vertical") {
            this.vxTarget = 0;
            this.vyTarget = (Math.random() > .5 ? 1 : -1) * base * (Math.random() * .4 + .8);
        } else {
            const ang = Math.random() * Math.PI * 2;
            const scale = base * (Math.random() * .4 + .8);

            this.vxTarget = Math.cos(ang) * scale;
            this.vyTarget = Math.sin(ang) * scale;
        }

        this.strafeTimer = 0;
        this.nextChangeTime = Math.floor(Math.random() * 120 + 60);
        this.nextMovementChange = Math.floor(Math.random() * 220 + 140);
    }

    init() {
        const moveModes = ["horizontal", "vertical", "diagonal"];
        this.movementMode = moveModes[Math.floor(Math.random() * moveModes.length)];

        const base = .9 * window.game.getSpeedMultiplier();

        if (this.movementMode === "horizontal") {
            this.vxTarget = (Math.random() > .5 ? 1 : -1) * base * (Math.random() * .4 + .8);
            this.vyTarget = 0;
        } else if (this.movementMode === "vertical") {
            this.vxTarget = 0;
            this.vyTarget = (Math.random() > .5 ? 1 : -1) * base * (Math.random() * .4 + .8);
        } else {
            const ang = Math.random() * Math.PI * 2;
            const scale = base * (Math.random() * .4 + .8);

            this.vxTarget = Math.cos(ang) * scale;
            this.vyTarget = Math.sin(ang) * scale;
        }

        this.strafeTimer = 0;
        this.nextChangeTime = Math.floor(Math.random() * 120 + 60);
        this.nextMovementChange = Math.floor(Math.random() * 220 + 140);
    }

    tick() {
        this.strafeTimer++;

        if (Math.random() < STRAFE.SIGN_FLIP_CHANCE) {
            this.vxTarget = -this.vxTarget;
            this.vyTarget = -this.vyTarget;
        }

        this.vx += (this.vxTarget - this.vx) * STRAFE.VEL_LERP;
        this.vy += (this.vyTarget - this.vy) * STRAFE.VEL_LERP;

        const maxSpeed = STRAFE.MAX_SPEED_MULT * window.game.getSpeedMultiplier();

        this.vx = clamp(this.vx, -maxSpeed, maxSpeed);
        this.vy = clamp(this.vy, -maxSpeed, maxSpeed);

        if (this.strafeTimer > this.nextChangeTime) {
            const tweak = Math.random() * (STRAFE.TWEAK_MAX - STRAFE.TWEAK_MIN) + STRAFE.TWEAK_MIN;

            this.vxTarget = clamp(this.vxTarget * tweak, -maxSpeed, maxSpeed);
            this.vyTarget = clamp(this.vyTarget * tweak, -maxSpeed, maxSpeed);
            this.nextChangeTime = Math.floor(Math.random() * (STRAFE.CHANGE_MAX - STRAFE.CHANGE_MIN) + STRAFE.CHANGE_MIN);
        }

        if (this.strafeTimer > this.nextMovementChange) {
            const modes = ["horizontal", "vertical", "diagonal"];
            this.movementMode = modes[Math.floor(Math.random() * modes.length)];

            const base = 0.9 * window.game.getSpeedMultiplier();

            if (this.movementMode === "horizontal") {
                this.vxTarget = (Math.random() > .5 ? 1 : -1) * base * (Math.random() * .4 + .8);
                this.vyTarget = 0;
            } else if (this.movementMode === "vertical") {
                this.vxTarget = 0;
                this.vyTarget = (Math.random() > .5 ? 1 : -1) * base * (Math.random() * .4 + .8);
            } else {
                const ang = Math.random() * Math.PI * 2;
                const scale = base * (Math.random() * 0.4 + 0.8);

                this.vxTarget = Math.cos(ang) * scale;
                this.vyTarget = Math.sin(ang) * scale;
            }

            this.strafeTimer = 0;
            this.nextMovementChange = Math.floor(Math.random() * (STRAFE.MOVE_CHANGE_MAX - STRAFE.MOVE_CHANGE_MIN) + STRAFE.MOVE_CHANGE_MIN);
        }

        this.x += this.vx;
        this.y += this.vy;

        handleVectorBounds(this);

        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }
}

window.Targets = {
    create(type = "default") {
        let t = new Target(type);
        const game = window.game;

        if (type === "tracking") t = new TrackingTarget();
        if (type === "strafe") t = new StrafeTarget();

        t.addHandlers(game);
        t.applySize(game.getSizeClass());
        t.teleportRandom();
        document.getElementById("game").appendChild(t.element);
        game.targets.push(t);

        return t;
    },

    clearAll() {
        window.game.targets.forEach(t => t && t.remove());
        window.game.targets = [];
    },

    loopAll(method, ...args) {
        window.game.targets.forEach(t => {
            if (t && typeof t[method] === "function") t[method](...args);
        });
    }
}