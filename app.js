const menu = {
    overlay: document.getElementById("menuOverlay"),

    show() {
        this.overlay.style.display = "";
        game.stop();
    },

    hide() {
        this.overlay.style.display = "none";
    },

    getMode() {
        return document.querySelector("button.mode.selected").dataset.mode;
    },

    getSettings() {
        return {
            speed: document.getElementById("speedSelect").value,
            count: parseInt(document.getElementById("countSelect").value, 10),
            size: document.getElementById("sizeSelect").value,
            timeLimit: parseInt(document.getElementById("timeSelect").value, 10)
        };
    }
};

function updateSettingsVisibility(mode) {
    const movingModes = ["tracking", "strafe"];

    document.getElementById("speedSetting").style.display = movingModes.includes(mode) ? "flex" : "none";
    document.getElementById("timeSetting").style.display = mode === "timetrial" ? "flex" : "none";
    document.getElementById("countSetting").style.display = mode === "tracking" ? "none" : "flex";
}

document.querySelectorAll("button.mode").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("button.mode").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");

        updateSettingsVisibility(btn.dataset.mode);
    });
});

updateSettingsVisibility("classic");

function textureFor(type) {
    const t = {
        default: "default.webp",
        strafe: "nonStop.webp",
        tracking: "nonStop.webp"
    };

    return "assets/target/" + (t[type] || t.default);
}

const game = {
    score: 0,
    highScore: 0,
    running: false,
    mode: "classic",
    settings: {},
    targets: [],
    timer: null,
    timeLeft: 0,
    trackingScore: 0,
    trackingInterval: null,

    start() {
        this.mode = menu.getMode();
        this.settings = menu.getSettings();
        this.score = 0;
        this.trackingScore = 0;

        menu.hide();
        this.clearTargets();
        document.getElementById("score").textContent = '0';
        document.getElementById("timer").textContent = "";

        this.running = true;

        switch(this.mode) {
            case "timetrial":
                this.timeLeft = this.settings.timeLimit;
                this.startTimer();
                this.spawnTargets(this.settings.count, "default");
                break;
            case "tracking":
                this.spawnTrackingTarget();
                this.startTracking();
                break;
            case "strafe":
                this.spawnStrafingTargets(this.settings.count);
                break;
            default:
                this.spawnTargets(this.settings.count, "default");
        }
    },

    stop() {
        this.running = false;
        this.clearTargets();

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
    },

    addScore(points = 1) {
        this.score += points;

        document.getElementById("score").textContent = this.score;
    },

    over() {
        this.running = false;

        menu.show();
        document.getElementById("gameOver").style.display = "";
        document.getElementById("overScore").textContent = this.score;

        if (this.highScore < this.score) this.highScore = this.score;
        document.getElementById("overHigh").textContent = this.highScore;

        this.clearTargets();

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
    },

    startTimer() {
        const timerDisplay = document.getElementById("timer");

        timerDisplay.textContent = `${this.timeLeft}s`;

        this.timer = setInterval(() => {
            this.timeLeft--;
            timerDisplay.textContent = `${this.timeLeft}s`;

            if (this.timeLeft <= 0) this.over();
        }, 1000);
    },

    clearTargets() {
        this.targets.forEach(t => t.element && t.element.remove());
        this.targets = [];
    },

    getSpeedMultiplier() {
        const speeds = {
            slow: 0.5,
            normal: 1,
            fast: 1.5,
            insane: 2.5
        };

        return speeds[this.settings.speed] || 1;
    },

    getSizeClass() {
        const sizes = {
            small: "40px",
            large: "80px"
        };

        return sizes[this.settings.size] || "60px";
    },

    spawnTargets(count, type = "default") {
        for (let i = 0; i < count; i++) this.createTarget(type);
    },

    createTarget(type = "default") {
        const target = {
            element: document.createElement("img"),
            x: 0,
            y: 0,
            type
        };

        target.element.className = "target";
        target.element.src = textureFor(type);
        target.element.style.width = target.element.style.height = this.getSizeClass();

        this.positionTarget(target);

        if (type !== "tracking") {
            target.element.addEventListener("click", () => this.hitTarget(target));

            target.element.addEventListener("dragstart", (e) => {
                e.preventDefault();
                this.hitTarget(target);
            });

            (function touchHandle(self, t) {
                let handled = false;
                let startX = 0;
                let startY = 0;

                t.element.addEventListener("touchstart", (ev) => {
                    const touch = ev.touches && ev.touches[0];

                    if (touch) {
                        startX = touch.clientX;
                        startY = touch.clientY;
                        handled = false;
                    }
                }, { passive: true });

                t.element.addEventListener("touchmove", (ev) => {
                    const touch = ev.touches && ev.touches[0];
                    if (!touch || handled) return;

                    const dx = touch.clientX - startX;
                    const dy = touch.clientY - startY;

                    if (Math.hypot(dx, dy) > 10) {
                        handled = true;
                        ev.preventDefault();
                        self.hitTarget(t);
                    }
                }, { passive: false });

                t.element.addEventListener("touchend", (ev) => {
                    if (!handled) self.hitTarget(t);
                }, { passive: true });
            })(this, target);
        } else {
            target.element.addEventListener("mouseenter", () => {});
        }

        document.getElementById("game").appendChild(target.element);
        this.targets.push(target);

        return target;
    },

    positionTarget(target) {
        const size = parseInt(this.getSizeClass(), 10);

        target.x = Math.random() * (window.innerWidth - size);
        target.y = Math.random() * (window.innerHeight - size);
        target.element.style.left = `${target.x}px`;
        target.element.style.top = `${target.y}px`;
    },

    hitTarget(target) {
        if (!this.running) return;

        this.addScore();
        target.element.classList.add("hit");

        setTimeout(() => {
            this.positionTarget(target);
            target.element.classList.remove("hit");
        }, 300);
    },

    spawnTrackingTarget() {
        const t = this.createTarget("tracking");
        const base = 1.2 * this.getSpeedMultiplier();

        t.x = window.innerWidth / 2;
        t.y = window.innerHeight / 2;
        t.vx = (Math.random() - 0.5) * base;
        t.vy = (Math.random() - 0.5) * base;
        t.vxTarget = t.vx;
        t.vyTarget = t.vy;
        t.speedFactor = 1;
        t.speedTimer = 0;
        t.nextSpeedEvent = Math.floor(Math.random() * 240 + 120);
        t.nextDirChange = Math.floor(Math.random() * 90 + 60);
        t.element.style.left = `${t.x}px`;
        t.element.style.top = `${t.y}px`;

        this.animateTrackingTarget(t);
    },

    animateTrackingTarget(target) {
        const angDiff = (a, b) => {
            let d = a - b;

            d = (d + Math.PI) % (2 * Math.PI);
            if (d < 0) d += 2 * Math.PI;

            return d - Math.PI;
        };

        if (typeof target.angle === 'undefined') {
            target.angle = Math.atan2(target.vy || .0001, target.vx || .0001);
            target.speed = Math.hypot(target.vx || 0, target.vy || 0) || 0.9;
            target.angleTarget = target.angle;
            target.speedTarget = 1;
        }

        const animate = () => {
            if (!this.running) return;

            if (--target.nextDirChange <= 0) {
                target.angleTarget = Math.random() * Math.PI * 2;
                target.nextDirChange = Math.floor(Math.random() * 180 + 120);
            }

            if (--target.nextSpeedEvent <= 0) { // delayed speed chnges
                target.speedTarget = (Math.random() * 1.2) + .6; // 0.6 .. 1.8
                target.speedTimer = Math.floor(Math.random() * 120 + 60);
                target.nextSpeedEvent = Math.floor(Math.random() * 600 + 300);
            }
            if (target.speedTimer > 0) {
                target.speedTimer--;

                if (target.speedTimer === 0) target.speedTarget = 1;
            }

            const diff = angDiff(target.angleTarget, target.angle); // curves

            target.angle += diff * .04;
            target.speed += (target.speedTarget - target.speed) * .02;
            target.x += Math.cos(target.angle) * target.speed * this.getSpeedMultiplier();
            target.y += Math.sin(target.angle) * target.speed * this.getSpeedMultiplier();

            const size = parseInt(this.getSizeClass(), 10);

            if (target.x <= 0) {
                target.x = 0;
                target.angle = Math.PI - target.angle;
                target.speed *= 0.7;
            } else if (target.x >= window.innerWidth - size) {
                target.x = window.innerWidth - size;
                target.angle = Math.PI - target.angle;
                target.speed *= 0.7;
            }

            if (target.y <= 0) {
                target.y = 0;
                target.angle = -target.angle;
                target.speed *= 0.7;
            } else if (target.y >= window.innerHeight - size) {
                target.y = window.innerHeight - size;
                target.angle = -target.angle;
                target.speed *= 0.7;
            }

            if (target.angle > Math.PI || target.angle < -Math.PI) target.angle = ((target.angle + Math.PI) % (2 * Math.PI)) - Math.PI; // normalize

            target.element.style.left = `${target.x}px`;
            target.element.style.top = `${target.y}px`;

            requestAnimationFrame(animate);
        };

        animate();
    },

    startTracking() {
        const target = this.targets[0];
        if (!target) return;

        let isHovering = false;

        target.element.addEventListener("mouseenter", () => isHovering = true);
        target.element.addEventListener("mouseleave", () => isHovering = false);

        this.trackingInterval = setInterval(() => {
            if (isHovering) {
                this.trackingScore++;
                this.addScore(1);
            }
        }, 100);
    },

    spawnStrafingTargets(count) {
        for (let i = 0; i < count; i++) this.createStrafingTarget();
    },

    createStrafingTarget() {
        const t = this.createTarget("strafe");
        const movementModes = ["horizontal", "vertical", "diagonal"];

        t.movementMode = movementModes[Math.floor(Math.random() * movementModes.length)];

        const baseSpeed = 1.0 * this.getSpeedMultiplier();

        t.vx = 0;
        t.vy = 0;
        t.vxTarget = 0;
        t.vyTarget = 0;

        const setTargetForMode = (mode) => {
            switch (mode) {
                case "horizontal":
                    t.vxTarget = (Math.random() > 0.5 ? 1 : -1) * baseSpeed * (Math.random() * 0.8 + 0.6);
                    t.vyTarget = 0;
                    break;
                case "vertical":
                    t.vxTarget = 0;
                    t.vyTarget = (Math.random() > 0.5 ? 1 : -1) * baseSpeed * (Math.random() * 0.8 + 0.6);
                    break;
                default: // diagonal
                    const ang = Math.random() * Math.PI * 2;

                    t.vxTarget = Math.cos(ang) * baseSpeed * (Math.random() * 0.8 + 0.6);
                    t.vyTarget = Math.sin(ang) * baseSpeed * (Math.random() * 0.8 + 0.6);
            }
        };

        setTargetForMode(t.movementMode);

        t.strafeTimer = 0;
        t.nextChangeTime = Math.floor(Math.random() * 120 + 60);
        t.nextMovementChange = Math.floor(Math.random() * 180 + 90);

        this.animateStrafeTarget(t);
    },

    animateStrafeTarget(target) {
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const animate = () => {
            if (!this.running) return;

            target.strafeTimer++;

            if (Math.random() < .005) {
                target.vxTarget = -target.vxTarget;
                target.vyTarget = -target.vyTarget;
            }

            target.vx += (target.vxTarget - target.vx) * .06;
            target.vy += (target.vyTarget - target.vy) * .06;

            const maxSpeed = 1.4 * this.getSpeedMultiplier();

            target.vx = clamp(target.vx, -maxSpeed, maxSpeed);
            target.vy = clamp(target.vy, -maxSpeed, maxSpeed);

            if (target.strafeTimer > target.nextChangeTime) {
                const tweak = (Math.random() * .3) + .9; // 0.9 .. 1.2

                target.vxTarget = clamp(target.vxTarget * tweak, -maxSpeed, maxSpeed);
                target.vyTarget = clamp(target.vyTarget * tweak, -maxSpeed, maxSpeed);
                target.nextChangeTime = Math.floor(Math.random() * 180 + 90);
            }

            if (target.strafeTimer > target.nextMovementChange) {
                const modes = ["horizontal", "vertical", "diagonal"];
                target.movementMode = modes[Math.floor(Math.random() * modes.length)];

                const base = 0.9 * this.getSpeedMultiplier();

                if (target.movementMode === "horizontal") {
                    target.vxTarget = (Math.random() > 0.5 ? 1 : -1) * base * (Math.random() * 0.4 + 0.8);
                    target.vyTarget = 0;
                } else if (target.movementMode === "vertical") {
                    target.vxTarget = 0;
                    target.vyTarget = (Math.random() > 0.5 ? 1 : -1) * base * (Math.random() * 0.4 + 0.8);
                } else {
                    const ang = Math.random() * Math.PI * 2;
                    const scale = base * (Math.random() * 0.4 + 0.8);

                    target.vxTarget = Math.cos(ang) * scale;
                    target.vyTarget = Math.sin(ang) * scale;
                }

                target.strafeTimer = 0;
                target.nextMovementChange = Math.floor(Math.random() * 220 + 140);
            }

            target.x += target.vx;
            target.y += target.vy;

            const size = parseInt(this.getSizeClass(), 10);

            if (target.x <= 0) {
                target.x = 0;
                target.vx = Math.abs(target.vx) * .6;
                target.vxTarget = Math.abs(target.vxTarget) * .6;
            } else if (target.x >= window.innerWidth - size) {
                target.x = window.innerWidth - size;
                target.vx = -Math.abs(target.vx) * .6;
                target.vxTarget = -Math.abs(target.vxTarget) * .6;
            }

            if (target.y <= 0) {
                target.y = 0;
                target.vy = Math.abs(target.vy) * .6;
                target.vyTarget = Math.abs(target.vyTarget) * .6;
            } else if (target.y >= window.innerHeight - size) {
                target.y = window.innerHeight - size;
                target.vy = -Math.abs(target.vy) * .6;
                target.vyTarget = -Math.abs(target.vyTarget) * .6;
            }

            target.element.style.left = `${target.x}px`;
            target.element.style.top = `${target.y}px`;

            requestAnimationFrame(animate);
        };
        animate();
    }
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && game && game.running) {
        e.preventDefault();
        game.over();
    }
});

function setupMobileEsc() {
    const back = document.getElementById("noKeyEsc");
    const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

    if (isTouch) {
        back.style.display = "";
        back.setAttribute("aria-hidden", "false");
    }
}

window.menu = menu;
window.game = game;

document.getElementById("start").style.display = "";

setupMobileEsc();