/**
 * API 层 —— 封装所有后端请求
 */
const API_BASE = "";  // 前后端同域，无需额外前缀

const api = {
    /**
     * 通用请求方法
     */
    async request(url, options = {}) {
        const token = localStorage.getItem("access_token");
        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(API_BASE + url, {
            ...options,
            headers,
        });

        // 401 表示 token 过期或无效
        if (response.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("username");
            window.dispatchEvent(new CustomEvent("auth:logout"));
            throw new Error("登录已过期，请重新登录");
        }

        return response.json();
    },

    // ==================== 认证 ====================

    /** 用户注册 */
    register(username, password) {
        return this.request("/register", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
    },

    /** 用户登录，返回 { access_token, token_type } */
    login(username, password) {
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);

        return this.request("/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
        });
    },

    // ==================== Todo CRUD ====================

    /** 获取当前用户所有待办 */
    getTodos() {
        return this.request("/todos");
    },

    /** 创建待办 */
    createTodo(title) {
        return this.request("/todos", {
            method: "POST",
            body: JSON.stringify({ title }),
        });
    },

    /** 更新待办 */
    updateTodo(id, data) {
        return this.request(`/todos/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    /** 删除待办 */
    deleteTodo(id) {
        return this.request(`/todos/${id}`, {
            method: "DELETE",
        });
    },
};
