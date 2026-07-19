/**
 * 认证模块 —— 注册、登录、Token 管理
 */
const Auth = {
    /**
     * 初始化认证页面事件
     */
    init() {
        // 检查是否已登录
        if (this.isLoggedIn()) {
            this.showTodoSection();
            return;
        }

        this.showAuthSection();
        this.bindEvents();
    },

    /**
     * 绑定认证表单事件
     */
    bindEvents() {
        // 登录/注册标签切换
        document.getElementById("tab-login").addEventListener("click", () => this.switchTab("login"));
        document.getElementById("tab-register").addEventListener("click", () => this.switchTab("register"));

        // 登录表单提交
        document.getElementById("login-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // 注册表单提交
        document.getElementById("register-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleRegister();
        });
    },

    /**
     * 切换登录/注册标签
     */
    switchTab(tab) {
        const loginForm = document.getElementById("login-form");
        const registerForm = document.getElementById("register-form");
        const tabLogin = document.getElementById("tab-login");
        const tabRegister = document.getElementById("tab-register");

        if (tab === "login") {
            loginForm.classList.remove("hidden");
            registerForm.classList.add("hidden");
            tabLogin.classList.add("active");
            tabRegister.classList.remove("active");
        } else {
            loginForm.classList.add("hidden");
            registerForm.classList.remove("hidden");
            tabLogin.classList.remove("active");
            tabRegister.classList.add("active");
        }

        // 清除错误提示
        document.getElementById("login-error").textContent = "";
        document.getElementById("register-error").textContent = "";
        document.getElementById("register-success").textContent = "";
    },

    /**
     * 处理登录
     */
    async handleLogin() {
        const username = document.getElementById("login-username").value.trim();
        const password = document.getElementById("login-password").value;
        const errorEl = document.getElementById("login-error");

        if (!username || !password) {
            errorEl.textContent = "请填写用户名和密码";
            return;
        }

        try {
            const result = await api.login(username, password);
            if (result.access_token) {
                this.setToken(result.access_token, username);
                this.showTodoSection();
            } else {
                errorEl.textContent = result.message || "登录失败";
            }
        } catch (err) {
            errorEl.textContent = "网络错误，请稍后重试";
        }
    },

    /**
     * 处理注册
     */
    async handleRegister() {
        const username = document.getElementById("reg-username").value.trim();
        const password = document.getElementById("reg-password").value;
        const errorEl = document.getElementById("register-error");
        const successEl = document.getElementById("register-success");

        errorEl.textContent = "";
        successEl.textContent = "";

        if (!username || !password) {
            errorEl.textContent = "请填写用户名和密码";
            return;
        }

        if (password.length < 4) {
            errorEl.textContent = "密码至少需要 4 个字符";
            return;
        }

        try {
            const result = await api.register(username, password);
            if (result.id) {
                successEl.textContent = "注册成功！正在跳转到登录...";
                document.getElementById("reg-username").value = "";
                document.getElementById("reg-password").value = "";
                setTimeout(() => this.switchTab("login"), 1200);
            } else {
                errorEl.textContent = result.message || "注册失败";
            }
        } catch (err) {
            errorEl.textContent = "网络错误，请稍后重试";
        }
    },

    /**
     * 保存 Token
     */
    setToken(token, username) {
        localStorage.setItem("access_token", token);
        localStorage.setItem("username", username);
    },

    /**
     * 绑定文件上传事件
     */
    bindAvatarUpload() {
        const input = document.getElementById("avatar-upload");
        input.onchange = () => {
            this.handleAvatarUpload(input.files[0]);
            input.value = "";
        };
    },

    /**
     * 检查是否已登录
     */
    isLoggedIn() {
        return !!localStorage.getItem("access_token");
    },

    /**
     * 退出登录
     */
    logout() {
        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
        // 停止时钟更新
        if (window.clockApp) {
            window.clockApp.stop();
        }
        this.showAuthSection();
    },

    /**
     * 显示认证页面
     */
    showAuthSection() {
        document.getElementById("auth-section").classList.remove("hidden");
        document.getElementById("todo-section").classList.add("hidden");
    },

    /**
     * 显示 Todo 页面
     */
    showTodoSection() {
        document.getElementById("auth-section").classList.add("hidden");
        document.getElementById("todo-section").classList.remove("hidden");

        // 设置用户名
        const username = localStorage.getItem("username") || "用户";
        document.getElementById("current-username").textContent = username;

        // 绑定退出登录（仅一次）
        const btnLogout = document.getElementById("btn-logout");
        btnLogout.onclick = () => this.logout();

        // 启动 Todo 应用
        if (window.TodoApp) {
            window.TodoApp.init();
        }

        // 启动时钟
        if (window.clockApp) {
            window.clockApp.start();
        }

        // 初始化主题
        if (window.Theme) {
            window.Theme.init();
        }

        // 加载名人名言
        if (window.Quote) {
            window.Quote.init();
        }

        // 加载头像
        this.loadAvatar();
        this.bindAvatarUpload();
    },

    /**
     * 加载用户头像，切换上传按钮与点击交互
     */
    async loadAvatar() {
        try {
            const result = await api.getAvatar();
            const img = document.getElementById("avatar-img");
            const uploadBtn = document.querySelector(".avatar-upload-btn");
            if (result.url) {
                img.src = result.url;
                img.classList.remove("hidden");
                img.style.cursor = "pointer";
                uploadBtn.classList.add("hidden");
                img.onclick = () => this._showAvatarMenu();
            } else {
                img.src = "";
                img.classList.add("hidden");
                img.style.cursor = "";
                img.onclick = null;
                uploadBtn.classList.remove("hidden");
            }
        } catch {
            // 静默失败，不影响主功能
        }
    },

    /**
     * 显示更换头像确认弹窗
     */
    _showAvatarMenu() {
        // 移除已存在的菜单
        const old = document.querySelector(".avatar-menu");
        if (old) old.remove();

        const container = document.querySelector(".avatar-container");
        const rect = container.getBoundingClientRect();

        const menu = document.createElement("div");
        menu.className = "avatar-menu";
        menu.innerHTML = `
            <div class="avatar-menu-arrow"></div>
            <p class="avatar-menu-text">更换头像？</p>
            <div class="avatar-menu-actions">
                <button class="btn btn-sm btn-primary" id="btn-avatar-change">更换</button>
                <button class="btn btn-sm btn-outline" id="btn-avatar-cancel">取消</button>
            </div>
        `;
        menu.style.position = "fixed";
        menu.style.top = (rect.bottom + 10) + "px";
        menu.style.left = (rect.left + rect.width / 2) + "px";

        document.body.appendChild(menu);

        document.getElementById("btn-avatar-change").onclick = () => {
            menu.remove();
            document.getElementById("avatar-upload").click();
        };
        document.getElementById("btn-avatar-cancel").onclick = () => menu.remove();

        // 点击菜单外部关闭
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!menu.contains(e.target) && !container.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener("click", closeHandler);
                }
            };
            document.addEventListener("click", closeHandler);
        }, 0);
    },

    /**
     * 处理头像上传
     */
    async handleAvatarUpload(file) {
        if (!file) return;
        try {
            const result = await api.uploadAvatar(file);
            if (result.url) {
                const img = document.getElementById("avatar-img");
                const uploadBtn = document.querySelector(".avatar-upload-btn");
                img.src = result.url;
                img.classList.remove("hidden");
                img.style.cursor = "pointer";
                img.onclick = () => this._showAvatarMenu();
                uploadBtn.classList.add("hidden");
            }
        } catch (err) {
            alert(err.message || "头像上传失败");
        }
    },
};
