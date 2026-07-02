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

        // 监听退出登录事件
        document.getElementById("btn-logout").addEventListener("click", () => this.logout());

        // 启动 Todo 应用
        if (window.TodoApp) {
            window.TodoApp.init();
        }
    },
};
