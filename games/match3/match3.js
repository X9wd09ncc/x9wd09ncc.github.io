// 消消乐核心逻辑（星星版）
(function () {
    // 配置
    let SIZE = 8;           // 默认 8x8，可动态修改
    let CELL_SIZE = 0;      // 动态计算
    const TYPES = 6;        // 6种星星颜色
    const BASE_SCORE = 10;

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreSpan = document.getElementById('score');
    const bestSpan = document.getElementById('bestScore');
    const timerSpan = document.getElementById('timer');

    const gameOverModal = document.getElementById('gameOverModal');
    const rulesModal = document.getElementById('rulesModal');
    const finalScoreSpan = document.getElementById('finalScore');

    // 星星颜色
    const COLORS = [
        '#FF5252', // 红
        '#FFB74D', // 橙
        '#FFEB3B', // 黄
        '#66BB6A', // 绿
        '#42A5F5', // 蓝
        '#AB47BC'  // 紫
    ];

    // 游戏状态
    let grid = [];
    let score = 0;
    let bestScore = localStorage.getItem('match3BestScore') || 0;
    let timeLeft = 60;
    let timerInterval = null;
    let isGameRunning = false;
    let isPaused = false;
    let isGameOverFlag = false;
    let pauseOverlay = null;

    let selectedRow = -1;
    let selectedCol = -1;
    let isProcessing = false;

    // 点击特效
    let clickEffect = { active: false, x: 0, y: 0 };

    bestSpan.innerText = bestScore;

    // 更新画布尺寸
    function updateCanvasSize() {
        const maxSize = Math.min(400, window.innerWidth - 200);
        CELL_SIZE = Math.floor(maxSize / SIZE);
        canvas.width = SIZE * CELL_SIZE;
        canvas.height = SIZE * CELL_SIZE;
        draw();
    }

    // 初始化网格
    function initGrid() {
        grid = Array(SIZE).fill().map(() => Array(SIZE).fill(0));
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                grid[row][col] = Math.floor(Math.random() * TYPES);
            }
        }
        while (scanAndClear().length > 0) {
            dropAndFill();
        }
    }

    function scanAndClear() {
        const toClear = [];

        for (let row = 0; row < SIZE; row++) {
            let length = 1;
            for (let col = 1; col < SIZE; col++) {
                if (grid[row][col] === grid[row][col - 1]) {
                    length++;
                } else {
                    if (length >= 3) {
                        for (let i = col - length; i < col; i++) {
                            toClear.push({ row, col: i });
                        }
                    }
                    length = 1;
                }
            }
            if (length >= 3) {
                for (let i = SIZE - length; i < SIZE; i++) {
                    toClear.push({ row, col: i });
                }
            }
        }

        for (let col = 0; col < SIZE; col++) {
            let length = 1;
            for (let row = 1; row < SIZE; row++) {
                if (grid[row][col] === grid[row - 1][col]) {
                    length++;
                } else {
                    if (length >= 3) {
                        for (let i = row - length; i < row; i++) {
                            toClear.push({ row: i, col });
                        }
                    }
                    length = 1;
                }
            }
            if (length >= 3) {
                for (let i = SIZE - length; i < SIZE; i++) {
                    toClear.push({ row: i, col });
                }
            }
        }

        if (toClear.length > 0) {
            for (const pos of toClear) {
                if (grid[pos.row][pos.col] !== -1) {
                    grid[pos.row][pos.col] = -1;
                }
            }
            const addScore = toClear.length * BASE_SCORE;
            score += addScore;
            updateScoreUI();
        }

        return toClear;
    }

    function dropAndFill() {
        for (let col = 0; col < SIZE; col++) {
            const columnValues = [];
            for (let row = SIZE - 1; row >= 0; row--) {
                if (grid[row][col] !== -1) {
                    columnValues.push(grid[row][col]);
                }
            }
            while (columnValues.length < SIZE) {
                columnValues.push(Math.floor(Math.random() * TYPES));
            }
            for (let row = SIZE - 1; row >= 0; row--) {
                grid[row][col] = columnValues[SIZE - 1 - row];
            }
        }
    }

    function settleMatches() {
        return new Promise((resolve) => {
            function step() {
                const matches = scanAndClear();
                if (matches.length === 0) {
                    resolve();
                    return;
                }
                draw();
                setTimeout(() => {
                    dropAndFill();
                    draw();
                    setTimeout(step, 80);
                }, 100);
            }
            step();
        });
    }

    async function swapAndMatch(row1, col1, row2, col2) {
        if (isProcessing || !isGameRunning || isPaused) return false;
        if (Math.abs(row1 - row2) + Math.abs(col1 - col2) !== 1) return false;

        isProcessing = true;

        const temp = grid[row1][col1];
        grid[row1][col1] = grid[row2][col2];
        grid[row2][col2] = temp;
        draw();

        const matches = scanAndClear();
        if (matches.length === 0) {
            const tempBack = grid[row1][col1];
            grid[row1][col1] = grid[row2][col2];
            grid[row2][col2] = tempBack;
            draw();
            isProcessing = false;
            return false;
        }

        await settleMatches();
        isProcessing = false;
        return true;
    }

    // 绘制星星（不占满格子，带高光）
    function drawStar(x, y, size, color, isSelected = false) {
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const outerR = size * 0.35;
        const innerR = size * 0.15;
        const points = 5;
        let angle = -Math.PI / 2;

        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const px = centerX + Math.cos(angle) * r;
            const py = centerY + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
            angle += Math.PI / points;
        }
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();

        // 高光
        ctx.beginPath();
        ctx.arc(centerX - size * 0.08, centerY - size * 0.08, size * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();

        // 选中特效：外发光 + 旋转动画
        if (isSelected) {
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffd966';
            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const r = i % 2 === 0 ? outerR + 3 : innerR + 3;
                const px = centerX + Math.cos(angle + Date.now() / 500) * r;
                const py = centerY + Math.sin(angle + Date.now() / 500) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
                angle += Math.PI / points;
            }
            ctx.strokeStyle = '#ffd966';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 绘制网格背景
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                const x = col * CELL_SIZE;
                const y = row * CELL_SIZE;
                const type = grid[row][col];

                // 绘制网格线
                ctx.strokeStyle = '#1a1a3a';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

                if (type !== -1) {
                    const isSelected = (selectedRow === row && selectedCol === col && isGameRunning && !isPaused);
                    drawStar(x, y, CELL_SIZE, COLORS[type], isSelected);
                }
            }
        }

        // 点击特效
        if (clickEffect.active) {
            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ffd966';
            ctx.beginPath();
            ctx.arc(clickEffect.x, clickEffect.y, 25, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 217, 102, 0.4)';
            ctx.fill();
            ctx.restore();
            setTimeout(() => { clickEffect.active = false; draw(); }, 200);
        }

        // 倒计时警告
        if (timeLeft <= 10 && timeLeft > 0 && isGameRunning && !isPaused) {
            ctx.font = 'bold 30px system-ui';
            ctx.fillStyle = '#ff5252';
            ctx.shadowBlur = 10;
            ctx.fillText(`${timeLeft}`, canvas.width - 50, 45);
            ctx.shadowBlur = 0;
        }

        if (isGameOverFlag) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    // 游戏控制
    function startGame() {
        if (timerInterval) clearInterval(timerInterval);

        initGrid();
        score = 0;
        timeLeft = 60;
        isGameRunning = true;
        isGameOverFlag = false;
        isPaused = false;
        selectedRow = -1;
        selectedCol = -1;
        isProcessing = false;

        if (pauseOverlay) {
            pauseOverlay.remove();
            pauseOverlay = null;
        }

        updateScoreUI();
        timerSpan.innerText = timeLeft;

        timerInterval = setInterval(() => {
            if (isGameRunning && !isPaused && !isGameOverFlag && timeLeft > 0) {
                timeLeft--;
                timerSpan.innerText = timeLeft;
                draw();
                if (timeLeft <= 0) gameOver();
            }
        }, 1000);

        draw();
    }

    function gameOver() {
        if (timerInterval) clearInterval(timerInterval);
        isGameRunning = false;
        isGameOverFlag = true;
        finalScoreSpan.innerText = score;
        gameOverModal.style.display = 'flex';
        draw();
    }

    function resetGame() {
        if (timerInterval) clearInterval(timerInterval);
        startGame();
    }

    function pauseGame() {
        if (!isGameRunning || isGameOverFlag) return;
        isPaused = true;
        isGameRunning = false;
        if (pauseOverlay) pauseOverlay.remove();
        pauseOverlay = document.createElement('div');
        pauseOverlay.className = 'pause-overlay';
        pauseOverlay.innerHTML = '<div class="pause-text">⏸ 暂停中</div>';
        document.querySelector('.game-area').appendChild(pauseOverlay);
        draw();
    }

    function resumeGame() {
        if (!isPaused || isGameOverFlag) return;
        isPaused = false;
        isGameRunning = true;
        if (pauseOverlay) {
            pauseOverlay.remove();
            pauseOverlay = null;
        }
        draw();
    }

    function updateScoreUI() {
        scoreSpan.innerText = score;
        if (score > bestScore) {
            bestScore = score;
            bestSpan.innerText = bestScore;
            localStorage.setItem('match3BestScore', bestScore);
        }
    }

    function setGridSize(size) {
        SIZE = size;
        updateCanvasSize();
        if (!isGameRunning && !isGameOverFlag) {
            initGrid();
            draw();
        } else {
            // 游戏中切换需要重置
            if (timerInterval) clearInterval(timerInterval);
            startGame();
        }
    }

    // 点击处理
    function getClickedCell(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
            e.preventDefault();
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        if (canvasX >= 0 && canvasX < canvas.width && canvasY >= 0 && canvasY < canvas.height) {
            const col = Math.floor(canvasX / CELL_SIZE);
            const row = Math.floor(canvasY / CELL_SIZE);
            return { row, col };
        }
        return null;
    }

    async function handleCanvasClick(e) {
        if (!isGameRunning || isPaused || isProcessing || isGameOverFlag) return;

        const cell = getClickedCell(e);
        if (!cell) return;

        const { row, col } = cell;
        const x = col * CELL_SIZE + CELL_SIZE / 2;
        const y = row * CELL_SIZE + CELL_SIZE / 2;
        clickEffect = { active: true, x, y };
        draw();

        if (selectedRow === -1) {
            selectedRow = row;
            selectedCol = col;
            draw();
        } else {
            const success = await swapAndMatch(selectedRow, selectedCol, row, col);
            selectedRow = -1;
            selectedCol = -1;
            draw();

            if (!success && isGameRunning && !isPaused) {
                // 无效交换提示
                const cx = col * CELL_SIZE + CELL_SIZE / 2;
                const cy = row * CELL_SIZE + CELL_SIZE / 2;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.beginPath();
                ctx.arc(cx, cy, 25, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = '24px system-ui';
                ctx.fillText('❌', cx - 12, cy + 8);
                setTimeout(() => draw(), 300);
            }
        }
    }

    // 事件绑定
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', handleCanvasClick, { passive: false });

    document.getElementById('startBtn').addEventListener('click', () => {
        if (isGameRunning && !isGameOverFlag && !isPaused) return;
        if (isPaused) resumeGame();
        else startGame();
    });

    document.getElementById('resetBtn').addEventListener('click', () => resetGame());
    document.getElementById('pauseBtn').addEventListener('click', () => {
        if (!isGameRunning || isGameOverFlag) return;
        if (isPaused) resumeGame();
        else pauseGame();
    });
    document.getElementById('rulesBtn').addEventListener('click', () => rulesModal.style.display = 'flex');

    // 网格大小切换
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const size = parseInt(btn.dataset.size);
            setGridSize(size);
        });
    });

    document.getElementById('modalRestartBtn').addEventListener('click', () => {
        gameOverModal.style.display = 'none';
        startGame();
    });

    document.querySelector('.close-rules').addEventListener('click', () => {
        rulesModal.style.display = 'none';
    });

    gameOverModal.addEventListener('click', (e) => {
        if (e.target === gameOverModal) {
            gameOverModal.style.display = 'none';
            startGame();
        }
    });

    rulesModal.addEventListener('click', (e) => {
        if (e.target === rulesModal) rulesModal.style.display = 'none';
    });

    window.addEventListener('resize', () => {
        updateCanvasSize();
        draw();
    });

    // 初始化
    updateCanvasSize();
    initGrid();
    draw();
})();