/* ==============================================
   2048 网页版游戏 - 核心逻辑
   ============================================== */

(function () {
    'use strict';

    // ===== DOM 引用 =====
    const gridContainer = document.getElementById('gridContainer');
    const gridBg = document.getElementById('gridBg');
    const tileContainer = document.getElementById('tileContainer');
    const scoreEl = document.getElementById('score');
    const bestScoreEl = document.getElementById('bestScore');
    const newGameBtn = document.getElementById('newGameBtn');
    const rulesBtn = document.getElementById('rulesBtn');
    const rulesModal = document.getElementById('rulesModal');
    const closeRules = document.getElementById('closeRules');
    const gameOverlay = document.getElementById('gameOverlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlayScore = document.getElementById('overlayScore');
    const overlayBtn = document.getElementById('overlayBtn');
    const continueBtn = document.getElementById('continueBtn');
    const gridSizeSlider = document.getElementById('gridSizeSlider');
    const gridSizeDisplay = document.getElementById('gridSizeDisplay');
    const gridSizeDisplay2 = document.getElementById('gridSizeDisplay2');

    // ===== 游戏状态 =====
    const STATE = {
        PLAYING: 'playing',
        WON: 'won',
        LOST: 'lost'
    };

    let board = [];           // 二维数组，存储各格子数值
    let size = 4;            // 网格大小
    let score = 0;
    let bestScore = 0;
    let gameState = STATE.PLAYING;
    let tiles = [];          // 存储当前方块DOM元素引用，用于复用
    let isAnimating = false;

    // 历史记录（撤销用）
    let history = [];
    const MAX_HISTORY = 10;

    // 触摸状态
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouching = false;

    // ===== 工具函数 =====
    function getEmptyCells() {
        const empty = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === 0) {
                    empty.push({ r, c });
                }
            }
        }
        return empty;
    }

    function hasEmptyCell() {
        return getEmptyCells().length > 0;
    }

    function cloneBoard(src) {
        return src.map(row => [...row]);
    }

    // ===== 本地存储 =====
    function getBestScoreKey(s) {
        return '2048_bestScore_' + s + 'x' + s;
    }

    function loadBestScore(s) {
        try {
            const saved = localStorage.getItem(getBestScoreKey(s));
            return saved ? parseInt(saved, 10) : 0;
        } catch (e) {
            return 0;
        }
    }

    function saveBestScore(s, val) {
        try {
            localStorage.setItem(getBestScoreKey(s), String(val));
        } catch (e) {
            // 忽略存储错误
        }
    }

    function loadGameState() {
        try {
            const savedSize = localStorage.getItem('2048_size');
            if (savedSize) size = Math.max(4, Math.min(10, parseInt(savedSize, 10) || 4));
            gridSizeSlider.value = size;
            gridSizeDisplay.textContent = size;
            gridSizeDisplay2.textContent = size;

            const savedGrid = localStorage.getItem('2048_board');
            const savedScore = localStorage.getItem('2048_score');
            const savedState = localStorage.getItem('2048_gameState');

            if (savedGrid && savedScore && savedState) {
                const parsed = JSON.parse(savedGrid);
                if (parsed.length === size && parsed[0].length === size) {
                    board = parsed;
                    score = parseInt(savedScore, 10) || 0;
                    gameState = savedState;
                    return true;
                }
            }
        } catch (e) {
            // 忽略，使用初始状态
        }
        return false;
    }

    function saveGameState() {
        try {
            localStorage.setItem('2048_board', JSON.stringify(board));
            localStorage.setItem('2048_score', String(score));
            localStorage.setItem('2048_gameState', gameState);
            localStorage.setItem('2048_size', String(size));
        } catch (e) {
            // 忽略存储错误
        }
    }

    // ===== 网格布局计算 =====
    function getGridLayout() {
        const gap = 8;
        // 计算容器尺寸：根据视口自适应
        const containerWidth = gridContainer.clientWidth || 500;
        const totalGap = (size + 1) * gap;
        const cellSize = (containerWidth - totalGap) / size;
        return { gap, cellSize, containerWidth };
    }

    function getTilePosition(row, col) {
        const { gap, cellSize } = getGridLayout();
        return {
            left: gap + col * (cellSize + gap),
            top: gap + row * (cellSize + gap),
            size: cellSize
        };
    }

    // ===== 渲染网格背景 =====
    function renderGridBg() {
        const { gap, cellSize, containerWidth } = getGridLayout();
        const gridSizePx = containerWidth;

        gridBg.style.width = gridSizePx + 'px';
        gridBg.style.height = gridSizePx + 'px';
        gridBg.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
        gridBg.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
        gridBg.style.gap = gap + 'px';
        gridBg.style.padding = gap + 'px';

        gridBg.innerHTML = '';
        for (let i = 0; i < size * size; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-bg-cell';
            gridBg.appendChild(cell);
        }

        // 设置容器高度
        gridContainer.style.paddingBottom = '0';
        gridContainer.style.height = gridSizePx + 'px';
    }

    // ===== 方块颜色 =====
    function getTileColor(value) {
        const colors = {
            0: { bg: 'transparent', color: 'transparent' },
            2: { bg: '#eee4da', color: '#776e65' },
            4: { bg: '#ede0c8', color: '#776e65' },
            8: { bg: '#f2b179', color: '#f9f6f2' },
            16: { bg: '#f59563', color: '#f9f6f2' },
            32: { bg: '#f67c5f', color: '#f9f6f2' },
            64: { bg: '#f65e3b', color: '#f9f6f2' },
            128: { bg: '#edcf72', color: '#f9f6f2' },
            256: { bg: '#edcc61', color: '#f9f6f2' },
            512: { bg: '#edc850', color: '#f9f6f2' },
            1024: { bg: '#edc53f', color: '#f9f6f2' },
            2048: { bg: '#edc22e', color: '#f9f6f2' },
            4096: { bg: '#3c3a32', color: '#f9f6f2' },
            8192: { bg: '#3c3a32', color: '#f9f6f2' }
        };

        const special = {
            2: { bg: '#eee4da', color: '#776e65' },
            4: { bg: '#ede0c8', color: '#776e65' },
            8: { bg: '#f2b179', color: '#f9f6f2' },
            16: { bg: '#f59563', color: '#f9f6f2' },
            32: { bg: '#f67c5f', color: '#f9f6f2' },
            64: { bg: '#f65e3b', color: '#f9f6f2' },
            128: { bg: '#edcf72', color: '#f9f6f2' },
            256: { bg: '#edcc61', color: '#f9f6f2' },
            512: { bg: '#edc850', color: '#f9f6f2' },
            1024: { bg: '#edc53f', color: '#f9f6f2' },
            2048: { bg: '#edc22e', color: '#f9f6f2' },
            4096: { bg: '#3c3a32', color: '#f9f6f2' },
            8192: { bg: '#3c3a32', color: '#f9f6f2' }
        };

        if (special[value]) return special[value];

        // 对于超过8192的值，生成渐变色
        if (value > 8192) {
            const exp = Math.floor(Math.log2(value));
            const hue = (exp * 10) % 360;
            const lightness = Math.max(30, 60 - exp * 2);
            return {
                bg: `hsl(${hue}, 70%, ${lightness}%)`,
                color: lightness > 50 ? '#776e65' : '#f9f6f2'
            };
        }

        return colors[value] || { bg: '#3c3a32', color: '#f9f6f2' };
    }

    function getTileFontSize(value) {
        const digits = String(value).length;
        if (size <= 5) {
            if (digits <= 2) return '32px';
            if (digits === 3) return '24px';
            if (digits === 4) return '18px';
            return '14px';
        } else if (size <= 7) {
            if (digits <= 2) return '24px';
            if (digits === 3) return '18px';
            if (digits === 4) return '14px';
            return '11px';
        } else {
            if (digits <= 2) return '18px';
            if (digits === 3) return '14px';
            if (digits === 4) return '11px';
            return '9px';
        }
    }

    // ===== 动画追踪 =====
    let pendingAnimations = [];

    function setPendingAnimations(newTile, mergedTiles) {
        pendingAnimations = [];
        if (newTile) {
            pendingAnimations.push({ row: newTile.r, col: newTile.c, type: 'new' });
        }
        if (mergedTiles) {
            mergedTiles.forEach(m => {
                pendingAnimations.push({ row: m.row, col: m.col, type: 'merged' });
            });
        }
    }

    // ===== 渲染方块 =====
    function renderTiles() {
        tileContainer.innerHTML = '';

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const value = board[r][c];
                if (value === 0) continue;

                const pos = getTilePosition(r, c);
                const colors = getTileColor(value);

                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.textContent = value;
                tile.style.width = pos.size + 'px';
                tile.style.height = pos.size + 'px';
                tile.style.left = pos.left + 'px';
                tile.style.top = pos.top + 'px';
                tile.style.backgroundColor = colors.bg;
                tile.style.color = colors.color;
                tile.style.fontSize = getTileFontSize(value);

                // 应用动画
                const anim = pendingAnimations.find(a => a.row === r && a.col === c);
                if (anim) {
                    if (anim.type === 'new') {
                        tile.classList.add('tile-new');
                    } else if (anim.type === 'merged') {
                        tile.classList.add('tile-merged');
                    }
                }

                tileContainer.appendChild(tile);
            }
        }
        pendingAnimations = [];
    }

    // ===== 核心算法：移动与合并 =====
    // 对单行/列进行操作（向左合并）
    function mergeLine(line) {
        let filtered = line.filter(v => v !== 0);
        let merged = [];
        let scoreGain = 0;
        // 记录合并发生的位置（在结果数组中的索引）
        let mergedPositions = [];

        for (let i = 0; i < filtered.length; i++) {
            if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
                const mergedValue = filtered[i] * 2;
                merged.push(mergedValue);
                scoreGain += mergedValue;
                mergedPositions.push(merged.length - 1);
                i++;
            } else {
                merged.push(filtered[i]);
            }
        }

        // 补0
        while (merged.length < line.length) {
            merged.push(0);
        }

        return { result: merged, scoreGain, mergedPositions };
    }

    // 获取某一行
    function getRow(board, r) {
        return [...board[r]];
    }

    // 获取某一列
    function getCol(board, c) {
        const col = [];
        for (let r = 0; r < size; r++) {
            col.push(board[r][c]);
        }
        return col;
    }

    // 设置某一行
    function setRow(board, r, row) {
        board[r] = [...row];
    }

    // 设置某一列
    function setCol(board, c, col) {
        for (let r = 0; r < size; r++) {
            board[r][c] = col[r];
        }
    }

    // 反转数组
    function reverse(arr) {
        return [...arr].reverse();
    }

    // ===== 移动方向处理（返回合并位置） =====
    function moveLeft() {
        let moved = false;
        let totalScore = 0;
        const newBoard = cloneBoard(board);
        const mergeTiles = []; // { row, col }

        for (let r = 0; r < size; r++) {
            const line = getRow(newBoard, r);
            const { result, scoreGain, mergedPositions } = mergeLine(line);
            if (result.join(',') !== line.join(',')) moved = true;
            totalScore += scoreGain;
            setRow(newBoard, r, result);

            // 记录合并位置
            mergedPositions.forEach(colIdx => {
                mergeTiles.push({ row: r, col: colIdx });
            });
        }

        return { board: newBoard, moved, scoreGain: totalScore, mergeTiles };
    }

    function moveRight() {
        let moved = false;
        let totalScore = 0;
        const newBoard = cloneBoard(board);
        const mergeTiles = [];

        for (let r = 0; r < size; r++) {
            const line = reverse(getRow(newBoard, r));
            const { result, scoreGain, mergedPositions } = mergeLine(line);
            const finalRow = reverse(result);
            if (finalRow.join(',') !== getRow(newBoard, r).join(',')) moved = true;
            totalScore += scoreGain;
            setRow(newBoard, r, finalRow);

            // 反转后的列索引：size - 1 - pos
            mergedPositions.forEach(colIdx => {
                mergeTiles.push({ row: r, col: size - 1 - colIdx });
            });
        }

        return { board: newBoard, moved, scoreGain: totalScore, mergeTiles };
    }

    function moveUp() {
        let moved = false;
        let totalScore = 0;
        const newBoard = cloneBoard(board);
        const mergeTiles = [];

        for (let c = 0; c < size; c++) {
            const line = getCol(newBoard, c);
            const { result, scoreGain, mergedPositions } = mergeLine(line);
            if (result.join(',') !== line.join(',')) moved = true;
            totalScore += scoreGain;
            setCol(newBoard, c, result);

            mergedPositions.forEach(rowIdx => {
                mergeTiles.push({ row: rowIdx, col: c });
            });
        }

        return { board: newBoard, moved, scoreGain: totalScore, mergeTiles };
    }

    function moveDown() {
        let moved = false;
        let totalScore = 0;
        const newBoard = cloneBoard(board);
        const mergeTiles = [];

        for (let c = 0; c < size; c++) {
            const line = reverse(getCol(newBoard, c));
            const { result, scoreGain, mergedPositions } = mergeLine(line);
            const finalCol = reverse(result);
            if (finalCol.join(',') !== getCol(newBoard, c).join(',')) moved = true;
            totalScore += scoreGain;
            setCol(newBoard, c, finalCol);

            mergedPositions.forEach(rowIdx => {
                mergeTiles.push({ row: size - 1 - rowIdx, col: c });
            });
        }

        return { board: newBoard, moved, scoreGain: totalScore, mergeTiles };
    }

    // ===== 随机生成新数字 =====
    function addRandomTile() {
        const empty = getEmptyCells();
        if (empty.length === 0) return null;

        const idx = Math.floor(Math.random() * empty.length);
        const { r, c } = empty[idx];
        const value = Math.random() < 0.9 ? 2 : 4;
        board[r][c] = value;
        return { r, c, value };
    }

    // ===== 检查游戏状态 =====
    function checkWin() {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === 2048) {
                    return true;
                }
            }
        }
        return false;
    }

    function canMove() {
        // 如果有空位，可以移动
        if (hasEmptyCell()) return true;

        // 检查是否有相邻相同数字
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const val = board[r][c];
                // 右方
                if (c + 1 < size && board[r][c + 1] === val) return true;
                // 下方
                if (r + 1 < size && board[r + 1][c] === val) return true;
            }
        }

        return false;
    }

    function checkGameOver() {
        if (!canMove()) {
            gameState = STATE.LOST;
            showOverlay('游戏结束!', `得分: ${score}`);
            saveGameState();
            // 游戏结束时自动结算
            setTimeout(function () {
                autoSettle();
            }, 300);
            return true;
        }
        return false;
    }

    // ===== 执行移动 =====
    function executeMove(direction) {
        if (gameState === STATE.LOST || isAnimating) return;
        if (isTouching) return;

        let result;
        switch (direction) {
            case 'left': result = moveLeft(); break;
            case 'right': result = moveRight(); break;
            case 'up': result = moveUp(); break;
            case 'down': result = moveDown(); break;
            default: return;
        }

        if (!result.moved) return;

        // 保存历史（用于撤销）
        history.push({
            board: cloneBoard(board),
            score: score
        });
        if (history.length > MAX_HISTORY) {
            history.shift();
        }

        // 更新状态
        board = result.board;
        score += result.scoreGain;
        updateScore();

        // 生成新数字并记录位置
        const newTile = addRandomTile();

        // 设置动画
        setPendingAnimations(newTile, result.mergeTiles);

        // 渲染
        renderTiles();

        // 保存游戏
        saveGameState();

        // 检查失败
        if (checkGameOver()) {
            return;
        }
    }

    // ===== 显示遮罩 =====
    function showOverlay(title, scoreText, showContinue) {
        overlayTitle.textContent = title;
        overlayScore.textContent = scoreText;
        gameOverlay.classList.remove('hidden');

        if (showContinue) {
            continueBtn.classList.remove('hidden');
        } else {
            continueBtn.classList.add('hidden');
        }
    }

    function hideOverlay() {
        gameOverlay.classList.add('hidden');
        continueBtn.classList.add('hidden');
    }

    // ===== 分数更新 =====
    function updateScore() {
        scoreEl.textContent = score;
        if (score > bestScore) {
            bestScore = score;
            bestScoreEl.textContent = bestScore;
            saveBestScore(size, bestScore);
        }
    }

    function refreshBestScore() {
        bestScore = loadBestScore(size);
        bestScoreEl.textContent = bestScore;
    }

    // ===== 初始化游戏 =====
    function initGame() {
        board = Array.from({ length: size }, () => Array(size).fill(0));
        score = 0;
        gameState = STATE.PLAYING;
        history = [];
        pendingAnimations = [];
        hideOverlay();

        refreshBestScore();
        updateScore();

        // 初始生成两个数字（无动画）
        addRandomTile();
        addRandomTile();

        renderGridBg();
        renderTiles();
        saveGameState();
    }

    // ===== 重置游戏 =====
    function resetGame() {
        const currentSize = parseInt(gridSizeSlider.value, 10);
        if (currentSize !== size) {
            size = currentSize;
            gridSizeDisplay.textContent = size;
            gridSizeDisplay2.textContent = size;
        }
        initGame();
    }

    // ===== 撤销 =====
    function undo() {
        if (history.length === 0 || gameState === STATE.LOST) return;

        const prev = history.pop();
        board = prev.board;
        score = prev.score;
        gameState = STATE.PLAYING;
        hideOverlay();
        updateScore();
        renderTiles();
        saveGameState();
    }

    // ===== 继续游戏（胜利后） =====
    function continueGame() {
        gameState = STATE.PLAYING;
        hideOverlay();
        saveGameState();
    }

    // ===== 键盘控制 =====
    document.addEventListener('keydown', function (e) {
        const key = e.key;
        let direction = null;

        // 防止页面滚动
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            e.preventDefault();
        }

        // ESC关闭规则弹窗
        if (key === 'Escape') {
            rulesModal.classList.add('hidden');
        }

        switch (key) {
            case 'ArrowLeft': case 'a': case 'A': direction = 'left'; break;
            case 'ArrowRight': case 'd': case 'D': direction = 'right'; break;
            case 'ArrowUp': case 'w': case 'W': direction = 'up'; break;
            case 'ArrowDown': case 's': case 'S': direction = 'down'; break;
            case 'z': case 'Z': // 撤销 (Ctrl+Z)
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    undo();
                }
                return;
        }

        if (direction) {
            e.preventDefault();
            executeMove(direction);
        }
    });

    // ===== 触摸控制 =====
    gridContainer.addEventListener('touchstart', function (e) {
        if (gameState === STATE.LOST) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isTouching = true;
    }, { passive: true });

    gridContainer.addEventListener('touchmove', function (e) {
        // 阻止页面滚动
        e.preventDefault();
    }, { passive: false });

    gridContainer.addEventListener('touchend', function (e) {
        if (!isTouching) return;
        isTouching = false;

        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;

        const threshold = 15;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.max(absDx, absDy) < threshold) return;

        let direction;
        if (absDx > absDy) {
            direction = dx > 0 ? 'right' : 'left';
        } else {
            direction = dy > 0 ? 'down' : 'up';
        }

        executeMove(direction);
    }, { passive: true });

    // ===== 鼠标拖拽支持 =====
    let mouseStartX = 0;
    let mouseStartY = 0;
    let isMouseDown = false;

    gridContainer.addEventListener('mousedown', function (e) {
        if (gameState === STATE.LOST) return;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
        isMouseDown = true;
    });

    document.addEventListener('mousemove', function (e) {
        if (!isMouseDown) return;
        e.preventDefault();
    });

    document.addEventListener('mouseup', function (e) {
        if (!isMouseDown) return;
        isMouseDown = false;

        const dx = e.clientX - mouseStartX;
        const dy = e.clientY - mouseStartY;

        const threshold = 15;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.max(absDx, absDy) < threshold) return;

        let direction;
        if (absDx > absDy) {
            direction = dx > 0 ? 'right' : 'left';
        } else {
            direction = dy > 0 ? 'down' : 'up';
        }

        executeMove(direction);
    });

    // ===== 窗口大小变化 =====
    let resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            renderGridBg();
            renderTiles();
        }, 150);
    });

    // ===== 按钮事件 =====
    newGameBtn.addEventListener('click', resetGame);
    overlayBtn.addEventListener('click', resetGame);
    continueBtn.addEventListener('click', continueGame);

    // 规则弹窗
    rulesBtn.addEventListener('click', function () {
        rulesModal.classList.remove('hidden');
    });

    closeRules.addEventListener('click', function () {
        rulesModal.classList.add('hidden');
    });

    rulesModal.querySelector('.modal-backdrop').addEventListener('click', function () {
        rulesModal.classList.add('hidden');
    });

    // ===== 网格大小控制 =====
    gridSizeSlider.addEventListener('input', function () {
        const val = this.value;
        gridSizeDisplay.textContent = val;
        gridSizeDisplay2.textContent = val;
    });

    gridSizeSlider.addEventListener('change', function () {
        const newSize = parseInt(this.value, 10);
        if (newSize !== size) {
            size = newSize;
            gridSizeDisplay.textContent = size;
            gridSizeDisplay2.textContent = size;
            initGame();
        }
    });

    // ===== 启动游戏 =====
    function startGame() {
        // 尝试加载存档（可能会改变 size）
        const restored = loadGameState();
        // 加载当前网格大小的最高分
        refreshBestScore();
        if (restored) {
            updateScore();
            renderGridBg();
            renderTiles();

            if (gameState === STATE.LOST) {
                showOverlay('游戏结束!', `得分: ${score}`);
            }
        } else {
            initGame();
        }
    }

    // ===== Cookie 工具 =====
    function setCookie(name, value, days) {
        try {
            var expires = '';
            if (days) {
                var d = new Date();
                d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
                expires = '; expires=' + d.toUTCString();
            }
            document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
        } catch (e) { /* ignore */ }
    }

    function getCookie(name) {
        try {
            var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
            return match ? decodeURIComponent(match[2]) : '';
        } catch (e) {
            return '';
        }
    }

    // ===== 排行榜数据管理（localStorage） =====
    var LB_KEY = '2048_leaderboard';

    function loadLeaderboard(s) {
        try {
            var all = JSON.parse(localStorage.getItem(LB_KEY)) || {};
            return Promise.resolve(all[s] || []);
        } catch (e) {
            return Promise.resolve([]);
        }
    }

    function saveLeaderboard(s, entries) {
        try {
            var all = JSON.parse(localStorage.getItem(LB_KEY)) || {};
            all[s] = entries;
            localStorage.setItem(LB_KEY, JSON.stringify(all));
        } catch (e) { /* ignore */ }
        return Promise.resolve();
    }

    // ===== 添加/更新成绩（只保留前十名） =====
    function addScoreToLeaderboard(s, username, scoreValue) {
        var name = username.trim().slice(0, 12) || '匿名玩家';
        return loadLeaderboard(s).then(function (entries) {
            var isUpdate = false;
            var existingIdx = -1;
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].username === name) { existingIdx = i; break; }
            }
            if (existingIdx !== -1) {
                if (scoreValue > entries[existingIdx].score) {
                    entries[existingIdx].score = scoreValue;
                    entries[existingIdx].date = new Date().toLocaleDateString('zh-CN');
                }
                isUpdate = true;
            } else {
                entries.push({
                    username: name,
                    score: scoreValue,
                    date: new Date().toLocaleDateString('zh-CN')
                });
            }
            entries.sort(function (a, b) { return b.score - a.score; });
            var top10 = entries.slice(0, 10);
            return saveLeaderboard(s, top10).then(function () {
                setCookie('2048_username', name, 365);
                return { entries: top10, isUpdate: isUpdate };
            });
        });
    }

    // ===== 渲染排行榜 =====
    function renderLeaderboard(s) {
        var body = document.getElementById('leaderboardBody');
        body.innerHTML = '<p class="leaderboard-empty">加载中...</p>';
        loadLeaderboard(s).then(function (entries) {
            if (entries.length === 0) {
                body.innerHTML = '<p class="leaderboard-empty">暂无记录</p>';
                return;
            }
            var html = '<table class="lb-table">' +
                '<thead><tr><th>#</th><th>玩家</th><th>分数</th><th>日期</th></tr></thead><tbody>';
            for (var i = 0; i < entries.length; i++) {
                var e = entries[i];
                var rank = i + 1;
                var rankClass = rank <= 3 ? ' rank-' + rank : '';
                html += '<tr class="' + rankClass + '">' +
                    '<td>' + rank + '</td>' +
                    '<td>' + escapeHtml(e.username) + '</td>' +
                    '<td>' + e.score + '</td>' +
                    '<td>' + (e.date || '') + '</td>' +
                    '</tr>';
            }
            html += '</tbody></table>';
            body.innerHTML = html;
        }).catch(function () {
            body.innerHTML = '<p class="leaderboard-empty">加载失败</p>';
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== 渲染排行榜标签页 =====
    let currentLeaderboardSize = 4;

    function renderLeaderboardTabs() {
        const tabsContainer = document.getElementById('leaderboardTabs');
        let html = '';
        for (let s = 4; s <= 10; s++) {
            const active = s === currentLeaderboardSize ? ' active' : '';
            html += '<button class="lb-tab' + active + '" data-size="' + s + '">' + s + '×' + s + '</button>';
        }
        tabsContainer.innerHTML = html;

        // 绑定点击事件
        tabsContainer.querySelectorAll('.lb-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const s = parseInt(this.getAttribute('data-size'), 10);
                if (s !== currentLeaderboardSize) {
                    currentLeaderboardSize = s;
                    renderLeaderboardTabs();
                    renderLeaderboard(s);
                }
            });
        });
    }

    function openLeaderboard() {
        currentLeaderboardSize = size;
        renderLeaderboardTabs();
        renderLeaderboard(currentLeaderboardSize);
        document.getElementById('leaderboardModal').classList.remove('hidden');
    }

    // ===== 结算逻辑 =====
    function autoSettle() {
        if (score === 0) return;
        var savedUser = getCookie('2048_username');
        if (savedUser) {
            // Cookie 存在 → 直接结算，不弹窗
            doSettle(savedUser);
        } else {
            // Cookie 不存在 → 弹窗让用户输入
            openSettleModal();
        }
    }

    function openSettleModal() {
        if (score === 0) {
            alert('当前分数为0，无法结算！');
            return;
        }
        document.getElementById('settleScoreDisplay').textContent = score;
        document.getElementById('settleSizeDisplay').textContent = size;
        document.getElementById('settleSizeDisplay2').textContent = size;

        var savedUser = getCookie('2048_username') || '';
        document.getElementById('settleUsername').value = savedUser;

        document.getElementById('settleModal').classList.remove('hidden');
        setTimeout(function () {
            var input = document.getElementById('settleUsername');
            input.focus();
            if (savedUser) {
                input.select();
            }
        }, 100);
    }

    function doSettle(username) {
        var name = username.trim() || '匿名玩家';
        if (score === 0) return;

        // 提交分数（异步）
        addScoreToLeaderboard(size, name, score).then(function (result) {
            // 关闭结算弹窗（如果开着）
            document.getElementById('settleModal').classList.add('hidden');

            // 重置游戏
            resetGame();

            // 结果提示
            if (result.isUpdate) {
                alert('✅ 您的成绩已更新！');
            } else {
                alert('🎉 分数已记录！');
            }
        }).catch(function () {
            alert('⚠️ 保存失败，请重试');
            document.getElementById('settleModal').classList.add('hidden');
            resetGame();
        });
    }

    function confirmSettle() {
        var usernameInput = document.getElementById('settleUsername');
        var username = usernameInput.value.trim() || '匿名玩家';
        doSettle(username);
    }

    function cancelSettle() {
        document.getElementById('settleModal').classList.add('hidden');
    }

    // ===== 排行榜 & 结算 按钮事件 =====
    document.getElementById('leaderboardBtn').addEventListener('click', openLeaderboard);
    document.getElementById('closeLeaderboard').addEventListener('click', function () {
        document.getElementById('leaderboardModal').classList.add('hidden');
    });
    document.querySelector('#leaderboardModal .modal-backdrop').addEventListener('click', function () {
        document.getElementById('leaderboardModal').classList.add('hidden');
    });

    document.getElementById('settleBtn').addEventListener('click', openSettleModal);
    document.getElementById('closeSettle').addEventListener('click', cancelSettle);
    document.querySelector('#settleModal .modal-backdrop').addEventListener('click', cancelSettle);
    document.getElementById('settleConfirmBtn').addEventListener('click', confirmSettle);
    document.getElementById('settleCancelBtn').addEventListener('click', cancelSettle);

    // 结算输入框回车提交
    document.getElementById('settleUsername').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmSettle();
        }
    });

    // ESC关闭所有弹窗（补充排行榜和结算）
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.getElementById('leaderboardModal').classList.add('hidden');
            document.getElementById('settleModal').classList.add('hidden');
        }
    });

    startGame();

})();
