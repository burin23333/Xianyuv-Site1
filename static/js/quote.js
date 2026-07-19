// 随机名人名言
const Quote = {
    async load() {
        try {
            const data = await fetch(`${API_BASE}/quotes/random`).then((r) => r.json());
            document.getElementById("quote-text").textContent = `"${data.text}"`;
            document.getElementById("quote-author").textContent = `—— ${data.author}`;
        } catch {
            document.getElementById("quote-text").textContent = "";
            document.getElementById("quote-author").textContent = "";
        }
    },

    init() {
        this.load();
        document.getElementById("btn-refresh-quote").addEventListener("click", () => this.load());
    },
};

window.Quote = Quote;
