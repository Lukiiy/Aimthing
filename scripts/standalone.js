// this file is intended to patch/do stuff for the standalone versions! :3

(() => {
    if (!("__TAURI__" in window)) return; // Only do anything when running inside Tauri.

    const tauriInvoke = window.__TAURI__.core.invoke;

    document.addEventListener("click", async (e) => {
        const a = e.target.closest("a");
        if (!a) return;

        const href = a.href;

        if (a.origin === location.origin) return; // ignore same origin
        e.preventDefault();

        await tauriInvoke("open_external", {
            url: href
        });
    });
})();