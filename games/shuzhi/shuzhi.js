(function () {
    // ---------- 动态游戏配置 ----------
    let GRID_SIZE = 10;
    let CELL_SIZE = 40;
    let PADDING_LEFT = 60;
    let PADDING_TOP = 60;
    let EXTRA_PADDING = 40;
    let CANVAS_WIDTH = 520;
    let CANVAS_HEIGHT = 520;

    // 颜色方案
    const COLORS = {
        bg: '#a8d5e5',
        canvasBg: '#fef9e6',
        gridLine: '#7f8c8d',
        circleNormal: '#b0bec5',
        circleFilled: '#2c3e2f',
        crossRed: '#d1453b',
        hintText: '#2d3e40',
        successMsgBg: '#b0d9b1',
        errorMsgBg: '#f4c2c2'
    };

    // 计时器
    let timerInterval = null;
    let seconds = 0;
    let timerRunning = false;

    // DOM 元素
    let canvas = document.getElementById('nonogramCanvas');
    let ctx = canvas.getContext('2d');
    const messageDiv = document.getElementById('messageBox');
    const timerDisplay = document.getElementById('timerDisplay');
    const difficultySelect = document.getElementById('difficultySelect');

    // 游戏数据
    let solution = [];
    let userGrid = [];
    let rowHints = [];
    let colHints = [];
    let answerReveal = false;
    let gameWon = false;
    let hintCount = 0;  // 提示次数（惩罚递增）

    // 消息
    let messageTimeout = null;

    // ---------- 尺寸计算 ----------
    function getCellSize(gridSize) {
        if (gridSize <= 5) return 60;
        if (gridSize <= 10) return 40;
        return 24;
    }

    function getPadding(gridSize) {
        if (gridSize <= 5) return { left: 50, top: 50, extra: 30 };
        if (gridSize <= 10) return { left: 60, top: 60, extra: 40 };
        return { left: 100, top: 100, extra: 20 };
    }

    function recalcDimensions() {
        const pad = getPadding(GRID_SIZE);
        PADDING_LEFT = pad.left;
        PADDING_TOP = pad.top;
        EXTRA_PADDING = pad.extra;
        CELL_SIZE = getCellSize(GRID_SIZE);
        CANVAS_WIDTH = PADDING_LEFT + GRID_SIZE * CELL_SIZE + EXTRA_PADDING;
        CANVAS_HEIGHT = PADDING_TOP + GRID_SIZE * CELL_SIZE + EXTRA_PADDING;
    }

    function setupCanvas() {
        recalcDimensions();
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
    }

    // ---------- 计时器 ----------
    function formatTime(sec) {
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        return `${m}:${s}`;
    }

    function updateTimerDisplay() {
        timerDisplay.textContent = `⏱️ ${formatTime(seconds)}`;
    }

    function startTimer() {
        if (timerRunning) return;
        timerRunning = true;
        timerInterval = setInterval(() => {
            seconds++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        timerRunning = false;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function resetTimer() {
        stopTimer();
        seconds = 0;
        updateTimerDisplay();
    }

    // ---------- 辅助函数 ----------
    function showMessage(msg, isSuccess = true) {
        if (messageTimeout) clearTimeout(messageTimeout);
        messageDiv.textContent = msg;
        messageDiv.classList.remove('success', 'error');
        if (isSuccess) {
            messageDiv.classList.add('success');
        } else {
            messageDiv.classList.add('error');
        }
        messageTimeout = setTimeout(() => {
            messageDiv.classList.remove('success', 'error');
        }, 1800);
    }

    // 从solution计算行列提示
    function calculateHintsFromSolution(sol) {
        let rowH = [], colH = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            let hints = [];
            let count = 0;
            for (let j = 0; j < GRID_SIZE; j++) {
                if (sol[i][j] === 1) {
                    count++;
                } else {
                    if (count > 0) { hints.push(count); count = 0; }
                }
            }
            if (count > 0) hints.push(count);
            if (hints.length === 0) hints = [0];
            rowH.push(hints);
        }
        for (let j = 0; j < GRID_SIZE; j++) {
            let hints = [];
            let count = 0;
            for (let i = 0; i < GRID_SIZE; i++) {
                if (sol[i][j] === 1) {
                    count++;
                } else {
                    if (count > 0) { hints.push(count); count = 0; }
                }
            }
            if (count > 0) hints.push(count);
            if (hints.length === 0) hints = [0];
            colH.push(hints);
        }
        return { rowH, colH };
    }

    // 获取当前难度对应的最大段数
    function getMaxSegments(gridSize) {
        if (gridSize <= 5) return 2;   // 5×5: 1~2 个数字
        if (gridSize <= 10) return 3;  // 10×10: 1~3 个数字
        return 5;                      // 20×20: 1~5 个数字
    }

    // 计算某行/列的段数
    function countSegments(arr) {
        let count = 0, inSeg = false;
        for (let k = 0; k < arr.length; k++) {
            if (arr[k] === 1 && !inSeg) { count++; inSeg = true; }
            else if (arr[k] === 0) inSeg = false;
        }
        return count;
    }

    // 用分段法生成一行（给定段数和长度，返回填充数组）
    function generateSegmentedRow(length, segments, maxLen) {
        let totalBlocks = 0;
        let lengths = [];
        for (let s = 0; s < segments; s++) {
            let remaining = length - totalBlocks - (segments - s - 1);
            if (remaining < 1) break;
            let maxAllowed = maxLen ? Math.min(maxLen, remaining) : remaining;
            let len = Math.floor(Math.random() * maxAllowed) + 1;
            lengths.push(len);
            totalBlocks += len;
        }
        if (totalBlocks > length || lengths.length === 0) return null;
        let gaps = length - totalBlocks;
        let gArr = Array(lengths.length + 1).fill(0);
        for (let g = 0; g < gaps; g++) gArr[Math.floor(Math.random() * gArr.length)]++;
        let vals = [];
        for (let s = 0; s < lengths.length; s++) {
            for (let g = 0; g < gArr[s]; g++) vals.push(0);
            for (let l = 0; l < lengths[s]; l++) vals.push(1);
        }
        for (let g = 0; g < gArr[lengths.length]; g++) vals.push(0);
        while (vals.length < length) vals.push(0);
        return vals.slice(0, length);
    }

    // ---- 分块均衡生成（用于 20×20） ----
    // 将网格分成 5×5 个块，每个块一致填充/空白
    // 这样行列段数天然都在 1~5 之间
    function generateBlockSolution(size, maxSeg) {
        const blockCount = 5;
        const blockSize = size / blockCount;
        const maxAttempts = 500;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let blockGrid = Array(blockCount).fill().map(() => Array(blockCount).fill(0));

            // 在块级别上生成行
            for (let bi = 0; bi < blockCount; bi++) {
                let segments = Math.floor(Math.random() * maxSeg) + 1;
                let row = generateSegmentedRow(blockCount, segments, 3);
                if (row) blockGrid[bi] = row;
            }

            // 验证块的列段数
            let ok = true;
            for (let bj = 0; bj < blockCount; bj++) {
                let col = blockGrid.map(r => r[bj]);
                let segs = countSegments(col);
                if (segs < 1 || segs > maxSeg + 1) { ok = false; break; }
            }
            if (!ok) continue;

            // 展开到完整网格，每个块内加少量随机扰动增加趣味
            // 块越大扰动比例越高，避免小块被过度打乱
            let noiseLevel = blockSize >= 4 ? 0.15 : 0.10;
            let full = Array(size).fill().map(() => Array(size).fill(0));
            for (let i = 0; i < size; i++) {
                let bi = Math.floor(i / blockSize);
                for (let j = 0; j < size; j++) {
                    let bj = Math.floor(j / blockSize);
                    let base = blockGrid[bi][bj];
                    full[i][j] = (Math.random() < 1 - noiseLevel) ? base : (1 - base);
                }
            }

            // 再次验证行列段数仍在合理范围
            let valid = true;
            for (let i = 0; i < size; i++) {
                let segs = countSegments(full[i]);
                if (segs < 1 || segs > maxSeg + 2) { valid = false; break; }
            }
            if (!valid) continue;
            for (let j = 0; j < size; j++) {
                let col = full.map(r => r[j]);
                let segs = countSegments(col);
                let colSum = col.reduce((a, b) => a + b, 0);
                if (colSum === 0 || colSum === size) { valid = false; break; }
                if (segs < 1 || segs > maxSeg + 2) { valid = false; break; }
            }
            if (valid) return full;
        }

        // 保底：棋盘格
        let f = Array(size).fill().map(() => Array(size).fill(0));
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                f[i][j] = (i + j) % 2;
            }
        }
        return f;
    }

    // ---- 逐行生成 + 列验证（用于 5×5 和 10×10） ----
    function generateRowBasedSolution(size, maxSeg) {
        const maxAttempts = 800;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let tempSol = Array(size).fill().map(() => Array(size).fill(0));
            let rowSegCounts = [];
            for (let row = 0; row < size; row++) {
                rowSegCounts.push(Math.floor(Math.random() * maxSeg) + 1);
            }
            for (let row = 0; row < size; row++) {
                let rowVals = generateSegmentedRow(size, rowSegCounts[row]);
                if (rowVals) tempSol[row] = rowVals;
            }
            // 验证列段数
            let valid = true;
            for (let j = 0; j < size; j++) {
                let col = tempSol.map(r => r[j]);
                let colSum = col.reduce((a, b) => a + b, 0);
                if (colSum === 0 || colSum === size) { valid = false; break; }
                let segs = countSegments(col);
                if (segs < 1 || segs > maxSeg + 1) { valid = false; break; }
            }
            if (valid) return tempSol;
        }
        return null;
    }

    // 随机生成谜题（自动选择生成策略）
    function generateRandomSolution() {
        const maxSeg = getMaxSegments(GRID_SIZE);

        // 10×10 及以上用分块均衡生成（行列段数天然平衡）
        if (GRID_SIZE >= 10) {
            return generateBlockSolution(GRID_SIZE, maxSeg);
        }

        // 5×5 用逐行生成+列验证
        let sol = generateRowBasedSolution(GRID_SIZE, maxSeg);
        if (sol) return sol;

        // 保底方案
        let fallback = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                if ((i + j) % 3 === 0 || (i === j) || (i + j === GRID_SIZE - 1)) {
                    if (Math.random() > 0.4) fallback[i][j] = 1;
                }
            }
        }
        return fallback;
    }

    // ---------- 核心游戏函数 ----------
    function initGame() {
        setupCanvas();
        const newSolution = generateRandomSolution();
        solution = newSolution.map(row => [...row]);
        const { rowH, colH } = calculateHintsFromSolution(solution);
        rowHints = rowH;
        colHints = colH;
        userGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
        answerReveal = false;
        gameWon = false;
        hintCount = 0;
        drawCanvas();
        resetTimer();
        startTimer();
    }

    function resetGame() {
        initGame();
        showMessage('新的一局！加油 🎮', true);
    }

    function showAnswer() {
        answerReveal = true;
        drawCanvas();
        showMessage('已显示答案 — 红色x为错误，红圈为漏填', false);
    }

    function checkWin() {
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                if (userGrid[i][j] === 1 && solution[i][j] !== 1) {
                    showMessage('❌ 答案错误，继续努力！', false);
                    return;
                }
                if ((userGrid[i][j] === 0 || userGrid[i][j] === 2) && solution[i][j] === 1) {
                    showMessage('❌ 答案错误，继续努力！', false);
                    return;
                }
            }
        }
        if (!gameWon) {
            gameWon = true;
            stopTimer();
        }
        showMessage('🎉 完美！答案正确！ 🎉', true);
    }

    // ---------- 提示功能 ----------
    function giveHint() {
        if (answerReveal) {
            showMessage('请先关闭答案模式', false);
            return;
        }
        if (gameWon) {
            showMessage('游戏已通关，无需提示 🎉', true);
            return;
        }
        // 收集所有答案中为1但用户未填充的格子
        let candidates = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                if (solution[i][j] === 1 && userGrid[i][j] !== 1) {
                    candidates.push({ row: i, col: j });
                }
            }
        }
        if (candidates.length === 0) {
            showMessage('所有正确格子已填充！', true);
            return;
        }
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        userGrid[pick.row][pick.col] = 1;
        drawCanvas();

        // 时间惩罚：每次递增 +5s
        hintCount++;
        const penalty = hintCount * 5;
        seconds += penalty;
        updateTimerDisplay();
        showMessage(`💡 提示 ${pick.row + 1},${pick.col + 1}  ⏱️ +${penalty}秒`, false);
    }

    // ---------- 难度切换 ----------
    function applyDifficulty() {
        const val = parseInt(difficultySelect.value, 10);
        GRID_SIZE = val;
        answerReveal = false;
        gameWon = false;
        initGame();
        showMessage(`已切换至 ${GRID_SIZE}×${GRID_SIZE} 难度`, true);
    }

    // ---------- 画图核心 ----------
    function drawCanvas() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 画网格线
        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 1.2;
        for (let i = 0; i <= GRID_SIZE; i++) {
            const x = PADDING_LEFT + i * CELL_SIZE;
            const yTop = PADDING_TOP;
            const yBottom = PADDING_TOP + GRID_SIZE * CELL_SIZE;
            ctx.beginPath();
            ctx.moveTo(x, yTop);
            ctx.lineTo(x, yBottom);
            ctx.stroke();

            const y = PADDING_TOP + i * CELL_SIZE;
            ctx.beginPath();
            ctx.moveTo(PADDING_LEFT, y);
            ctx.lineTo(PADDING_LEFT + GRID_SIZE * CELL_SIZE, y);
            ctx.stroke();
        }

        // 绘制行提示 (左侧)
        const minFontSize = GRID_SIZE <= 10 ? 10 : 9;
        const fontSize = Math.max(minFontSize, Math.floor(CELL_SIZE * 0.32));
        ctx.font = `bold ${fontSize}px "Segoe UI", "Microsoft YaHei"`;
        ctx.fillStyle = COLORS.hintText;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        const hintStep = GRID_SIZE <= 5 ? 28 : GRID_SIZE <= 10 ? 22 : 16;
        for (let i = 0; i < GRID_SIZE; i++) {
            const hints = rowHints[i];
            const y = PADDING_TOP + i * CELL_SIZE + CELL_SIZE / 2;
            let xPos = PADDING_LEFT - 12;
            for (let k = hints.length - 1; k >= 0; k--) {
                ctx.fillText(hints[k].toString(), xPos, y);
                xPos -= hintStep;
                if (xPos < 6) break;
            }
        }

        // 列提示 (顶部)
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const colHintStep = GRID_SIZE <= 5 ? 24 : GRID_SIZE <= 10 ? 18 : 14;
        for (let j = 0; j < GRID_SIZE; j++) {
            const hints = colHints[j];
            const x = PADDING_LEFT + j * CELL_SIZE + CELL_SIZE / 2;
            let yPos = PADDING_TOP - 10;
            for (let k = hints.length - 1; k >= 0; k--) {
                ctx.fillText(hints[k].toString(), x, yPos);
                yPos -= colHintStep;
                if (yPos < 6) break;
            }
        }

        // 绘制格子内容
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                const cx = PADDING_LEFT + j * CELL_SIZE + CELL_SIZE / 2;
                const cy = PADDING_TOP + i * CELL_SIZE + CELL_SIZE / 2;
                const radius = CELL_SIZE * 0.28;
                const isUserFilled = (userGrid[i][j] === 1);
                const isUserCross = (userGrid[i][j] === 2);
                const isCorrect = (solution[i][j] === 1);

                if (answerReveal) {
                    if (userGrid[i][j] === 1 && !isCorrect) {
                        drawCross(cx, cy, radius);
                    } else if ((userGrid[i][j] !== 1) && isCorrect) {
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius + 2, 0, 2 * Math.PI);
                        ctx.strokeStyle = COLORS.crossRed;
                        ctx.lineWidth = 2.5;
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius - 1, 0, 2 * Math.PI);
                        ctx.fillStyle = COLORS.crossRed;
                        ctx.fill();
                    } else if (isUserFilled) {
                        drawFilledCircle(cx, cy, radius);
                    } else if (isUserCross) {
                        drawCross(cx, cy, radius);
                    } else {
                        drawEmptyCircle(cx, cy, radius);
                    }
                } else {
                    if (isUserFilled) {
                        drawFilledCircle(cx, cy, radius);
                    } else if (isUserCross) {
                        drawCross(cx, cy, radius);
                    } else {
                        drawEmptyCircle(cx, cy, radius);
                    }
                }
            }
        }
    }

    function drawFilledCircle(x, y, r) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = COLORS.circleFilled;
        ctx.fill();
    }

    function drawEmptyCircle(x, y, r) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.strokeStyle = COLORS.circleNormal;
        ctx.lineWidth = 1.8;
        ctx.stroke();
    }

    function drawCross(x, y, r) {
        drawEmptyCircle(x, y, r);
        ctx.beginPath();
        const offset = r * 0.7;
        ctx.moveTo(x - offset, y - offset);
        ctx.lineTo(x + offset, y + offset);
        ctx.moveTo(x + offset, y - offset);
        ctx.lineTo(x - offset, y + offset);
        ctx.strokeStyle = COLORS.crossRed;
        ctx.lineWidth = 2.2;
        ctx.stroke();
    }

    // 获取点击的格子坐标
    function getGridFromClick(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        if (canvasX < PADDING_LEFT || canvasY < PADDING_TOP) return null;
        const col = Math.floor((canvasX - PADDING_LEFT) / CELL_SIZE);
        const row = Math.floor((canvasY - PADDING_TOP) / CELL_SIZE);
        if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) return { row, col };
        return null;
    }

    // 鼠标/触摸事件处理
    function handleCanvasClick(e, isRightClick = false) {
        e.preventDefault();
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        const pos = getGridFromClick(clientX, clientY);
        if (!pos) return;
        const { row, col } = pos;
        if (answerReveal) {
            showMessage('请先关闭答案模式，点击"新游戏"或刷新', false);
            return;
        }
        if (isRightClick) {
            if (userGrid[row][col] === 2) userGrid[row][col] = 0;
            else if (userGrid[row][col] === 0) userGrid[row][col] = 2;
            else if (userGrid[row][col] === 1) userGrid[row][col] = 2;
            drawCanvas();
        } else {
            if (userGrid[row][col] === 1) userGrid[row][col] = 0;
            else userGrid[row][col] = 1;
            drawCanvas();
        }
    }

    // 绑定事件
    function bindEvents() {
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                handleCanvasClick(e, false);
            } else if (e.button === 2) {
                handleCanvasClick(e, true);
            }
            e.preventDefault();
        });
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleCanvasClick(e, false);
        });

        document.getElementById('hintBtn').addEventListener('click', () => giveHint());
        document.getElementById('resetBtn').addEventListener('click', () => resetGame());
        document.getElementById('answerBtn').addEventListener('click', () => showAnswer());
        document.getElementById('checkBtn').addEventListener('click', () => checkWin());

        difficultySelect.addEventListener('change', () => applyDifficulty());
    }

    // 启动游戏
    function startGame() {
        setupCanvas();
        initGame();
        bindEvents();
    }

    startGame();
})();