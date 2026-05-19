
// ============================================================
//  贪吃蛇游戏 — 核心逻辑（v3 侧面板/规则/自定义网格/难度锁定）
// ============================================================

(function () {
    "use strict";

    // ---------- 游戏配置 ----------
    let CELL_SIZE = 26;
    let GRID_COLS = 20;
    let GRID_ROWS = 20;
    const INITIAL_LENGTH = 3;
    const BASE_INTERVAL = 220;
    const MIN_INTERVAL = 40;
    const SPEED_UP_PER_FOOD = 2;

    // ---- 食物类型（概率由难度动态决定） ----
    const FOOD_TYPES = [
        { type: 'green', color: '#43a047', glow: 'rgba(67,160,71,0.4)', value: 1 },
        { type: 'blue', color: '#1e88e5', glow: 'rgba(30,136,229,0.4)', value: 5 },
        { type: 'purple', color: '#8e24aa', glow: 'rgba(142,36,170,0.4)', value: 10 },
        { type: 'gold', color: '#ffb300', glow: 'rgba(255,179,0,0.5)', value: 100 },
    ];

    // 各难度的食物概率 [green, blue, purple, gold]
    const FOOD_PROBS_BY_DIFF = [
        null,
        [0.8000, 0.1495, 0.0495, 0.0010], // 难度1
        [0.7600, 0.1600, 0.0700, 0.0100], // 难度2
        [0.6800, 0.1900, 0.1100, 0.0200], // 难度3
        [0.5800, 0.2200, 0.1500, 0.0500], // 难度4
        [0.4500, 0.2500, 0.1800, 0.1200], // 难度5
    ];

    const FOOD_TIMEOUTS = [0, 0, 30000, 20000, 10000, 5000];

    let CANVAS_W = GRID_COLS * CELL_SIZE;
    let CANVAS_H = GRID_ROWS * CELL_SIZE;

    // ---------- DOM ----------
    const canvas = document.getElementById('snakeCanvas');
    const ctx = canvas.getContext('2d');

    const statusDisplay = document.getElementById('statusDisplay');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const replayBtn = document.getElementById('replayBtn');
    const difficultySelect = document.getElementById('difficultySelect');

    // 侧面板 DOM
    const statScore = document.getElementById('statScore');
    const statHighScore = document.getElementById('statHighScore');
    const statLength = document.getElementById('statLength');
    const statMultiplier = document.getElementById('statMultiplier');
    const statSpeed = document.getElementById('statSpeed');
    const countGreen = document.getElementById('countGreen');
    const countBlue = document.getElementById('countBlue');
    const countPurple = document.getElementById('countPurple');
    const countGold = document.getElementById('countGold');

    // 自定义网格
    const gridWidthInput = document.getElementById('gridWidth');
    const gridHeightInput = document.getElementById('gridHeight');
    const applyGridBtn = document.getElementById('applyGridBtn');

    // 规则弹窗
    const rulesModal = document.getElementById('rulesModal');
    const rulesBtn = document.getElementById('rulesBtn');
    const rulesCloseBtn = document.getElementById('rulesCloseBtn');

    // 排行榜
    const lbEntries = document.getElementById('lbEntries');
    const LB_KEY = 'snakeLeaderboard';
    const LB_MIN_SCORE = 10;
    const LB_MAX = 10;

    // ---------- 游戏状态 ----------
    const STATE = { IDLE: 'idle', PLAYING: 'playing', PAUSED: 'paused', OVER: 'over', WIN: 'win' };
    let snake = [];
    let food = null;
    let foodType = null;
    let foodTimeoutId = null;
    let direction = 'right';
    let nextDirection = 'right';
    let score = 0;
    let gameState = STATE.IDLE;
    let gameLoop = null;
    let highScore = parseInt(localStorage.getItem('snakeHighScore') || '0', 10);
    let difficultyLocked = false;
    let difficulty = 1;

    // 食物计数
    let foodCounts = { green: 0, blue: 0, purple: 0, gold: 0 };

    const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

    // ---------- 画布尺寸 ----------
    function resizeCanvas() {
        CANVAS_W = GRID_COLS * CELL_SIZE;
        CANVAS_H = GRID_ROWS * CELL_SIZE;
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        fitCanvas();
    }

    // ---------- 难度 ----------
    function getDifficulty() {
        return difficulty;
    }

    function updateDifficultyLock() {
        const locked = (gameState === STATE.PLAYING || gameState === STATE.PAUSED);
        difficultySelect.disabled = locked;
        difficultyLocked = locked;
        difficultySelect.style.opacity = locked ? '0.5' : '1';
        difficultySelect.style.cursor = locked ? 'not-allowed' : 'pointer';
    }

    function applyDifficulty() {
        difficulty = parseInt(difficultySelect.value, 10) || 1;
        updateDifficultyLock();
    }

    // ---------- 食物类型（按难度动态概率） ----------
    function pickFoodType() {
        const diff = getDifficulty();
        const probs = FOOD_PROBS_BY_DIFF[diff] || FOOD_PROBS_BY_DIFF[1];
        const r = Math.random();
        let cum = 0;
        for (let i = 0; i < FOOD_TYPES.length; i++) {
            cum += probs[i];
            if (r < cum) return FOOD_TYPES[i];
        }
        return FOOD_TYPES[0];
    }

    // ---------- 工具 ----------
    function getFreeCells() {
        const snakeSet = new Set(snake.map(p => `${p.x},${p.y}`));
        const free = [];
        for (let x = 0; x < GRID_COLS; x++)
            for (let y = 0; y < GRID_ROWS; y++)
                if (!snakeSet.has(`${x},${y}`)) free.push({ x, y });
        return free;
    }

    // ---------- 食物 ----------
    function spawnFood() {
        const free = getFreeCells();
        if (free.length === 0) { setGameState(STATE.WIN); return false; }
        food = free[Math.floor(Math.random() * free.length)];
        foodType = pickFoodType();

        clearFoodTimeout();
        const timeout = FOOD_TIMEOUTS[getDifficulty()] || 0;
        if (timeout > 0) {
            foodTimeoutId = setTimeout(() => {
                if (gameState === STATE.PLAYING && food) {
                    spawnFood();
                    drawCanvas();
                }
            }, timeout);
        }
        return true;
    }

    function clearFoodTimeout() {
        if (foodTimeoutId) { clearTimeout(foodTimeoutId); foodTimeoutId = null; }
    }

    // ---------- 蛇 ----------
    function initSnake() {
        snake = [];
        const sx = Math.floor(GRID_COLS / 2);
        const sy = Math.floor(GRID_ROWS / 2);
        for (let i = 0; i < INITIAL_LENGTH; i++)
            snake.push({ x: sx - i, y: sy });
        direction = 'right';
        nextDirection = 'right';
    }

    // ---------- 重置 ----------
    function resetGame() {
        stopLoop();
        clearFoodTimeout();
        applyDifficulty();
        initSnake();
        score = 0;
        foodCounts = { green: 0, blue: 0, purple: 0, gold: 0 };
        gameState = STATE.IDLE;
        fullUpdate();
        setStatusDisplay(STATE.IDLE, '⏸ 未开始');
        food = null;
        foodType = null;
        drawCanvas();
        startBtn.textContent = '▶ 开始';
    }

    // ---------- 循环 ----------
    function startLoop() {
        stopLoop();
        gameLoop = setInterval(tick, getCurrentInterval());
    }

    function stopLoop() {
        if (gameLoop !== null) { clearInterval(gameLoop); gameLoop = null; }
    }

    function restartLoop() {
        if (gameState === STATE.PLAYING) startLoop();
    }

    function getCurrentInterval() {
        const diff = getDifficulty();
        const speedUp = Math.min(
            snake.length - INITIAL_LENGTH,
            (BASE_INTERVAL - MIN_INTERVAL) / SPEED_UP_PER_FOOD
        );
        let interval = BASE_INTERVAL - speedUp * SPEED_UP_PER_FOOD;
        interval = Math.round(interval / diff);
        return Math.max(MIN_INTERVAL, interval);
    }

    // ---------- 核心移动 ----------
    function tick() {
        if (gameState !== STATE.PLAYING) return;
        direction = nextDirection;

        const head = snake[0];
        let newHead = { ...head };
        switch (direction) {
            case 'up': newHead.y--; break;
            case 'down': newHead.y++; break;
            case 'left': newHead.x--; break;
            case 'right': newHead.x++; break;
        }

        if (newHead.x < 0 || newHead.x >= GRID_COLS || newHead.y < 0 || newHead.y >= GRID_ROWS) {
            gameOver(); return;
        }

        const willEat = food && newHead.x === food.x && newHead.y === food.y;
        const bodyToCheck = willEat ? snake : snake.slice(0, -1);
        for (const seg of bodyToCheck) {
            if (seg.x === newHead.x && seg.y === newHead.y) { gameOver(); return; }
        }

        snake.unshift(newHead);

        if (willEat) {
            const diff = getDifficulty();
            const baseScore = foodType ? foodType.value : 1;
            score += baseScore * diff;
            // 记录食物计数
            if (foodType && foodCounts[foodType.type] !== undefined) {
                foodCounts[foodType.type]++;
            }
            fullUpdate();
            clearFoodTimeout();
            if (!spawnFood()) { drawCanvas(); return; }
            restartLoop();
        } else {
            snake.pop();
        }

        fullUpdate();
        drawCanvas();
    }

    // ---------- 游戏结束 ----------
    function gameOver() {
        clearFoodTimeout();
        const isNewHighScore = score > highScore;
        if (isNewHighScore && score > 0) {
            highScore = score;
            localStorage.setItem('snakeHighScore', String(highScore));
        }
        // 尝试加入排行榜
        if (score >= LB_MIN_SCORE) {
            tryAddToLeaderboard(score);
        }
        setGameState(STATE.OVER, isNewHighScore);
        fullUpdate();
    }

    // ---------- 状态管理 ----------
    let isNewHighScore = false;

    function setGameState(newState, newRecord = false) {
        gameState = newState;
        isNewHighScore = newRecord;
        const btnMap = {
            [STATE.PLAYING]: '▶ 进行中', [STATE.PAUSED]: '▶ 继续',
            [STATE.OVER]: '▶ 重新开始', [STATE.WIN]: '▶ 重新开始', [STATE.IDLE]: '▶ 开始',
        };
        let statusText = '';
        switch (newState) {
            case STATE.PLAYING: statusText = '▶ 进行中'; break;
            case STATE.PAUSED: statusText = '⏸ 已暂停'; break;
            case STATE.OVER: statusText = isNewHighScore ? '👑 新纪录！' : '💀 游戏结束'; break;
            case STATE.WIN: statusText = '🎉 你赢了！'; break;
            case STATE.IDLE: statusText = '⏸ 未开始'; break;
        }
        startBtn.textContent = btnMap[newState] || '▶ 开始';
        setStatusDisplay(newState, statusText);
        updateDifficultyLock();
        if (newState === STATE.PLAYING) startLoop();
        else stopLoop();
        fullUpdate();
        drawCanvas();
    }

    function setStatusDisplay(state, text) {
        statusDisplay.textContent = text;
        statusDisplay.className = 'game-status';
        const clsMap = { [STATE.PLAYING]: 'playing', [STATE.PAUSED]: 'paused', [STATE.OVER]: 'over', [STATE.WIN]: 'win' };
        if (clsMap[state]) statusDisplay.classList.add(clsMap[state]);
        else statusDisplay.classList.add('paused');
    }

    function fullUpdate() {
        // 侧面板
        statScore.textContent = score;
        statHighScore.textContent = highScore;
        statLength.textContent = snake.length;
        statMultiplier.textContent = `×${getDifficulty()}`;
        statSpeed.textContent = getCurrentInterval() + 'ms';
        countGreen.textContent = foodCounts.green;
        countBlue.textContent = foodCounts.blue;
        countPurple.textContent = foodCounts.purple;
        countGold.textContent = foodCounts.gold;
    }

    // ---------- 渲染 ----------
    function drawCanvas() {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.strokeStyle = 'rgba(127, 140, 141, 0.25)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= GRID_COLS; x++) {
            ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, CANVAS_H); ctx.stroke();
        }
        for (let y = 0; y <= GRID_ROWS; y++) {
            ctx.beginPath(); ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(CANVAS_W, y * CELL_SIZE); ctx.stroke();
        }

        // 食物
        if (food && foodType) {
            const fx = food.x * CELL_SIZE + CELL_SIZE / 2;
            const fy = food.y * CELL_SIZE + CELL_SIZE / 2;
            const r = CELL_SIZE * 0.38;
            ctx.shadowColor = foodType.glow;
            ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(fx, fy, r, 0, 2 * Math.PI);
            ctx.fillStyle = foodType.color; ctx.fill();
            ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(fx - r * 0.25, fy - r * 0.25, r * 0.3, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
            if (foodType.type === 'gold') {
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = `${Math.floor(CELL_SIZE * 0.42)}px sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('★', fx, fy + 1);
            }
        }

        // 蛇身（红色）
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const sx = seg.x * CELL_SIZE;
            const sy = seg.y * CELL_SIZE;
            const pad = 1.5;
            if (i === 0) ctx.fillStyle = '#d32f2f';
            else {
                const t = i / Math.max(snake.length - 1, 1);
                ctx.fillStyle = `rgb(${Math.round(180 - t * 60)}, 48, 48)`;
            }
            roundRect(ctx, sx + pad, sy + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2, Math.min(5, CELL_SIZE * 0.2));
            ctx.fill();

            if (i === 0) {
                const cx = sx + CELL_SIZE / 2, cy = sy + CELL_SIZE / 2;
                const off = 4, eyeR = 2.5;
                let ex1, ey1, ex2, ey2;
                switch (direction) {
                    case 'up': ex1 = cx - off; ey1 = cy - off; ex2 = cx + off; ey2 = cy - off; break;
                    case 'down': ex1 = cx - off; ey1 = cy + off; ex2 = cx + off; ey2 = cy + off; break;
                    case 'left': ex1 = cx - off; ey1 = cy - off; ex2 = cx - off; ey2 = cy + off; break;
                    case 'right': ex1 = cx + off; ey1 = cy - off; ex2 = cx + off; ey2 = cy + off; break;
                }
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.arc(ex1, ey1, eyeR, 0, 2 * Math.PI); ctx.fill();
                ctx.beginPath(); ctx.arc(ex2, ey2, eyeR, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = '#7f0000';
                ctx.beginPath(); ctx.arc(ex1, ey1, 1.2, 0, 2 * Math.PI); ctx.fill();
                ctx.beginPath(); ctx.arc(ex2, ey2, 1.2, 0, 2 * Math.PI); ctx.fill();
            }
        }

        if (gameState !== STATE.PLAYING) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }
        if (gameState === STATE.OVER) {
            if (isNewHighScore) {
                drawOverlayText('👑 新纪录！', '#ff6f00', 38);
                ctx.font = 'bold 24px "Segoe UI", "Microsoft YaHei", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#4a5568';
                ctx.fillText(`最高分: ${highScore}`, CANVAS_W / 2, CANVAS_H / 2 + 50);
            } else {
                drawOverlayText('💀 Game Over', '#c62828', 42);
            }
        } else if (gameState === STATE.WIN) drawOverlayText('🎉 You Win!', '#6a1b9a', 42);
        else if (gameState === STATE.PAUSED) drawOverlayText('⏸ 已暂停', '#f57f17', 38);
        else if (gameState === STATE.IDLE) drawOverlayText('按「开始」或空格', '#4a5568', 28);
    }

    function drawOverlayText(text, color, fontSize) {
        ctx.font = `bold ${fontSize}px "Segoe UI", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);
        ctx.shadowBlur = 0;
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // ---------- 控制 ----------
    function setDirection(newDir) {
        if (gameState !== STATE.PLAYING) return;
        if (newDir === OPPOSITE[direction]) return;
        nextDirection = newDir;
    }

    function toggleStart() {
        if (gameState === STATE.PLAYING) return;
        if (gameState === STATE.PAUSED) { setGameState(STATE.PLAYING); return; }
        initSnake();
        score = 0;
        foodCounts = { green: 0, blue: 0, purple: 0, gold: 0 };
        fullUpdate();
        if (!spawnFood()) { resetGame(); return; }
        setGameState(STATE.PLAYING);
        drawCanvas();
    }

    function togglePause() {
        if (gameState === STATE.PLAYING) setGameState(STATE.PAUSED);
        else if (gameState === STATE.PAUSED) setGameState(STATE.PLAYING);
    }

    // ---------- 键盘 ----------
    function onKeyDown(e) {
        const key = e.key;
        const dirMap = {
            'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
            'w': 'up', 'W': 'up', 's': 'down', 'S': 'down', 'a': 'left', 'A': 'left', 'd': 'right', 'D': 'right',
        };
        if (dirMap[key]) { e.preventDefault(); setDirection(dirMap[key]); return; }
        if (key === ' ' || key === 'Space') {
            e.preventDefault();
            if (gameState === STATE.IDLE || gameState === STATE.OVER || gameState === STATE.WIN) toggleStart();
            else if (gameState === STATE.PLAYING || gameState === STATE.PAUSED) togglePause();
            return;
        }
        if (key === 'Enter') { e.preventDefault(); toggleStart(); }
    }

    // ---------- 自定义网格 ----------
    function applyCustomGrid() {
        let w = parseInt(gridWidthInput.value, 10);
        let h = parseInt(gridHeightInput.value, 10);
        if (isNaN(w) || w < 5) w = 5;
        if (isNaN(h) || h < 5) h = 5;
        if (w > 40) w = 40;
        if (h > 40) h = 40;
        gridWidthInput.value = w;
        gridHeightInput.value = h;

        GRID_COLS = w;
        GRID_ROWS = h;
        // 保持格子大小不变，只改变画布大小
        resizeCanvas();
        resetGame();
    }

    // ---------- 排行榜 ----------
    function loadLeaderboard() {
        try {
            const data = localStorage.getItem(LB_KEY);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    }

    function saveLeaderboard(list) {
        localStorage.setItem(LB_KEY, JSON.stringify(list));
    }

    function renderLeaderboard() {
        const list = loadLeaderboard();
        if (list.length === 0) {
            lbEntries.innerHTML = '<div class="lb-empty">暂无记录<br>≥500 分可上榜</div>';
            return;
        }
        let html = '';
        list.forEach((entry, idx) => {
            const rank = idx + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'gold';
            else if (rank === 2) rankClass = 'silver';
            else if (rank === 3) rankClass = 'bronze';
            const name = entry.name || '玩家';
            html += `<div class="lb-entry">
                        <span class="rank ${rankClass}">#${rank}</span>
                        <span class="name">${name}</span>
                        <span class="lb-score">${entry.score}</span>
                    </div>`;
        });
        lbEntries.innerHTML = html;
    }

    function tryAddToLeaderboard(finalScore) {
        if (finalScore < LB_MIN_SCORE) return false;
        const list = loadLeaderboard();
        // 检查是否已有相同分数和默认名字
        if (list.some(e => e.score === finalScore)) return false;
        // 如果已有10条且比最低分还低，不入榜
        if (list.length >= LB_MAX && finalScore <= list[list.length - 1].score) return false;

        // 弹出输入名字
        const name = prompt('🏆 新纪录！输入你的名字：', '玩家');
        if (!name || name.trim() === '') return false;

        list.push({ name: name.trim(), score: finalScore, date: new Date().toLocaleDateString() });
        list.sort((a, b) => b.score - a.score);
        if (list.length > LB_MAX) list.length = LB_MAX;
        saveLeaderboard(list);
        renderLeaderboard();
        return true;
    }

    // ---------- 规则弹窗 ----------
    function openRules() {
        rulesModal.classList.add('active');
    }

    function closeRules() {
        rulesModal.classList.remove('active');
    }

    // ---------- 事件绑定 ----------
    function bindEvents() {
        window.addEventListener('keydown', onKeyDown);

        startBtn.addEventListener('click', toggleStart);
        pauseBtn.addEventListener('click', togglePause);
        replayBtn.addEventListener('click', () => { resetGame(); toggleStart(); });

        difficultySelect.addEventListener('change', () => {
            if (!difficultyLocked) {
                applyDifficulty();
            }
        });

        // 自定义网格
        applyGridBtn.addEventListener('click', applyCustomGrid);

        // 规则弹窗
        rulesBtn.addEventListener('click', openRules);
        rulesCloseBtn.addEventListener('click', closeRules);
        rulesModal.addEventListener('click', (e) => {
            if (e.target === rulesModal) closeRules();
        });

        document.querySelectorAll('.mobile-btn[data-dir]').forEach(btn => {
            btn.addEventListener('click', () => {
                const dir = btn.dataset.dir;
                setDirection(dir);
                if (gameState === STATE.IDLE || gameState === STATE.OVER || gameState === STATE.WIN) toggleStart();
            });
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const dir = btn.dataset.dir;
                setDirection(dir);
                if (gameState === STATE.IDLE || gameState === STATE.OVER || gameState === STATE.WIN) toggleStart();
            });
        });
    }

    // ---------- 适配 ----------
    function fitCanvas() {
        const glass = canvas.parentElement;
        const maxW = glass.clientWidth - 40;
        if (maxW < CANVAS_W) {
            canvas.style.width = maxW + 'px';
            canvas.style.height = (maxW * (CANVAS_H / CANVAS_W)) + 'px';
        } else {
            canvas.style.width = CANVAS_W + 'px';
            canvas.style.height = CANVAS_H + 'px';
        }
    }

    // 面板高度由 CSS align-items: stretch 自动匹配

    // ---------- 启动 ----------
    function init() {
        applyDifficulty();
        resizeCanvas();
        resetGame();
        bindEvents();
        renderLeaderboard();
        window.addEventListener('resize', () => {
            fitCanvas();
        });
    }

    init();
})();
