/**
 * API 层 —— 封装所有后端请求
 */
// API_BASE 优先从 script 标签 data-api-base 属性读取，默认 /api/v1
const API_BASE = document.currentScript?.getAttribute("data-api-base") || "/api/v1";

const api = {
    /**
     * 通用请求方法
     */
    async request(url, options = {}) {
        const token = localStorage.getItem("access_token");
        const isFormData = options.body instanceof FormData;
        const headers = {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            ...(options.headers || {}),
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(API_BASE + url, {
            ...options,
            headers,
        });

        const data = await response.json();

        // 将 FastAPI HTTPException 的 detail 统一转为 message
        if (!response.ok && data.detail) {
            data.message = data.detail;
        }

        // 401 表示 token 过期或无效
        if (response.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("username");
            window.dispatchEvent(new CustomEvent("auth:logout"));
            throw new Error("登录已过期，请重新登录");
        }

        return data;
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

    /** 获取当前用户待办（支持分页和搜索） */
    getTodos({ keyword = "", skip = 0, limit = 10 } = {}) {
        const params = new URLSearchParams();
        if (keyword) params.append("keyword", keyword);
        params.append("skip", skip);
        params.append("limit", limit);
        return this.request(`/todos?${params.toString()}`);
    },

    /** 创建待办 */
    createTodo(title, priority) {
        return this.request("/todos", {
            method: "POST",
            body: JSON.stringify({ title, priority }),
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

    /** 删除所有已完成的待办 */
    deleteCompletedTodos() {
        return this.request("/todos/completed", {
            method: "DELETE",
        });
    },

    // ==================== 头像 ====================

    /** 上传头像 */
    uploadAvatar(file) {
        const formData = new FormData();
        formData.append("avatar", file);
        return this.request("/users/avatar", {
            method: "POST",
            body: formData,
        });
    },

    /** 获取头像 URL */
    getAvatar() {
        return this.request("/users/avatar");
    },
};
