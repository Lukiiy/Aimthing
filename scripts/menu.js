const menu = {
    get overlay() {
        return document.getElementById("menuOverlay");
    },

    show() {
        const overlay = this.overlay;
        if (!overlay) return;

        overlay.style.display = "";
        document.getElementById("gameOver").style.display = "none";
    },

    hide() {
        this.overlay.style.display = "none";
    },

    getMode() {
        return document.querySelector("button.mode.selected")?.dataset?.mode || "classic";
    },

    getSettings() {
        const timeSelect = document.getElementById("timeSelect");
        const countSelect = document.getElementById("countSelect");
        let timeLimit = null;
        let count = null;

        if (timeSelect.value === "custom") timeLimit = Math.max(1, parseInt(document.getElementById("timerInput").value, 10) || 0);
        else timeLimit = parseInt(timeSelect.value, 10);

        if (countSelect.value === "custom") count = Math.max(1, parseInt(document.getElementById("countInput").value, 10) || 0);
        else count = parseInt(countSelect.value, 10);

        return {
            speed: document.getElementById("speedSelect").value,
            count,
            size: document.getElementById("sizeSelect").value,
            timeLimit
        };
    }
};

document.querySelectorAll("button.mode").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("button.mode").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");

        window.dispatchEvent(new CustomEvent("modechange", {
            detail: { mode: btn.dataset.mode }
        }));
    });
});

function setupInputs() {
    const reloadTime = () => {
        timerInput.style.display = timeSelect.value === "custom" ? "" : "none";
    };

    const reloadCount = () => {
        countInput.style.display = countSelect.value === "custom" ? "" : "none";
    };

    timeSelect.addEventListener("change", reloadTime);
    countSelect.addEventListener("change", reloadCount);

    reloadTime();
    reloadCount();
}

function updateSettingsVisibility(mode) {
    const moving = ["tracking", "strafe"];

    document.getElementById("speedSetting").style.display = moving.includes(mode) ? "flex" : "none";
    document.getElementById("countSetting").style.display = mode === "tracking" ? "none" : "flex";
}

window.addEventListener("modechange", e => {
    updateSettingsVisibility(e.detail.mode);
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape" && window.game?.running) {
        e.preventDefault();
        window.game.stop("Ended!");
    }
});

function setupMobileESC() {
    const back = document.getElementById("noKeyEsc");
    if (!back) return;

    if ("ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)) {
        back.style.display = "";
        back.setAttribute("aria-hidden", "false");
    }
}

document.getElementById("start").style.display = "";
updateSettingsVisibility(menu.getMode());
setupMobileESC();
setupInputs();
menu.show();

window.menu = menu;