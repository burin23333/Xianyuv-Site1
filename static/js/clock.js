// 实时时钟
function updateClock() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    document.getElementById("clock").textContent = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 启动时立即显示一次
updateClock();
// 每秒更新
setInterval(updateClock, 1000);
