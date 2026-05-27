// 俄罗斯方块核心逻辑
(function () {
    // ---------- 游戏配置 ----------
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;
    const NEXT_SIZE = 24;

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('nextCanvas');
    const nextCtx = nextCanvas.getContext('2d');
    const scoreSpan = document.getElementById('score');
    const bestSpan = document.getElementById('bestScore');

    // 弹窗元素
    const gameOverModal = document.getElementById('gameOverModal');
    const rulesModal = document.getElementById('rulesModal');
    const finalScoreSpan = document.getElementById('finalScore');

    // 方块形状库
    const SHAPES = [
        { shape: [[1, 1, 1, 1]], color: '#00e5f0' },
        { shape: [[1, 1], [1, 1]], color: '#f0e45a' },
        { shape: [[0, 1, 0], [1, 1, 1]], color: '#c85be0' },
        { shape: [[0, 1, 1], [1, 1, 0]], color: '#5be07a' },
        { shape: [[1, 1, 0], [0, 1, 1]], color: '#e05b5b' },
        { shape: [[1, 0, 0], [1, 1, 1]], color: '#e09e5b' },
        { shape: [[0, 0, 1], [1, 1, 1]], color: '#5b8ce0' }
    ];

    // 游戏状态
    let grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let currentPiece = null;
    let currentX = 0, currentY = 0;
    let nextPiece = null;
    let score = 0;
    let bestScore = localStorage.getItem('tetrisBestScore') || 0;
    let gameInterval = null;
    let isGameRunning = false;   // 游戏是否进行中（未结束、未暂停）
    let isPaused = false;
    let isGameOverFlag = false;
    let pauseOverlay = null;

    bestSpan.innerText = bestScore;

    // ---------- 辅助函数 ----------
    function randomPiece() {
        const idx = Math.floor(Math.random() * SHAPES.length);
        const piece = SHAPES[idx];
        return {
            shape: piece.shape.map(row => [...row]),
            color: piece.color
        };
    }

    function spawnNewPiece() {
        if (!nextPiece) {
            nextPiece = randomPiece();
        }
        currentPiece = {
            shape: nextPiece.shape.map(row => [...row]),
            color: nextPiece.color
        };
        nextPiece = randomPiece();

        currentX = Math.floor((COLS - currentPiece.shape[0].length) / 2);
        currentY = 0;

        if (collision()) {
            gameOver();
            return false;
        }
        draw();
        drawNext();
        return true;
    }

    function collision() {
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col] !== 0) {
                    const newX = currentX + col;
                    const newY = currentY + row;
                    if (newX < 0 || newX >= COLS || newY >= ROWS || newY < 0) {
                        return true;
                    }
                    if (newY >= 0 && grid[newY][newX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function mergePiece() {
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col] !== 0) {
                    const y = currentY + row;
                    const x = currentX + col;
                    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
                        grid[y][x] = currentPiece.color;
                    }
                }
            }
        }
        clearLines();
        const success = spawnNewPiece();
        if (!success) return false;
        draw();
        return true;
    }

    function clearLines() {
        let linesCleared = 0;
        for (let row = ROWS - 1; row >= 0; row--) {
            let full = true;
            for (let col = 0; col < COLS; col++) {
                if (grid[row][col] === 0) {
                    full = false;
                    break;
                }
            }
            if (full) {
                for (let r = row; r > 0; r--) {
                    grid[r] = [...grid[r - 1]];
                }
                grid[0] = Array(COLS).fill(0);
                linesCleared++;
                row++;
            }
        }

        if (linesCleared > 0) {
            const points = [0, 100, 200, 400, 800];
            const addScore = points[Math.min(linesCleared, 4)];
            score += addScore;
            updateScoreUI();
        }
    }

    function updateScoreUI() {
        scoreSpan.innerText = score;
        if (score > bestScore) {
            bestScore = score;
            bestSpan.innerText = bestScore;
            localStorage.setItem('tetrisBestScore', bestScore);
        }
    }

    function movePiece(dx, dy) {
        if (!isGameRunning || isPaused) return false;

        currentX += dx;
        currentY += dy;
        if (collision()) {
            currentX -= dx;
            currentY -= dy;
            if (dy === 1) {
                const success = mergePiece();
                if (!success) return false;
            }
            return false;
        }
        draw();
        return true;
    }

    function rotatePiece() {
        if (!isGameRunning || isPaused) return;

        const oldShape = currentPiece.shape;
        const rotated = oldShape[0].map((_, idx) => oldShape.map(row => row[idx]).reverse());
        const originalShape = currentPiece.shape;
        currentPiece.shape = rotated;

        if (collision()) {
            currentPiece.shape = originalShape;
            currentX -= 1;
            if (!collision()) {
                draw();
                return;
            }
            currentX += 2;
            if (!collision()) {
                draw();
                return;
            }
            currentX -= 1;
        } else {
            draw();
        }
    }

    function hardDrop() {
        if (!isGameRunning || isPaused) return;

        while (!collision()) {
            currentY++;
        }
        currentY--;
        mergePiece();
        draw();
    }

    function gameOver() {
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }
        isGameRunning = false;
        isGameOverFlag = true;
        isPaused = false;

        // 显示自定义弹窗
        finalScoreSpan.innerText = score;
        gameOverModal.style.display = 'flex';

        draw();
    }

    // 暂停功能
    function pauseGame() {
        if (!isGameRunning || isGameOverFlag) return;

        isPaused = true;
        isGameRunning = false;

        // 添加暂停浮层
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

    function startGame() {
        // 重置所有状态
        if (gameInterval) {
            clearInterval(gameInterval);
        }

        grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        score = 0;
        isGameRunning = true;
        isGameOverFlag = false;
        isPaused = false;

        if (pauseOverlay) {
            pauseOverlay.remove();
            pauseOverlay = null;
        }

        updateScoreUI();

        nextPiece = randomPiece();
        spawnNewPiece();

        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(() => {
            if (isGameRunning && !isPaused && !isGameOverFlag) {
                movePiece(0, 1);
            }
        }, 400);

        draw();
    }

    function resetGame() {
        startGame();
    }

    // 弹窗关闭/开始新游戏
    function closeGameOverModal() {
        gameOverModal.style.display = 'none';
        startGame();
    }

    // 规则弹窗
    function showRules() {
        rulesModal.style.display = 'flex';
    }

    function closeRulesModal() {
        rulesModal.style.display = 'none';
    }

    // ---------- 绘制函数 ----------
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 网格线
        ctx.strokeStyle = '#2a2a4a';
        ctx.lineWidth = 0.5;
        for (let row = 0; row <= ROWS; row++) {
            ctx.beginPath();
            ctx.moveTo(0, row * BLOCK_SIZE);
            ctx.lineTo(canvas.width, row * BLOCK_SIZE);
            ctx.stroke();
        }
        for (let col = 0; col <= COLS; col++) {
            ctx.beginPath();
            ctx.moveTo(col * BLOCK_SIZE, 0);
            ctx.lineTo(col * BLOCK_SIZE, canvas.height);
            ctx.stroke();
        }

        // 固定方块
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (grid[row][col] !== 0) {
                    ctx.fillStyle = grid[row][col];
                    ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE - 1, 4);
                }
            }
        }

        // 当前方块
        if (currentPiece && !isGameOverFlag) {
            for (let row = 0; row < currentPiece.shape.length; row++) {
                for (let col = 0; col < currentPiece.shape[row].length; col++) {
                    if (currentPiece.shape[row][col]) {
                        const x = (currentX + col) * BLOCK_SIZE;
                        const y = (currentY + row) * BLOCK_SIZE;
                        ctx.fillStyle = currentPiece.color;
                        ctx.fillRect(x, y, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                        ctx.fillStyle = 'rgba(255,255,255,0.3)';
                        ctx.fillRect(x, y, BLOCK_SIZE - 1, 4);
                    }
                }
            }
        }

        // 游戏结束遮罩（防止弹窗前闪烁）
        if (isGameOverFlag) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    function drawNext() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        nextCtx.fillStyle = '#1a1a2e';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

        if (nextPiece) {
            const shape = nextPiece.shape;
            const color = nextPiece.color;
            const shapeCols = shape[0].length;
            const shapeRows = shape.length;
            const startX = (nextCanvas.width - shapeCols * NEXT_SIZE) / 2;
            const startY = (nextCanvas.height - shapeRows * NEXT_SIZE) / 2;

            for (let row = 0; row < shapeRows; row++) {
                for (let col = 0; col < shapeCols; col++) {
                    if (shape[row][col]) {
                        nextCtx.fillStyle = color;
                        nextCtx.fillRect(startX + col * NEXT_SIZE, startY + row * NEXT_SIZE, NEXT_SIZE - 1, NEXT_SIZE - 1);
                        nextCtx.fillStyle = 'rgba(255,255,255,0.2)';
                        nextCtx.fillRect(startX + col * NEXT_SIZE, startY + row * NEXT_SIZE, NEXT_SIZE - 1, 4);
                    }
                }
            }
        }
    }

    // ---------- 事件绑定 ----------
    document.getElementById('startBtn').addEventListener('click', () => {
        if (isGameRunning && !isGameOverFlag && !isPaused) return;
        if (isPaused) {
            resumeGame();
        } else {
            startGame();
        }
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        resetGame();
    });

    document.getElementById('pauseBtn').addEventListener('click', () => {
        if (!isGameRunning || isGameOverFlag) return;
        if (isPaused) {
            resumeGame();
        } else {
            pauseGame();
        }
    });

    document.getElementById('rulesBtn').addEventListener('click', showRules);

    // 操作按钮
    document.getElementById('leftBtn').addEventListener('click', () => movePiece(-1, 0));
    document.getElementById('rightBtn').addEventListener('click', () => movePiece(1, 0));
    document.getElementById('rotateBtn').addEventListener('click', () => rotatePiece());
    document.getElementById('downBtn').addEventListener('click', () => movePiece(0, 1));
    document.getElementById('dropBtn').addEventListener('click', () => hardDrop());

    // 弹窗按钮
    document.getElementById('modalRestartBtn').addEventListener('click', closeGameOverModal);
    document.querySelector('.close-rules').addEventListener('click', closeRulesModal);

    // 点击弹窗背景关闭
    gameOverModal.addEventListener('click', (e) => {
        if (e.target === gameOverModal) closeGameOverModal();
    });
    rulesModal.addEventListener('click', (e) => {
        if (e.target === rulesModal) closeRulesModal();
    });

    // 键盘控制
    window.addEventListener('keydown', (e) => {
        if (rulesModal.style.display === 'flex') return;

        switch (e.key) {
            case 'ArrowLeft': movePiece(-1, 0); break;
            case 'ArrowRight': movePiece(1, 0); break;
            case 'ArrowUp': rotatePiece(); break;
            case 'ArrowDown': movePiece(0, 1); break;
            case ' ': hardDrop(); e.preventDefault(); break;
            case 'Space': hardDrop(); e.preventDefault(); break;
            default: return;
        }
        e.preventDefault();
    });

    // 初始状态：不自动开始，显示待机画面
    isGameRunning = false;
    isGameOverFlag = false;
    isPaused = false;
    draw();
    drawNext();
})();