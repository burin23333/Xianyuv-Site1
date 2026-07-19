/**
 * Todo 应用主逻辑 —— 渲染、交互、增删改查
 */
const TodoApp = {
    todos: [],
    total: 0,
    page: 1,
    pageSize: 10,
    keyword: "",
    _searchTimer: null,
    _eventsBound: false,

    /**
     * 初始化应用
     */
    init() {
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

        // 搜索（防抖 300ms）
        document.getElementById("search-input").addEventListener("input", (e) => {
            clearTimeout(this._searchTimer);
            const val = e.target.value.trim();
            this._searchTimer = setTimeout(() => {
                if (this.keyword !== val) {
                    this.keyword = val;
                    this.page = 1;
                    this.loadTodos();
                }
                // 显示/隐藏清除按钮
                document.getElementById("btn-clear-search").classList.toggle("hidden", !val);
            }, 300);
        });

        // 清除搜索
        document.getElementById("btn-clear-search").addEventListener("click", () => {
            document.getElementById("search-input").value = "";
            document.getElementById("btn-clear-search").classList.add("hidden");
            this.keyword = "";
            this.page = 1;
            this.loadTodos();
        });

        // 分页按钮
        document.getElementById("btn-prev").addEventListener("click", () => this.goToPage(this.page - 1));
        document.getElementById("btn-next").addEventListener("click", () => this.goToPage(this.page + 1));

        // 监听全局退出登录（token 过期）
        window.addEventListener("auth:logout", () => {
            Auth.showAuthSection();
            this.showToast("登录已过期，请重新登录", "error");
        });

        // 清空已完成
        document.getElementById("btn-clear-completed").addEventListener("click", () => {
            this.clearCompleted();
        });

        // 详情弹窗
        document.getElementById("btn-close-detail").addEventListener("click", () => this.closeDetail());
        document.getElementById("btn-cancel-detail").addEventListener("click", () => this.closeDetail());
        document.getElementById("btn-save-detail").addEventListener("click", () => this.saveDetail());

        // 事件委托：待办列表按钮点击（代替内联 onclick）
        document.getElementById("todo-list").addEventListener("click", (e) => {
            const actionBtn = e.target.closest("[data-action]");
            if (!actionBtn) return;
            const item = actionBtn.closest(".todo-item");
            if (!item) return;
            const id = parseInt(item.dataset.id);
            switch (actionBtn.dataset.action) {
                case "toggle": this.toggleDone(id); break;
                case "detail": this.showDetail(id); break;
                case "edit": this.startEdit(id); break;
                case "delete": this.deleteTodo(id); break;
            }
        });

        // 事件委托：编辑输入框键盘事件
        document.getElementById("todo-list").addEventListener("keydown", (e) => {
            if (e.target.classList.contains("todo-edit-input")) {
                this.handleEditKey(e);
            }
        });

        // 事件委托：编辑输入框失焦事件（useCapture 捕获 blur）
        document.getElementById("todo-list").addEventListener("blur", (e) => {
            if (e.target.classList.contains("todo-edit-input")) {
                this.finishEdit(e);
            }
        }, true);
    },

    // ==================== 数据操作 ====================

    /**
     * 加载待办列表
     */
    async loadTodos() {
        this.showLoading(true);
        try {
            const skip = (this.page - 1) * this.pageSize;
            const data = await api.getTodos({
                keyword: this.keyword,
                skip,
                limit: this.pageSize,
            });
            // 格式1：后端做了分页 → {todos:[], total:N}
            if (data && !Array.isArray(data) && data.todos) {
                this.todos = data.todos;
                this.total = data.total || 0;
                this.render();
            }
            // 格式2：后端返回全量数据（裸数组）→ 前端自己做搜索+分页
            else if (data && Array.isArray(data)) {
                let filtered = data;
                if (this.keyword) {
                    const kw = this.keyword.toLowerCase();
                    filtered = data.filter((t) => t.title.toLowerCase().includes(kw));
                }
                this.total = filtered.length;
                this.todos = filtered.slice(skip, skip + this.pageSize);
                this.render();
            } else if (data.message) {
                this.showToast(data.message, "error");
            } else {
                console.warn("loadTodos 未识别响应结构:", data);
            }
        } catch (err) {
            console.error("loadTodos 异常:", err);
            this.showToast("加载失败，请检查网络", "error");
        } finally {
            this.showLoading(false);
        }
    },

    /**
     * 跳转到指定页
     */
    goToPage(page) {
        const maxPage = Math.max(1, Math.ceil(this.total / this.pageSize));
        if (page < 1 || page > maxPage) return;
        this.page = page;
        this.loadTodos();
        // 滚动到顶部
        document.querySelector(".todo-list").scrollTop = 0;
    },

    /**
     * 添加待办
     */
    async addTodo() {
        const input = document.getElementById("todo-input");
        const title = input.value.trim();
        if (!title) return;

        const priority = document.getElementById("todo-priority").value;

        try {
            const result = await api.createTodo(title, priority);
            // 成功添加后刷新列表
            if (result.id) {
                input.value = "";
                document.getElementById("todo-priority").value = "1";
                // 回到第一页显示新添加的项
                this.page = 1;
                await this.loadTodos();
                this.showToast("添加成功", "success");
            } else {
                this.showToast(result.message || "添加失败", "error");
            }
        } catch (err) {
            console.error("addTodo 异常:", err);
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
     * 删除待办（确认后删除）
     */
    async deleteTodo(id) {
        const todo = this.todos.find((t) => t.id === id);
        if (!todo) return;

        // 显示确认弹窗
        this._confirmDelete(todo, () => this._doDelete(id));
    },

    /**
     * 确认删除弹窗
     */
    _confirmDelete(todo, onConfirm) {
        // 移除旧 toast
        const old = document.querySelector(".toast");
        if (old) old.remove();

        const toast = document.createElement("div");
        toast.className = "toast confirm-toast";

        const span = document.createElement("span");
        span.textContent = `确定删除「${todo.title}」？`;

        const btnCancel = document.createElement("button");
        btnCancel.className = "toast-cancel-btn";
        btnCancel.textContent = "取消";
        btnCancel.addEventListener("click", (e) => {
            e.preventDefault();
            toast.remove();
        });

        const btnOk = document.createElement("button");
        btnOk.className = "toast-ok-btn";
        btnOk.textContent = "确认";
        btnOk.addEventListener("click", (e) => {
            e.preventDefault();
            toast.remove();
            onConfirm();
        });

        toast.appendChild(span);
        toast.appendChild(btnCancel);
        toast.appendChild(btnOk);
        document.body.appendChild(toast);
    },

    /**
     * 真正执行删除
     */
    async _doDelete(id) {
        try {
            await api.deleteTodo(id);
            // 如果当前页空了且不是第一页，回退一页
            if (this.todos.length === 1 && this.page > 1) {
                this.page--;
            }
            await this.loadTodos();
            this.showToast("删除成功", "success");
        } catch (err) {
            this.showToast("删除失败", "error");
            await this.loadTodos();
        }
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

        // 统计（显示总数）
        document.getElementById("stat-total").textContent = this.total;
        const doneCount = this.todos.filter((t) => t.done).length;
        document.getElementById("stat-done").textContent = doneCount;
        document.getElementById("btn-clear-completed").classList.toggle("hidden", doneCount === 0);

        // 空状态
        if (this.todos.length === 0) {
            listEl.innerHTML = "";
            emptyEl.classList.remove("hidden");
            this._renderPagination();
            return;
        }

        emptyEl.classList.add("hidden");

        listEl.innerHTML = this.todos
            .map(
                (todo) => `
            <li class="todo-item ${todo.done ? "done" : ""}" data-id="${todo.id}">
                <div class="todo-checkbox ${todo.done ? "checked" : ""}"
                     data-action="toggle"
                     title="${todo.done ? "标记为未完成" : "标记为已完成"}">
                    ${todo.done ? "✓" : ""}
                </div>
                <span class="todo-title">${this.escapeHtml(todo.title)}</span>
                <span class="priority-tag priority-${(todo.priority || 1)}">${this._priorityLabel(todo.priority)}</span>
                <input class="todo-edit-input" value="${this.escapeHtml(todo.title)}"
                       data-id="${todo.id}">
                <div class="todo-actions">
                    <button class="btn-icon info" data-action="detail" title="详情">ℹ</button>
                    <button class="btn-icon edit" data-action="edit" title="编辑">✎</button>
                    <button class="btn-icon delete" data-action="delete" title="删除">✕</button>
                </div>
            </li>`
            )
            .join("");

        this._renderPagination();
    },

    /**
     * 渲染分页控件
     */
    _renderPagination() {
        const pagination = document.getElementById("pagination");
        const btnPrev = document.getElementById("btn-prev");
        const btnNext = document.getElementById("btn-next");
        const pageInfo = document.getElementById("page-info");

        const maxPage = Math.max(1, Math.ceil(this.total / this.pageSize));

        // 只有一页时隐藏分页
        if (maxPage <= 1 && !this.keyword) {
            pagination.classList.add("hidden");
            return;
        }

        pagination.classList.remove("hidden");
        btnPrev.disabled = this.page <= 1;
        btnNext.disabled = this.page >= maxPage;
        pageInfo.textContent = `${this.page} / ${maxPage}`;
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
     * 优先级数字 → 文字标签
     */
    _priorityLabel(value) {
        const labels = { 0: "低", 1: "中", 2: "高", 3: "紧急" };
        return labels[value] || "中";
    },

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
     * 清空所有已完成的待办
     */
    async clearCompleted() {
        const doneCount = this.todos.filter((t) => t.done).length;
        if (doneCount === 0) return;

        try {
            const data = await api.deleteCompletedTodos();
            await this.loadTodos();
            this.showToast(data.message || "已清空", "success");
        } catch (err) {
            this.showToast("操作失败", "error");
        }
    },

    // ==================== 详情弹窗 ====================

    _detailId: null,

    /**
     * 打开详情弹窗
     */
    showDetail(id) {
        const todo = this.todos.find((t) => t.id === id);
        if (!todo) {
            return;
        }

        this._detailId = id;
        document.getElementById("detail-title").textContent = todo.title;
        document.getElementById("detail-priority").textContent = this._priorityLabel(todo.priority);
        document.getElementById("detail-created-at").textContent = todo.created_at
            ? new Date(todo.created_at).toLocaleString()
            : "未知";
        document.getElementById("detail-notes").value = todo.notes || "";

        // 设置截止时间
        const dueInput = document.getElementById("detail-due-date");
        if (todo.due_date) {
            const d = new Date(todo.due_date);
            const pad = (n) => String(n).padStart(2, "0");
            dueInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } else {
            dueInput.value = "";
        }

        document.getElementById("detail-modal").classList.remove("hidden");
    },

    /**
     * 关闭详情弹窗
     */
    closeDetail() {
        document.getElementById("detail-modal").classList.add("hidden");
        this._detailId = null;
    },

    /**
     * 保存详情（截止时间 / 备注）
     */
    async saveDetail() {
        const id = this._detailId;
        if (!id) return;

        const dueDateValue = document.getElementById("detail-due-date").value;
        const notes = document.getElementById("detail-notes").value.trim();

        const data = {};
        data.due_date = dueDateValue ? new Date(dueDateValue).toISOString() : null;
        data.notes = notes || null;

        try {
            const result = await api.updateTodo(id, data);
            // 更新本地缓存
            const todo = this.todos.find((t) => t.id === id);
            if (todo) {
                todo.due_date = data.due_date;
                todo.notes = data.notes;
            }
            this.closeDetail();
            this.showToast("保存成功", "success");
        } catch (err) {
            this.showToast("保存失败", "error");
        }
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
