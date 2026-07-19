// 实时时钟
const ClockApp = {
    _timer: null,

    start() {
        if (this._timer) return;
        const update = () => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const day = String(now.getDate()).padStart(2, "0");
            const hours = String(now.getHours()).padStart(2, "0");
            const minutes = String(now.getMinutes()).padStart(2, "0");
            const seconds = String(now.getSeconds()).padStart(2, "0");
            document.getElementById("clock").textContent = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };
        update();
        this._timer = setInterval(update, 1000);
    },

    stop() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
    },
};

window.clockApp = ClockApp;
ClockApp.start();
