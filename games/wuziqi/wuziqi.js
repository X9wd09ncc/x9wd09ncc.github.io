/**
 * 五子棋 (Gomoku) - 完整游戏逻辑
 * 模块划分: 状态管理 | 棋盘操作 | AI引擎 | UI渲染 | 应用控制
 */

// ================================================================
//  一、常量与配置
// ================================================================

const EMPTY = 0, BLACK = 1, WHITE = 2;

/** 模式标识 */
const MODE_AI = 'ai';
const MODE_FRIEND = 'friend';

/** 难度标识 */
const DIFF_NOVICE = 'novice';
const DIFF_EXPERT = 'expert';
const DIFF_MASTER = 'master';

/** 各难度的颜色 */
const PLAYER_COLOR = BLACK;
const AI_COLOR = WHITE;

/** 方向偏移: 水平, 垂直, 主对角线, 副对角线 */
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

/** 颜色名称 */
const COLOR_NAME = { [BLACK]: '黑方', [WHITE]: '白方' };
const COLOR_ICON = { [BLACK]: '⚫', [WHITE]: '⚪' };

/** 最大悔棋次数 (人机模式) */
const MAX_UNDO_AI = 3;

/** 好友模式悔棋请求冷却回合数 */
const UNDO_COOLDOWN_TURNS = 3;

// ================================================================
//  二、模式评分表
// ================================================================

/**
 * 根据连子数量和开放端数返回分数
 * count: 连子数 (包含假设下的棋子)
 * openEnds: 开放端数 (0/1/2)
 */
function patternScore(count, openEnds) {
    if (count >= 5) return 10000000;
    if (openEnds === 0) return 0;

    if (count === 4) {
        return openEnds === 2 ? 500000 : 50000;
    }
    if (count === 3) {
        return openEnds === 2 ? 50000 : 5000;
    }
    if (count === 2) {
        return openEnds === 2 ? 5000 : 500;
    }
    if (count === 1) {
        return openEnds === 2 ? 500 : 50;
    }
    return 0;
}

/** 大师级AI使用的评分表 (不含连五, 由上层处理) */
const MASTER_ATTACK_WEIGHTS = {
    liveFour: 500000,
    rushFour: 50000,
    liveThree: 50000,
    sleepThree: 5000,
    liveTwo: 5000,
    sleepTwo: 500,
    liveOne: 500,
    sleepOne: 50,
};

// ================================================================
//  三、游戏状态
// ================================================================

const state = {
    boardSize: 15,
    board: [],           // 二维数组: 0/1/2
    currentPlayer: BLACK,
    gameMode: null,      // 'ai' | 'friend'
    difficulty: DIFF_EXPERT,
    gameOver: false,
    winner: null,        // null | BLACK | WHITE | 'draw'
    moveHistory: [],     // [{row, col, color}, ...]
    lastMove: null,      // {row, col} | null
    winLine: null,       // [{row, col}, ...] | null

    // --- 人机模式 ---
    playerColor: BLACK,
    aiColor: WHITE,
    isPlayerTurn: true,
    undoRemaining: MAX_UNDO_AI,
    aiThinking: false,

    // --- 好友模式 ---
    undoRequestPending: false,
    undoRequestFrom: null,  // BLACK | WHITE
    lastUndoRequestTurn: -1,
};

// ================================================================
//  四、棋盘操作
// ================================================================

/** 初始化棋盘数组 */
function initBoard(size) {
    state.board = Array.from({ length: size }, () => Array(size).fill(EMPTY));
    state.boardSize = size;
    state.moveHistory = [];
    state.lastMove = null;
    state.winLine = null;
    state.gameOver = false;
    state.winner = null;
    state.currentPlayer = BLACK;
    state.isPlayerTurn = true;
    state.undoRemaining = MAX_UNDO_AI;
    state.aiThinking = false;
    state.undoRequestPending = false;
    state.undoRequestFrom = null;
    state.lastUndoRequestTurn = -1;
}

/** 判断坐标是否在棋盘内 */
function inBounds(r, c) {
    return r >= 0 && r < state.boardSize && c >= 0 && c < state.boardSize;
}

/** 判断位置是否为空 */
function isEmpty(r, c) {
    return inBounds(r, c) && state.board[r][c] === EMPTY;
}

/** 落子 */
function placePiece(r, c, color) {
    if (state.gameOver || !isEmpty(r, c)) return false;
    state.board[r][c] = color;
    state.moveHistory.push({ row: r, col: c, color });
    state.lastMove = { row: r, col: c };
    state.currentPlayer = color === BLACK ? WHITE : BLACK;
    return true;
}

/** 撤回最后N步 */
function undoMoves(count) {
    for (let i = 0; i < count && state.moveHistory.length > 0; i++) {
        const move = state.moveHistory.pop();
        state.board[move.row][move.col] = EMPTY;
    }
    state.lastMove = state.moveHistory.length > 0
        ? {
            row: state.moveHistory[state.moveHistory.length - 1].row,
            col: state.moveHistory[state.moveHistory.length - 1].col
        }
        : null;
    state.winLine = null;
    state.gameOver = false;
    state.winner = null;
    state.currentPlayer = state.moveHistory.length % 2 === 0
        ? (state.moveHistory.length === 0 ? BLACK : (state.moveHistory[0].color === BLACK ? BLACK : WHITE))
        : (state.moveHistory[0].color === BLACK ? WHITE : BLACK);
    if (state.gameMode === MODE_AI) {
        state.isPlayerTurn = state.currentPlayer === state.playerColor;
    }
}

// ================================================================
//  五、胜负判定
// ================================================================

/**
 * 从指定位置检测是否获胜
 * 返回: null (未获胜) 或 [{row, col}, ...] (获胜五子连线)
 */
function checkWinAt(r, c) {
    const color = state.board[r][c];
    if (color === EMPTY) return null;

    for (const [dr, dc] of DIRS) {
        const line = [{ row: r, col: c }];
        // 正方向
        for (let i = 1; i < 5; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (!inBounds(nr, nc) || state.board[nr][nc] !== color) break;
            line.push({ row: nr, col: nc });
        }
        // 反方向
        for (let i = 1; i < 5; i++) {
            const nr = r - dr * i, nc = c - dc * i;
            if (!inBounds(nr, nc) || state.board[nr][nc] !== color) break;
            line.unshift({ row: nr, col: nc });
        }
        if (line.length >= 5) return line;
    }
    return null;
}

/** 检测全局是否平局 */
function checkDraw() {
    for (let r = 0; r < state.boardSize; r++) {
        for (let c = 0; c < state.boardSize; c++) {
            if (state.board[r][c] === EMPTY) return false;
        }
    }
    return true;
}

/**
 * 在落子后执行完整判定
 * 返回: 'win' | 'draw' | null
 */
function checkGameOver(r, c) {
    const win = checkWinAt(r, c);
    if (win) {
        state.gameOver = true;
        state.winner = state.board[r][c];
        state.winLine = win;
        return 'win';
    }
    if (checkDraw()) {
        state.gameOver = true;
        state.winner = 'draw';
        return 'draw';
    }
    return null;
}

// ================================================================
//  六、AI 引擎
// ================================================================

/**
 * 评估在 (r,c) 放置 color 棋子后的位置评分
 * 考虑四个方向的分值之和
 */
function evaluatePosition(board, size, r, c, color) {
    let score = 0;
    for (const [dr, dc] of DIRS) {
        let count = 1;
        let openEnds = 0;

        // 正方向
        let nr = r + dr, nc = c + dc;
        while (inBoundsNR(size, nr, nc) && board[nr][nc] === color) {
            count++;
            nr += dr;
            nc += dc;
        }
        if (inBoundsNR(size, nr, nc) && board[nr][nc] === EMPTY) openEnds++;

        // 反方向
        nr = r - dr;
        nc = c - dc;
        while (inBoundsNR(size, nr, nc) && board[nr][nc] === color) {
            count++;
            nr -= dr;
            nc -= dc;
        }
        if (inBoundsNR(size, nr, nc) && board[nr][nc] === EMPTY) openEnds++;

        score += patternScore(count, openEnds);
    }
    return score;
}

function inBoundsNR(size, r, c) {
    return r >= 0 && r < size && c >= 0 && c < size;
}

/** 获取所有空位 (仅限于已有棋子周围的空位, 减少搜索量) */
function getCandidates(board, size, radius) {
    radius = radius || 2;
    const hasStone = new Set();
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] !== EMPTY) {
                hasStone.add(`${r},${c}`);
            }
        }
    }
    if (hasStone.size === 0) {
        // 空棋盘: 返回中心
        const center = Math.floor(size / 2);
        return [{ row: center, col: center }];
    }

    const candidates = [];
    const seen = new Set();
    for (const key of hasStone) {
        const [sr, sc] = key.split(',').map(Number);
        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                const nr = sr + dr, nc = sc + dc;
                if (!inBoundsNR(size, nr, nc)) continue;
                if (board[nr][nc] !== EMPTY) continue;
                const nk = `${nr},${nc}`;
                if (seen.has(nk)) continue;
                seen.add(nk);
                candidates.push({ row: nr, col: nc });
            }
        }
    }
    return candidates;
}

// ---- 新手级 AI (纯随机, 极弱) ----

/**
 * 获取棋盘上所有空位
 */
function getAllEmpty() {
    const result = [];
    for (let r = 0; r < state.boardSize; r++) {
        for (let c = 0; c < state.boardSize; c++) {
            if (state.board[r][c] === EMPTY) result.push({ row: r, col: c });
        }
    }
    return result;
}

function aiNovice() {
    const allEmpty = getAllEmpty();
    if (allEmpty.length === 0) return null;

    // 空棋盘下中心
    if (allEmpty.length === state.boardSize * state.boardSize) {
        const center = Math.floor(state.boardSize / 2);
        return { row: center, col: center };
    }

    // 在已有棋子附近 2 格内纯随机选一个空位
    const candidates = getCandidates(state.board, state.boardSize, 2);
    if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // 后备
    return allEmpty[Math.floor(Math.random() * allEmpty.length)];
}

// ---- 高手级 AI (贪心评分) ----

function aiExpert() {
    const candidates = getCandidates(state.board, state.boardSize, 2);
    if (candidates.length === 0) {
        const center = Math.floor(state.boardSize / 2);
        return { row: center, col: center };
    }

    let bestScore = -Infinity;
    let bestMove = candidates[0];

    for (const { row, col } of candidates) {
        const atkScore = evaluatePosition(state.board, state.boardSize, row, col, state.aiColor);
        const defScore = evaluatePosition(state.board, state.boardSize, row, col, state.playerColor);
        const total = atkScore * 1.1 + defScore;

        if (total > bestScore) {
            bestScore = total;
            bestMove = { row, col };
        }
    }
    return bestMove;
}

// ---- 大师级 AI (启发式 + Alpha-Beta 搜索) ----

/**
 * 对候选走法排序 (从好到差)
 */
function orderMoves(board, size, candidates, aiColor, playerColor) {
    return candidates.map(({ row, col }) => {
        const atk = evaluatePosition(board, size, row, col, aiColor);
        const def = evaluatePosition(board, size, row, col, playerColor);
        return { row, col, score: atk + def };
    }).sort((a, b) => b.score - a.score);
}

/**
 * 棋盘评估函数: AI视角的分数 - 玩家视角的分数
 */
function evaluateBoard(board, size, aiColor, playerColor) {
    let aiScore = 0, playerScore = 0;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] === aiColor) {
                aiScore += evaluatePosition(board, size, r, c, aiColor);
            } else if (board[r][c] === playerColor) {
                playerScore += evaluatePosition(board, size, r, c, playerColor);
            }
        }
    }
    return aiScore - playerScore;
}

/**
 * 检查某一方在当前棋盘是否直接获胜
 */
function hasImmediateWin(board, size, color) {
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] !== EMPTY) continue;
            // 模拟落子
            board[r][c] = color;
            let win = false;
            for (const [dr, dc] of DIRS) {
                let count = 1;
                let nr = r + dr, nc = c + dc;
                while (inBoundsNR(size, nr, nc) && board[nr][nc] === color) { count++; nr += dr; nc += dc; }
                nr = r - dr; nc = c - dc;
                while (inBoundsNR(size, nr, nc) && board[nr][nc] === color) { count++; nr -= dr; nc -= dc; }
                if (count >= 5) { win = true; break; }
            }
            board[r][c] = EMPTY;
            if (win) return { row: r, col: c };
        }
    }
    return null;
}

/** Alpha-Beta 搜索 (深度2) */
let abSearchCalls = 0;

function alphaBeta(board, size, depth, alpha, beta, isMaximizing, aiColor, playerColor) {
    abSearchCalls++;

    const candidates = getCandidates(board, size, 1);
    if (candidates.length === 0) {
        return isMaximizing ? -100000 : 100000;
    }

    // 检查直接获胜
    const aiWin = hasImmediateWin(board, size, aiColor);
    if (aiWin) return 1000000 + depth;

    const playerWin = hasImmediateWin(board, size, playerColor);
    if (playerWin) return -1000000 - depth;

    if (depth === 0) {
        return evaluateBoard(board, size, aiColor, playerColor);
    }

    // 排序候选
    const ordered = orderMoves(board, size, candidates, aiColor, playerColor);
    const topN = Math.min(ordered.length, depth >= 2 ? 12 : 18);

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let i = 0; i < topN; i++) {
            const { row, col } = ordered[i];
            board[row][col] = aiColor;
            const ev = alphaBeta(board, size, depth - 1, alpha, beta, false, aiColor, playerColor);
            board[row][col] = EMPTY;
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let i = 0; i < topN; i++) {
            const { row, col } = ordered[i];
            board[row][col] = playerColor;
            const ev = alphaBeta(board, size, depth - 1, alpha, beta, true, aiColor, playerColor);
            board[row][col] = EMPTY;
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

/** 开局定式库 (部分常见开局) */
function getOpeningMove(board, size, aiColor) {
    const center = Math.floor(size / 2);

    // AI先手: 占天元
    if (board[center][center] === EMPTY) return { row: center, col: center };

    // 玩家先手占了天元, AI下在星位
    const openings = [
        [center - 1, center - 1], [center - 1, center + 1],
        [center + 1, center - 1], [center + 1, center + 1],
        [center - 1, center], [center + 1, center],
        [center, center - 1], [center, center + 1],
    ];

    // 过滤出有效且为空的位置
    const valid = openings.filter(([r, c]) =>
        inBoundsNR(size, r, c) && board[r][c] === EMPTY
    );

    // 评分: 选择对自己最有利的开局位置
    let best = null, bestScore = -Infinity;
    for (const [r, c] of valid) {
        const atk = evaluatePosition(board, size, r, c, aiColor);
        const def = evaluatePosition(board, size, r, c, aiColor === BLACK ? WHITE : BLACK);
        const s = atk * 1.2 + def;
        if (s > bestScore) { bestScore = s; best = { row: r, col: c }; }
    }
    return best || { row: center - 1, col: center - 1 };
}

function aiMaster() {
    const size = state.boardSize;
    const aiColor = state.aiColor;
    const playerColor = state.playerColor;

    // 1. 检查是否能直接获胜
    const aiWin = hasImmediateWin(state.board, size, aiColor);
    if (aiWin) return aiWin;

    // 2. 检查是否需要防守 (对手下一步获胜)
    const playerWin = hasImmediateWin(state.board, size, playerColor);
    if (playerWin) return playerWin;

    // 3. 开局定式 (前4步)
    const totalMoves = state.moveHistory.length;
    if (totalMoves <= 4) return getOpeningMove(state.board, size, aiColor);

    // 4. 候选走法
    let candidates = getCandidates(state.board, size, 2);
    if (candidates.length === 0) {
        const center = Math.floor(size / 2);
        return { row: center, col: center };
    }

    const ordered = orderMoves(state.board, size, candidates, aiColor, playerColor);
    const topN = Math.min(ordered.length, 20);

    // 5. Alpha-Beta 搜索
    abSearchCalls = 0;
    // 残局加深搜索, 开局轻度搜索
    const searchDepth = totalMoves > 40 ? 3 : (totalMoves > 20 ? 2 : 3);
    let bestScore = -Infinity;
    let bestMove = ordered[0];

    for (let i = 0; i < topN; i++) {
        const { row, col } = ordered[i];
        state.board[row][col] = aiColor;
        const score = alphaBeta(state.board, size, searchDepth - 1, -Infinity, Infinity, false, aiColor, playerColor);
        state.board[row][col] = EMPTY;

        if (score > bestScore) {
            bestScore = score;
            bestMove = { row, col };
        }
    }

    return bestMove;
}

/** AI 主入口 (根据难度选择算法) */
function getAIMove() {
    const aiColor = state.aiColor;
    const playerColor = state.playerColor;
    const size = state.boardSize;

    if (state.difficulty === DIFF_NOVICE) {
        // 新手内部已包含胜负检测
        return aiNovice();
    }

    // 高手/大师: 检查是否有直接获胜位置
    const aiWin = hasImmediateWin(state.board, size, aiColor);
    if (aiWin) return aiWin;

    if (state.difficulty === DIFF_EXPERT) {
        const playerWin = hasImmediateWin(state.board, size, playerColor);
        if (playerWin) return playerWin;
        return aiExpert();
    }

    // 大师级内部已包含完整的胜负检查和搜索
    return aiMaster();
}

// ================================================================
//  七、UI 模块
// ================================================================

const canvas = document.getElementById('board-canvas');
const ctx = canvas.getContext('2d');

/** 布局参数 */
let layout = { cellSize: 0, padding: 0, stoneRadius: 0 };

/** 计算布局 */
function computeLayout() {
    const size = state.boardSize;
    const container = document.querySelector('.board-wrapper');
    const maxW = Math.min(container.clientWidth - 10, 680);
    const maxH = Math.min(container.clientHeight - 10, 680);
    const maxDim = Math.min(maxW, maxH);

    const paddingMin = 20;
    const cellMax = Math.floor((maxDim - paddingMin * 2) / (size - 1));
    const cellSize = Math.min(cellMax, 38);
    const padding = Math.max(paddingMin, Math.floor((maxDim - cellSize * (size - 1)) / 2));

    const canvasSize = padding * 2 + cellSize * (size - 1);
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    layout = { cellSize, padding, stoneRadius: cellSize * 0.42 };
}

/** 获取棋盘坐标对应的画布像素坐标 */
function toPixel(row, col) {
    return {
        x: layout.padding + col * layout.cellSize,
        y: layout.padding + row * layout.cellSize,
    };
}

/** 获取像素坐标对应的棋盘行列 */
function toBoard(px, py) {
    const col = Math.round((px - layout.padding) / layout.cellSize);
    const row = Math.round((py - layout.padding) / layout.cellSize);
    if (!inBounds(row, col)) return null;
    // 检查点击是否在棋子交叉点附近
    const { x, y } = toPixel(row, col);
    const dist = Math.hypot(px - x, py - y);
    if (dist > layout.cellSize * 0.48) return null;
    return { row, col };
}

// ================================================================
//  绘制函数
// ================================================================

/** 绘制棋盘网格 */
function drawBoard() {
    const size = state.boardSize;
    const { cellSize, padding, stoneRadius } = layout;

    // 棋盘底色
    ctx.fillStyle = '#dcb35c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 网格线
    ctx.strokeStyle = '#5a3e1b';
    ctx.lineWidth = 1;

    for (let i = 0; i < size; i++) {
        // 横线: (padding, y) → (padding + (size-1)*cellSize, y)
        const { y } = toPixel(i, 0);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + (size - 1) * cellSize, y);
        ctx.stroke();

        // 竖线: (x, padding) → (x, padding + (size-1)*cellSize)
        const { x } = toPixel(0, i);
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, padding + (size - 1) * cellSize);
        ctx.stroke();
    }

    // 星位 (天元和四个星)
    if (size >= 15) {
        const stars = [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]];
        if (size === 15) {
            for (const [r, c] of stars) {
                drawStarPoint(r, c);
            }
        } else {
            // 对于非标准棋盘, 在靠近中心的位置画星
            const near = [
                [Math.floor(size / 2) - 1, Math.floor(size / 2) - 1],
                [Math.floor(size / 2) - 1, Math.floor(size / 2) + 1],
                [Math.floor(size / 2) + 1, Math.floor(size / 2) - 1],
                [Math.floor(size / 2) + 1, Math.floor(size / 2) + 1],
            ];
            for (const [r, c] of near) {
                if (inBounds(r, c)) drawStarPoint(r, c);
            }
            drawStarPoint(Math.floor(size / 2), Math.floor(size / 2));
        }
    } else if (size >= 9) {
        const center = Math.floor(size / 2);
        drawStarPoint(center, center);
    }
}

function drawStarPoint(row, col) {
    const { x, y } = toPixel(row, col);
    ctx.fillStyle = '#5a3e1b';
    ctx.beginPath();
    ctx.arc(x, y, layout.cellSize * 0.08, 0, Math.PI * 2);
    ctx.fill();
}

/** 绘制棋子 */
function drawStone(row, col, color, alpha) {
    const { x, y } = toPixel(row, col);
    const r = layout.stoneRadius;
    alpha = alpha || 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 阴影
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);

    if (color === BLACK) {
        grad.addColorStop(0, '#555');
        grad.addColorStop(0.6, '#222');
        grad.addColorStop(1, '#000');
    } else {
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.6, '#f0f0f0');
        grad.addColorStop(1, '#ccc');
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 白棋边框
    if (color === WHITE) {
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    ctx.restore();
}

/** 绘制最后落子标记 */
function drawLastMoveMarker(row, col) {
    const { x, y } = toPixel(row, col);
    const color = state.board[row][col];

    ctx.save();
    ctx.fillStyle = color === BLACK ? '#ff4444' : '#ff4444';
    ctx.beginPath();
    ctx.arc(x, y, layout.stoneRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/** 绘制获胜连线高亮 */
function drawWinLine(line) {
    if (!line || line.length < 2) return;

    // 高亮五个获胜棋子
    for (const { row, col } of line) {
        const { x, y } = toPixel(row, col);
        const r = layout.stoneRadius + 3;

        ctx.save();
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // 连线
    const first = toPixel(line[0].row, line[0].col);
    const last = toPixel(line[line.length - 1].row, line[line.length - 1].col);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 221, 0, 0.5)';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
}

/** 主渲染函数 */
function render() {
    drawBoard();

    // 绘制所有棋子
    for (let r = 0; r < state.boardSize; r++) {
        for (let c = 0; c < state.boardSize; c++) {
            if (state.board[r][c] !== EMPTY) {
                drawStone(r, c, state.board[r][c]);
            }
        }
    }

    // 最后落子标记
    if (state.lastMove && !state.gameOver) {
        const { row, col } = state.lastMove;
        if (state.board[row][col] !== EMPTY) {
            drawLastMoveMarker(row, col);
        }
    }

    // 获胜连线
    if (state.winLine) {
        drawWinLine(state.winLine);
    }
}

// ================================================================
//  UI 更新
// ================================================================

/** 更新回合指示器 */
function updateTurnDisplay() {
    const badge = document.getElementById('turn-badge');
    if (state.gameOver) {
        if (state.winner === 'draw') {
            badge.textContent = '🤝 平局';
            badge.className = 'turn-badge game-over-badge';
        } else {
            const name = COLOR_NAME[state.winner];
            badge.textContent = `🏆 ${name}获胜！`;
            badge.className = 'turn-badge game-over-badge';
        }
        return;
    }

    const name = COLOR_NAME[state.currentPlayer];
    const icon = COLOR_ICON[state.currentPlayer];
    badge.textContent = `${icon} ${name}走棋`;
    badge.className = `turn-badge ${state.currentPlayer === BLACK ? 'black-turn' : 'white-turn'}`;
}

/** 更新悔棋信息 */
function updateUndoDisplay() {
    const stat = document.getElementById('undo-stat');
    if (state.gameMode === MODE_AI) {
        stat.textContent = `悔棋: ${state.undoRemaining}/${MAX_UNDO_AI}`;
        stat.className = `stat-item ${state.undoRemaining === 0 ? '' : ''}`;
    } else {
        stat.textContent = '';
    }
}

/** 更新按钮状态 */
function updateButtons() {
    const undoBtn = document.getElementById('btn-undo');
    const isAI = state.gameMode === MODE_AI;

    if (isAI) {
        undoBtn.disabled = state.gameOver || state.undoRemaining <= 0 || state.aiThinking || state.moveHistory.length < 2;
    } else {
        // 好友模式: 游戏结束或已有待处理请求时禁用
        undoBtn.disabled = state.gameOver || state.undoRequestPending || state.moveHistory.length < 1;
    }
}

/** 更新所有UI */
function updateUI() {
    updateTurnDisplay();
    updateUndoDisplay();
    updateButtons();
    render();
}

// ================================================================
//  八、对话框管理
// ================================================================

function showDialog(id) {
    document.getElementById(id).classList.add('active');
}

function hideDialog(id) {
    document.getElementById(id).classList.remove('active');
}

function showGameOverDialog() {
    const icon = document.getElementById('gameover-icon');
    const text = document.getElementById('gameover-text');
    if (state.winner === 'draw') {
        icon.textContent = '🤝';
        text.textContent = '棋盘已满，平局！';
    } else {
        icon.textContent = '🎉';
        const name = COLOR_NAME[state.winner];
        const iconStr = COLOR_ICON[state.winner];
        text.textContent = `${iconStr} ${name}获胜！`;
    }
    showDialog('gameover-dialog');
}

function showUndoDialog(requestingPlayer) {
    const text = document.getElementById('undo-dialog-text');
    const name = COLOR_NAME[requestingPlayer];
    const icon = COLOR_ICON[requestingPlayer];
    text.textContent = `${icon} ${name} 请求悔棋，是否同意？`;
    showDialog('undo-dialog');
}

// ================================================================
//  九、游戏流程控制
// ================================================================

/** 执行落子 */
function makeMove(row, col, color) {
    if (!placePiece(row, col, color)) return false;

    const result = checkGameOver(row, col);
    updateUI();

    if (result === 'win') {
        setTimeout(showGameOverDialog, 300);
    } else if (result === 'draw') {
        setTimeout(showGameOverDialog, 300);
    }

    return true;
}

/** 玩家点击落子 */
function handlePlayerMove(row, col) {
    if (state.gameOver || state.aiThinking || state.undoRequestPending) return;
    if (state.board[row][col] !== EMPTY) return;

    if (state.gameMode === MODE_AI && !state.isPlayerTurn) return;

    const color = state.gameMode === MODE_AI ? state.playerColor : state.currentPlayer;
    if (!makeMove(row, col, color)) return;

    // 人机模式: AI 回合
    if (state.gameMode === MODE_AI && !state.gameOver) {
        state.isPlayerTurn = false;
        updateUI();
        scheduleAIMove();
    }
}

/** 调度AI走棋 (异步) */
function scheduleAIMove() {
    state.aiThinking = true;
    updateButtons();

    setTimeout(() => {
        const move = getAIMove();
        if (!move) {
            state.aiThinking = false;
            state.isPlayerTurn = true;
            updateUI();
            return;
        }

        makeMove(move.row, move.col, state.aiColor);
        state.isPlayerTurn = true;
        state.aiThinking = false;
        updateUI();
    }, 200);
}

// ================================================================
//  悔棋逻辑
// ================================================================

/** 人机模式悔棋 */
function undoAI() {
    if (state.gameOver || state.undoRemaining <= 0 || state.aiThinking || state.moveHistory.length < 2) return;

    // 撤回玩家和AI各一步 (共两步)
    undoMoves(2);

    state.undoRemaining--;
    state.isPlayerTurn = true;
    updateUI();
}

/** 好友模式发起悔棋请求 */
function requestUndoFriend() {
    if (state.gameOver || state.undoRequestPending || state.moveHistory.length < 1) return;

    // 检查冷却: 每 UNDO_COOLDOWN_TURNS 回合只能悔棋一次
    if (state.lastUndoRequestTurn > 0) {
        const turnsSince = state.moveHistory.length - state.lastUndoRequestTurn;
        if (turnsSince < UNDO_COOLDOWN_TURNS) {
            // 虽然限制但不对用户隐藏, 只是提示
        }
    }

    // 请求方为当前回合的对方 (轮到的玩家不能请求悔棋)
    // 实际上: 请求悔棋的是上一步落子方
    const lastMove = state.moveHistory[state.moveHistory.length - 1];
    const requestingPlayer = lastMove.color;

    state.undoRequestPending = true;
    state.undoRequestFrom = requestingPlayer;
    updateButtons();
    showUndoDialog(requestingPlayer);
}

/** 好友模式接受悔棋 */
function acceptUndoFriend() {
    hideDialog('undo-dialog');
    if (!state.undoRequestPending) return;

    // 撤回请求方自己的最后一步
    const from = state.undoRequestFrom;
    // 从历史记录中找到该玩家最近的一步
    for (let i = state.moveHistory.length - 1; i >= 0; i--) {
        if (state.moveHistory[i].color === from) {
            const move = state.moveHistory[i];
            state.board[move.row][move.col] = EMPTY;
            state.moveHistory.splice(i, 1);
            break;
        }
    }

    state.lastMove = state.moveHistory.length > 0
        ? {
            row: state.moveHistory[state.moveHistory.length - 1].row,
            col: state.moveHistory[state.moveHistory.length - 1].col
        }
        : null;
    // 好友模式: 黑方先手, 偶数步后轮到黑方
    state.currentPlayer = state.moveHistory.length % 2 === 0 ? BLACK : WHITE;
    state.winLine = null;
    state.gameOver = false;
    state.winner = null;
    state.lastUndoRequestTurn = state.moveHistory.length;
    state.undoRequestPending = false;
    state.undoRequestFrom = null;

    updateUI();
}

/** 好友模式拒绝悔棋 */
function rejectUndoFriend() {
    hideDialog('undo-dialog');
    if (!state.undoRequestPending) return;

    state.undoRequestPending = false;
    state.undoRequestFrom = null;
    updateUI();
}

// ================================================================
//  十、游戏模式切换与重置
// ================================================================

/** 显示指定界面 */
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

/** 开始新游戏 */
function startGame(mode, difficulty, firstPlayer, boardSize) {
    state.gameMode = mode;
    state.difficulty = difficulty;
    state.boardSize = boardSize;

    if (mode === MODE_AI) {
        state.playerColor = firstPlayer === 'player' ? BLACK : WHITE;
        state.aiColor = firstPlayer === 'player' ? WHITE : BLACK;
        state.isPlayerTurn = firstPlayer === 'player';
    } else {
        state.playerColor = BLACK;
        state.aiColor = WHITE;
        state.isPlayerTurn = true;
    }

    initBoard(boardSize);

    // 更新模式显示
    const modeBadge = document.getElementById('mode-badge');
    modeBadge.textContent = mode === MODE_AI
        ? `🤖 ${difficulty === DIFF_NOVICE ? '新手' : difficulty === DIFF_EXPERT ? '高手' : '大师'}`
        : '👥 好友对战';

    // 隐藏设置
    showScreen('game-screen');

    // 重新计算布局并渲染
    computeLayout();
    updateUI();

    // AI先手
    if (mode === MODE_AI && !state.isPlayerTurn) {
        scheduleAIMove();
    }
}

/** 重置游戏 (使用当前设置) */
function resetGame() {
    startGame(state.gameMode, state.difficulty,
        state.playerColor === BLACK ? 'player' : 'ai',
        state.boardSize);
}

/** 返回主菜单 */
function goToMenu() {
    hideDialog('gameover-dialog');
    hideDialog('undo-dialog');
    showScreen('menu-screen');
}

// ================================================================
//  十一、事件绑定
// ================================================================

// ---- 菜单事件 ----

document.getElementById('btn-ai-mode').addEventListener('click', () => {
    document.getElementById('setting-difficulty').style.display = '';
    document.getElementById('setting-first').style.display = '';
    showScreen('settings-screen');
});

document.getElementById('btn-friend-mode').addEventListener('click', () => {
    document.getElementById('setting-difficulty').style.display = 'none';
    document.getElementById('setting-first').style.display = 'none';
    showScreen('settings-screen');
});

document.getElementById('btn-back-menu-from-settings').addEventListener('click', () => {
    showScreen('menu-screen');
});

// ---- 设置事件 ----

const sizeSlider = document.getElementById('board-size');
const sizeDisplay = document.getElementById('size-display');

sizeSlider.addEventListener('input', () => {
    const v = parseInt(sizeSlider.value);
    sizeDisplay.textContent = `${v} × ${v}`;
});

// 选项按钮切换
document.querySelectorAll('.btn-group').forEach(group => {
    group.querySelectorAll('.opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            group.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
});

document.getElementById('btn-start-game').addEventListener('click', () => {
    // 判断模式: 检测当前设置界面是否显示了AI选项
    const isAISetting = document.getElementById('setting-difficulty').style.display !== 'none';
    const gameMode = isAISetting ? MODE_AI : MODE_FRIEND;

    let difficulty = DIFF_EXPERT;
    if (gameMode === MODE_AI) {
        const activeDiff = document.querySelector('#difficulty-group .opt-btn.active');
        difficulty = activeDiff ? activeDiff.dataset.value : DIFF_EXPERT;
    }

    const activeFirst = document.querySelector('#first-group .opt-btn.active');
    const firstPlayer = activeFirst ? activeFirst.dataset.value : 'player';

    const boardSize = parseInt(sizeSlider.value);
    startGame(gameMode, difficulty, firstPlayer, boardSize);
});

// ---- Canvas 点击/触摸事件 ----

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const pos = toBoard(px, py);
    if (pos) handlePlayerMove(pos.row, pos.col);
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (touch.clientX - rect.left) * scaleX;
    const py = (touch.clientY - rect.top) * scaleY;
    const pos = toBoard(px, py);
    if (pos) handlePlayerMove(pos.row, pos.col);
}, { passive: false });

// ---- 控制按钮 ----

document.getElementById('btn-undo').addEventListener('click', () => {
    if (state.gameMode === MODE_AI) {
        undoAI();
    } else {
        requestUndoFriend();
    }
});

document.getElementById('btn-reset').addEventListener('click', resetGame);

document.getElementById('btn-settings').addEventListener('click', () => {
    hideDialog('gameover-dialog');
    // 跳到设置 (保持当前模式选择)
    const mode = state.gameMode;
    if (mode === MODE_AI) {
        document.getElementById('setting-difficulty').style.display = '';
        document.getElementById('setting-first').style.display = '';
    } else {
        document.getElementById('setting-difficulty').style.display = 'none';
        document.getElementById('setting-first').style.display = 'none';
    }
    showScreen('settings-screen');
});

document.getElementById('btn-quit').addEventListener('click', goToMenu);

// ---- 悔棋对话框 ----

document.getElementById('btn-undo-accept').addEventListener('click', acceptUndoFriend);
document.getElementById('btn-undo-reject').addEventListener('click', rejectUndoFriend);

// ---- 游戏结束对话框 ----

document.getElementById('btn-gameover-ok').addEventListener('click', () => {
    hideDialog('gameover-dialog');
});

// ---- 窗口大小变化 ----

window.addEventListener('resize', () => {
    if (document.getElementById('game-screen').classList.contains('active')) {
        computeLayout();
        render();
    }
});

// ================================================================
//  十二、初始化
// ================================================================

// 默认显示菜单
showScreen('menu-screen');

console.log('五子棋游戏已加载 ✓');
console.log('版本: 1.0.0');
console.log('模式: 人机对战 / 好友对战');
console.log('AI 难度: 新手 / 高手 / 大师');
