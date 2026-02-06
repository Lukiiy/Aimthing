function formatPlaytime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

class Game {
    constructor() {
        this.score = 0;
        this.highScore = 0;
        this.running = false;
        this.mode = "classic";
        this.settings = {};
        this.targets = [];
        this.timer = null;
        this.timeLeft = 0;
        this.trackingScore = 0;
        this.trackingInterval = null;
        this.startTime = 0;
    }

    start() {
        this.mode = menu.getMode();
        this.settings = menu.getSettings();
        this.score = 0;
        this.trackingScore = 0;
        this.startTime = performance.now();

        menu.hide();
        Targets.clearAll();
        document.getElementById("score").textContent = '0';
        document.getElementById("timer").textContent = "";

        this.running = true;

        switch (this.mode) {
            case "timetrial":
                this.spawnTargets(this.settings.count, "default");
                break;
            case "tracking": // TODO - proper mobile support
                Targets.create("tracking");
                break;
            case "strafe":
                this.spawnStrafingTargets(this.settings.count);
                break;
            default:
                this.spawnTargets(this.settings.count, "default");
        }

        if (this.settings.timeLimit > 0) {
            this.timeLeft = this.settings.timeLimit;

            const timerDisplay = document.getElementById("timer");

            timerDisplay.textContent = `${this.timeLeft}s`;
            this.timer = setInterval(() => {
                this.timeLeft--;
                timerDisplay.textContent = `${this.timeLeft}s`;

                if (this.timeLeft <= 0) {
                    this.stop("Time's up!");
                    timerDisplay.textContent = "";
                }
            }, 1000);
        }
    }

    stop(overReason = "Over!") {
        this.running = false;
        menu.show();

        document.getElementById("gameOver").style.display = "";
        document.getElementById("overTitle").textContent = overReason;
        document.getElementById("overScore").textContent = this.score;
        if (this.highScore < this.score) this.highScore = this.score;

        document.getElementById("overHigh").textContent = this.highScore;
        document.getElementById("duration").textContent = formatPlaytime(Math.floor((performance.now() - this.startTime) / 1000));
        Targets.clearAll();

        if (this.timer) {
            clearInterval(this.timer);

            this.timer = null;
        }

        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);

            this.trackingInterval = null;
        }
    }

    addScore(points = 1) {
        this.score += points;
        document.getElementById("score").textContent = this.score;
    }

    hitTarget(target) {
        if (!this.running) return;

        this.addScore();
        target.hit();
    }

    getSpeedMultiplier() {
        const speeds = {
            slow: 0.5,
            normal: 1,
            fast: 1.5,
            insane: 2.5
        };

        return speeds[this.settings.speed] || 1;
    }

    getSizeClass() {
        const sizes = {
            small: "40px",
            large: "80px"
        };

        return sizes[this.settings.size] || "60px";
    }

    spawnTargets(count, type = "default") {
        for (let i = 0; i < count; i++) Targets.create(type);
    }

    spawnStrafingTargets(count) {
        for (let i = 0; i < count; i++) Targets.create("strafe");
    }
}

window.game = new Game();