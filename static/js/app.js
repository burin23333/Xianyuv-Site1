/**
 * Todo 应用主逻辑 —— 渲染、交互、增删改查
 */
const TodoApp = {
    todos: [],
    _eventsBound: false,

    /**
     * 初始化应用
     */
    init() {
        Theme.init();
        if (!this._eventsBound) {
            this.bindEvents();
            this._eventsBound = true;
        }
        this.loadTodos();
    },

    /**
     * 绑定 Todo 相关事件（仅执行一次）
     */
    bindEvents() {
        // 添加待办
        document.getElementById("todo-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.addTodo();
        });

        // 监听全局退出登录（token 过期）
        window.addEventListener("auth:logout", () => {
            Auth.showAuthSection();
            this.showToast("登录已过期，请重新登录", "error");
        });
    },

    // ==================== 数据操作 ====================

    /**
     * 加载待办列表
     */
    async loadTodos() {
        this.showLoading(true);
        try {
            const data = await api.getTodos();
            if (Array.isArray(data)) {
                this.todos = data;
                this.render();
            } else if (data.message) {
                this.showToast(data.message, "error");
            }
        } catch (err) {
            this.showToast("加载失败，请检查网络", "error");
        } finally {
            this.showLoading(false);
        }
    },

    /**
     * 添加待办
     */
    async addTodo() {
        const input = document.getElementById("todo-input");
        const title = input.value.trim();
        if (!title) return;

        try {
            const result = await api.createTodo(title);
            if (result.id) {
                this.todos.unshift(result);
                input.value = "";
                this.render();
                this.showToast("添加成功", "success");
            } else {
                this.showToast(result.message || "添加失败", "error");
            }
        } catch (err) {
            this.showToast("添加失败", "error");
        }
    },

    /**
     * 切换完成状态
     */
    async toggleDone(id) {
        const todo = this.todos.find((t) => t.id === id);
        if (!todo) return;

        const newDone = !todo.done;
        // 乐观更新
        todo.done = newDone;
        this.render();

        try {
            const result = await api.updateTodo(id, { done: newDone });
            if (result.message && result.message !== "更新成功") {
                // 回滚
                todo.done = !newDone;
                this.render();
                this.showToast(result.message, "error");
            }
        } catch (err) {
            todo.done = !newDone;
            this.render();
            this.showToast("操作失败", "error");
        }
    },

    /**
     * 删除待办（乐观删除 + 3 秒撤销）
     */
    async deleteTodo(id) {
        const todo = this.todos.find((t) => t.id === id);
        if (!todo) return;

        // 乐观删除：先从 UI 移除
        this.todos = this.todos.filter((t) => t.id !== id);
        this.render();

        const title = todo.title;
        let undone = false;
        let toastEl = null;

        // 撤销回调
        const onUndo = () => {
            undone = true;
            this.todos.unshift(todo);
            this.render();
            this.showToast("已恢复", "success");
        };

        // 显示撤销 Toast
        toastEl = this._buildUndoToast(title, onUndo);
        document.body.appendChild(toastEl);

        // 3 秒后真正删除
        setTimeout(async () => {
            if (undone) {
                if (toastEl) toastEl.remove();
                return;
            }
            try {
                await api.deleteTodo(id);
                if (toastEl) toastEl.remove();
            } catch (err) {
                // 删除失败，恢复数据
                this.todos.unshift(todo);
                this.render();
                if (toastEl) toastEl.remove();
                this.showToast("删除失败，已恢复", "error");
            }
        }, 3000);
    },

    /**
     * 构建带撤销按钮的 Toast
     */
    _buildUndoToast(title, onUndo) {
        // 移除旧 toast
        const old = document.querySelector(".toast");
        if (old) old.remove();

        const toast = document.createElement("div");
        toast.className = "toast undo-toast";

        const span = document.createElement("span");
        span.textContent = `已删除「${title}」`;

        const btn = document.createElement("button");
        btn.className = "toast-undo-btn";
        btn.textContent = "撤销";
        btn.addEventListener("click", onUndo);

        toast.appendChild(span);
        toast.appendChild(btn);
        return toast;
    },

    /**
     * 更新待办标题
     */
    async updateTitle(id, newTitle) {
        const title = newTitle.trim();
        if (!title) return;

        const todo = this.todos.find((t) => t.id === id);
        if (!todo || todo.title === title) return;

        const oldTitle = todo.title;
        todo.title = title;
        this.render();

        try {
            const result = await api.updateTodo(id, { title });
            if (result.message && result.message !== "更新成功") {
                todo.title = oldTitle;
                this.render();
                this.showToast(result.message, "error");
            }
        } catch (err) {
            todo.title = oldTitle;
            this.render();
            this.showToast("更新失败", "error");
        }
    },

    // ==================== UI 渲染 ====================

    /**
     * 渲染待办列表
     */
    render() {
        const listEl = document.getElementById("todo-list");
        const emptyEl = document.getElementById("empty-state");

        // 统计
        document.getElementById("stat-total").textContent = this.todos.length;
        document.getElementById("stat-done").textContent = this.todos.filter((t) => t.done).length;

        // 空状态
        if (this.todos.length === 0) {
            listEl.innerHTML = "";
            emptyEl.classList.remove("hidden");
            return;
        }

        emptyEl.classList.add("hidden");

        // 排序：未完成在前，按 id 倒序
        const sorted = [...this.todos].sort((a, b) => {
            if (a.done !== b.done) return a.done ? 1 : -1;
            return b.id - a.id;
        });

        listEl.innerHTML = sorted
            .map(
                (todo) => `
            <li class="todo-item ${todo.done ? "done" : ""}" data-id="${todo.id}">
                <div class="todo-checkbox ${todo.done ? "checked" : ""}"
                     onclick="TodoApp.toggleDone(${todo.id})"
                     title="${todo.done ? "标记为未完成" : "标记为已完成"}">
                    ${todo.done ? "✓" : ""}
                </div>
                <span class="todo-title">${this.escapeHtml(todo.title)}</span>
                <input class="todo-edit-input" value="${this.escapeHtml(todo.title)}"
                       data-id="${todo.id}"
                       onblur="TodoApp.finishEdit(event)"
                       onkeydown="TodoApp.handleEditKey(event)">
                <div class="todo-actions">
                    <button class="btn-icon edit"
                            onclick="TodoApp.startEdit(${todo.id})"
                            title="编辑">
                        ✎
                    </button>
                    <button class="btn-icon delete"
                            onclick="TodoApp.deleteTodo(${todo.id})"
                            title="删除">
                        ✕
                    </button>
                </div>
            </li>`
            )
            .join("");
    },

    /**
     * 进入编辑模式
     */
    startEdit(id) {
        const item = document.querySelector(`.todo-item[data-id="${id}"]`);
        if (!item) return;

        item.classList.add("editing");
        const input = item.querySelector(".todo-edit-input");
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    },

    /**
     * 完成编辑
     */
    finishEdit(event) {
        const input = event.target;
        const id = parseInt(input.dataset.id);
        const item = document.querySelector(`.todo-item[data-id="${id}"]`);
        if (!item) return;

        item.classList.remove("editing");
        this.updateTitle(id, input.value);
    },

    /**
     * 编辑输入框键盘事件
     */
    handleEditKey(event) {
        if (event.key === "Enter") {
            event.target.blur();
        } else if (event.key === "Escape") {
            const id = parseInt(event.target.dataset.id);
            const todo = this.todos.find((t) => t.id === id);
            if (todo) {
                event.target.value = todo.title;
            }
            event.target.blur();
        }
    },

    // ==================== 工具方法 ====================

    /**
     * HTML 转义，防止 XSS
     */
    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * 显示加载/空状态
     */
    showLoading(show) {
        document.getElementById("loading-state").classList.toggle("hidden", !show);
    },

    /**
     * Toast 提示
     */
    showToast(message, type = "info") {
        // 移除旧 toast
        const old = document.querySelector(".toast");
        if (old) old.remove();

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 2500);
    },
};

// ==================== 启动应用 ====================
document.addEventListener("DOMContentLoaded", () => {
    window.TodoApp = TodoApp;
    Auth.init();
});
