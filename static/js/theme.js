// 主题切换
const Theme = {
    _initialized: false,

    init() {
        if (this._initialized) return;
        this._initialized = true;

        // 读取本地存储的主题偏好
        const saved = localStorage.getItem("theme");
        if (saved === "dark") {
            this.setDark(false);
        } else {
            this.setLight(false);
        }

        // 绑定切换按钮
        document.getElementById("btn-theme").addEventListener("click", () => this.toggle());
    },

    toggle() {
        if (document.documentElement.getAttribute("data-theme") === "dark") {
            this.setLight(true);
        } else {
            this.setDark(true);
        }
    },

    setDark(animate) {
        document.documentElement.setAttribute("data-theme", "dark");
        document.getElementById("btn-theme").textContent = "☀️";
        localStorage.setItem("theme", "dark");
    },

    setLight(animate) {
        document.documentElement.removeAttribute("data-theme");
        document.getElementById("btn-theme").textContent = "🌙";
        localStorage.setItem("theme", "light");
    },
};

// 挂载到 window，供 auth.js 调用
window.Theme = Theme;
