const UI = {
    mode: document.getElementById('game-mode'),
    style: document.getElementById('play-style'),
    diff: document.getElementById('difficulty'),
    aiDiff: document.getElementById('ai-difficulty'),
    aiContainer: document.getElementById('ai-difficulty-container'),
    customSettings: document.getElementById('custom-settings'),
    cRows: document.getElementById('custom-rows'),
    cCols: document.getElementById('custom-cols'),
    cMines: document.getElementById('custom-mines'),
    restart: document.getElementById('btn-restart'),
    orbs: document.querySelectorAll('.theme-orb'),
    status: document.getElementById('global-message'),
    turnInd: document.getElementById('turn-indicator'),
    p1: {
        wrap: document.getElementById('player1-wrapper'),
        board: document.getElementById('p1-board'),
        time: document.getElementById('p1-timer'),
        mines: document.getElementById('p1-mines')
    },
    p2: {
        wrap: document.getElementById('player2-wrapper'),
        board: document.getElementById('p2-board'),
        time: document.getElementById('p2-timer'),
        mines: document.getElementById('p2-mines'),
        name: document.getElementById('p2-name')
    }
};

let CFG = {
    mode: 'pve',
    style: 'speed',
    rows: 16,
    cols: 16,
    mines: 40,
    aiLvl: 'hard'
};

const STAT = {
    active: false,
    turn: 1,
    p1: null,
    p2: null
};

function initData() {
    return {
        b: [], r: [], f: [],
        t: 0, m: CFG.mines,
        intv: null, over: false, win: false,
        aiLock: false
    };
}

function syncUI() {
    CFG.mode = UI.mode.value;
    CFG.style = UI.style.value;
    CFG.aiLvl = UI.aiDiff.value;

    if (CFG.mode === 'single') {
        UI.aiContainer.classList.add('hidden');
        UI.p2.wrap.classList.add('hidden');
    } else {
        UI.p2.wrap.classList.remove('hidden');
        if (CFG.mode === 'pvp') {
            UI.aiContainer.classList.add('hidden');
            UI.p2.name.textContent = '玩家 2';
        } else {
            UI.aiContainer.classList.remove('hidden');
            UI.p2.name.textContent = '电脑';
        }
    }

    if (UI.diff.value === 'custom') {
        UI.customSettings.classList.remove('hidden');
        CFG.rows = Math.max(5, Math.min(40, parseInt(UI.cRows.value) || 16));
        CFG.cols = Math.max(5, Math.min(40, parseInt(UI.cCols.value) || 16));
        CFG.mines = Math.max(1, Math.min(CFG.rows * CFG.cols - 1, parseInt(UI.cMines.value) || 40));
    } else {
        UI.customSettings.classList.add('hidden');
        const pre = {
            easy: [9, 9, 10], medium: [16, 16, 40], hard: [24, 24, 99]
        }[UI.diff.value];
        [CFG.rows, CFG.cols, CFG.mines] = pre;
    }

    let cs = 28;
    if (window.innerWidth <= 768) {
        cs = Math.floor((window.innerWidth - 30) / CFG.cols);
        cs = Math.max(24, Math.min(36, cs));
    } else {
        if (CFG.mode === 'single') {
            cs = Math.floor((window.innerWidth - 80) / CFG.cols);
            cs = Math.max(24, Math.min(40, cs));
        } else {
            cs = Math.floor((window.innerWidth / 2 - 80) / CFG.cols);
            cs = Math.max(20, Math.min(32, cs));
        }
    }
    document.documentElement.style.setProperty('--cell-size', `${cs}px`);
}

function buildLogic(st) {
    st.b = Array.from({ length: CFG.rows }, () => Array(CFG.cols).fill(0));
    st.r = Array.from({ length: CFG.rows }, () => Array(CFG.cols).fill(false));
    st.f = Array.from({ length: CFG.rows }, () => Array(CFG.cols).fill(false));
    let pl = 0;
    while (pl < CFG.mines) {
        let r = Math.floor(Math.random() * CFG.rows);
        let c = Math.floor(Math.random() * CFG.cols);
        if (st.b[r][c] !== -1) {
            st.b[r][c] = -1;
            pl++;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    let nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < CFG.rows && nc >= 0 && nc < CFG.cols && st.b[nr][nc] !== -1) {
                        st.b[nr][nc]++;
                    }
                }
            }
        }
    }
}

function drawBoard(id, st) {
    const bd = id === 1 ? UI.p1.board : UI.p2.board;
    bd.style.gridTemplateColumns = `repeat(${CFG.cols}, var(--cell-size))`;
    bd.innerHTML = '';
    for (let r = 0; r < CFG.rows; r++) {
        for (let c = 0; c < CFG.cols; c++) {
            let el = document.createElement('div');
            el.className = 'cell';
            if (st.r[r][c]) {
                el.classList.add('revealed');
                if (st.b[r][c] === -1) {
                    el.classList.add('mine');
                    if (st.over && !st.win) el.classList.add('exploded');
                } else if (st.b[r][c] > 0) {
                    el.classList.add(`num-${st.b[r][c]}`);
                    el.textContent = st.b[r][c];
                }
            } else if (st.f[r][c]) {
                el.classList.add('flagged');
            }
            if (!st.over) {
                let tTimer = null;
                let tFired = false;
                let sx = 0, sy = 0;

                el.addEventListener('touchstart', e => {
                    if (e.touches.length > 1) return;
                    sx = e.touches[0].clientX;
                    sy = e.touches[0].clientY;
                    tFired = false;
                    tTimer = setTimeout(() => {
                        tFired = true;
                        rightClickCell(id, r, c);
                        if (navigator.vibrate) navigator.vibrate(40);
                    }, 350);
                }, { passive: true });

                el.addEventListener('touchmove', e => {
                    if (Math.abs(e.touches[0].clientX - sx) > 10 || Math.abs(e.touches[0].clientY - sy) > 10) {
                        if (tTimer) clearTimeout(tTimer);
                    }
                }, { passive: true });

                el.addEventListener('touchend', e => {
                    if (tTimer) clearTimeout(tTimer);
                    if (tFired) {
                        if (e.cancelable) e.preventDefault();
                    } else {
                        clickCell(id, r, c);
                    }
                }, { passive: false });

                el.addEventListener('mousedown', e => {
                    if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
                    if (e.button === 0) clickCell(id, r, c);
                    else if (e.button === 2) rightClickCell(id, r, c);
                });

                el.addEventListener('contextmenu', e => {
                    e.preventDefault();
                });
            }
            bd.appendChild(el);
        }
    }
}

function setup() {
    syncUI();
    if (STAT.p1) clearInterval(STAT.p1.intv);
    if (STAT.p2) clearInterval(STAT.p2.intv);
    STAT.p1 = initData();
    STAT.p2 = initData();
    STAT.active = false;
    STAT.turn = 1;
    buildLogic(STAT.p1);
    buildLogic(STAT.p2);
    UI.p1.time.textContent = '0';
    UI.p2.time.textContent = '0';
    UI.p1.mines.textContent = CFG.mines;
    UI.p2.mines.textContent = CFG.mines;
    UI.status.textContent = '准备就绪';
    UI.status.style.color = '';
    UI.turnInd.classList.add('hidden');
    drawBoard(1, STAT.p1);
    if (CFG.mode !== 'single') drawBoard(2, STAT.p2);
    updateTurnUI();
}

function start() {
    if (STAT.active) return;
    STAT.active = true;
    STAT.p1.intv = setInterval(() => { if (!STAT.p1.over) UI.p1.time.textContent = ++STAT.p1.t; }, 1000);
    if (CFG.mode !== 'single') {
        STAT.p2.intv = setInterval(() => { if (!STAT.p2.over) UI.p2.time.textContent = ++STAT.p2.t; }, 1000);
        if (CFG.style === 'speed' && CFG.mode === 'pve') setTimeout(aiLogicTrigger, 1000);
    }
    UI.status.textContent = '游戏正在进行';
    updateTurnUI();
}

function updateTurnUI() {
    UI.p1.wrap.classList.remove('active-turn');
    UI.p2.wrap.classList.remove('active-turn');
    if (CFG.style === 'turn' && STAT.active && !STAT.p1.over && !STAT.p2.over) {
        UI.turnInd.classList.remove('hidden');
        if (STAT.turn === 1) {
            UI.turnInd.textContent = '玩家 1 轮到你';
            UI.p1.wrap.classList.add('active-turn');
        } else {
            UI.turnInd.textContent = CFG.mode === 'pvp' ? '玩家 2 轮到你' : '电脑 轮到你';
            UI.p2.wrap.classList.add('active-turn');
        }
    } else {
        UI.turnInd.classList.add('hidden');
    }
}

function clickCell(id, r, c) {
    let st = id === 1 ? STAT.p1 : STAT.p2;
    if (CFG.style === 'turn' && STAT.turn !== id) return;
    if (st.r[r][c] || st.f[r][c]) return;
    if (!STAT.active) start();

    rev(st, r, c);
    chk(st, id);
    drawBoard(id, st);

    if (CFG.style === 'turn' && !STAT.p1.over && !STAT.p2.over) {
        STAT.turn = id === 1 ? 2 : 1;
        updateTurnUI();
        if (STAT.turn === 2 && CFG.mode === 'pve') setTimeout(aiLogicTrigger, 600);
    }
}

function rightClickCell(id, r, c) {
    let st = id === 1 ? STAT.p1 : STAT.p2;
    if (CFG.style === 'turn' && STAT.turn !== id) return;
    if (st.r[r][c]) return;
    if (!STAT.active) start();

    st.f[r][c] = !st.f[r][c];
    st.m += st.f[r][c] ? -1 : 1;
    (id === 1 ? UI.p1 : UI.p2).mines.textContent = st.m;
    drawBoard(id, st);
}

function rev(st, r, c) {
    if (r < 0 || r >= CFG.rows || c < 0 || c >= CFG.cols || st.r[r][c] || st.f[r][c]) return;
    st.r[r][c] = true;
    if (st.b[r][c] === -1) {
        st.over = true; st.win = false;
        for (let i = 0; i < CFG.rows; i++) for (let j = 0; j < CFG.cols; j++) if (st.b[i][j] === -1) st.r[i][j] = true;
        return;
    }
    if (st.b[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) rev(st, r + dr, c + dc);
    }
}

function chk(st, id) {
    if (st.over) {
        end(id, false);
        return;
    }
    let safe = 0;
    for (let r = 0; r < CFG.rows; r++) for (let c = 0; c < CFG.cols; c++) if (!st.r[r][c] && st.b[r][c] !== -1) safe++;
    if (safe === 0) {
        st.over = true; st.win = true;
        for (let r = 0; r < CFG.rows; r++) for (let c = 0; c < CFG.cols; c++) if (st.b[r][c] === -1) st.f[r][c] = true;
        (id === 1 ? UI.p1 : UI.p2).mines.textContent = '0';
        end(id, true);
    }
}

function end(id, win) {
    clearInterval(STAT.p1.intv);
    if (STAT.p2) clearInterval(STAT.p2.intv);
    UI.turnInd.classList.add('hidden');
    let n1 = '玩家 1', n2 = CFG.mode === 'pvp' ? '玩家 2' : '电脑';
    if (CFG.mode === 'single') {
        UI.status.textContent = win ? '获胜' : '失败';
        UI.status.style.color = win ? 'var(--accent)' : '#ea4335';
    } else {
        if (win) {
            UI.status.textContent = `${id === 1 ? n1 : n2} 获胜！`;
            UI.status.style.color = 'var(--accent)';
            let ost = id === 1 ? STAT.p2 : STAT.p1;
            ost.over = true;
        } else {
            UI.status.textContent = `${id === 1 ? n1 : n2} 失败！`;
            UI.status.style.color = '#ea4335';
            let ost = id === 1 ? STAT.p2 : STAT.p1;
            if (CFG.style === 'speed') ost.over = true;
        }
    }
    drawBoard(1, STAT.p1);
    if (CFG.mode !== 'single') drawBoard(2, STAT.p2);
}

function aiLogicTrigger() {
    if (!STAT.active || STAT.p2.over || STAT.p1.over || STAT.p2.aiLock) return;
    if (CFG.style === 'turn' && STAT.turn !== 2) return;
    STAT.p2.aiLock = true;

    let moves = getSmartAIMoves();
    if (moves.length === 0) {
        moves.push(fallbackAI());
    }

    let batchCount = 0;
    let limit = CFG.aiLvl === 'crazy' ? 8 : CFG.aiLvl === 'nightmare' ? 5 : CFG.aiLvl === 'hard' ? 3 : 1;

    while (moves.length > 0 && batchCount < limit && !STAT.p2.over && !STAT.p1.over) {
        let mv = moves.shift();
        if (!mv || STAT.p2.r[mv.r][mv.c]) continue;

        if (mv.act === 'f') {
            if (!STAT.p2.f[mv.r][mv.c]) {
                STAT.p2.f[mv.r][mv.c] = true;
                STAT.p2.m--;
                UI.p2.mines.textContent = STAT.p2.m;
            }
        } else if (!STAT.p2.f[mv.r][mv.c]) {
            rev(STAT.p2, mv.r, mv.c);
        }
        batchCount++;
    }

    chk(STAT.p2, 2);
    drawBoard(2, STAT.p2);
    STAT.p2.aiLock = false;

    if (!STAT.p2.over && !STAT.p1.over) {
        if (CFG.style === 'turn') {
            STAT.turn = 1;
            updateTurnUI();
        } else {
            let spd = { easy: 2000, medium: 1500, hard: 1000, nightmare: 600, crazy: 150 }[CFG.aiLvl];
            setTimeout(aiLogicTrigger, spd);
        }
    }
}

function getSmartAIMoves() {
    let st = STAT.p2;
    let moves = [];
    if (CFG.aiLvl === 'easy') return moves;

    let edge = [], unk = [];
    let constraints = [];

    for (let r = 0; r < CFG.rows; r++) {
        for (let c = 0; c < CFG.cols; c++) {
            if (!st.r[r][c] && !st.f[r][c]) {
                let adj = false;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        let nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < CFG.rows && nc >= 0 && nc < CFG.cols && st.r[nr][nc] && st.b[nr][nc] > 0) {
                            adj = true;
                        }
                    }
                }
                if (adj) edge.push({ r, c }); else unk.push({ r, c });
            }
        }
    }

    for (let r = 0; r < CFG.rows; r++) {
        for (let c = 0; c < CFG.cols; c++) {
            if (st.r[r][c] && st.b[r][c] > 0) {
                let fC = 0, eC = [];
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        let nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < CFG.rows && nc >= 0 && nc < CFG.cols) {
                            if (st.f[nr][nc]) fC++;
                            else if (!st.r[nr][nc]) eC.push({ r: nr, c: nc });
                        }
                    }
                }
                let rem = st.b[r][c] - fC;
                if (eC.length > 0) {
                    constraints.push({ cells: eC, mines: rem });
                    if (rem === eC.length) {
                        eC.forEach(cl => {
                            if (!moves.find(m => m.r === cl.r && m.c === cl.c)) moves.push({ r: cl.r, c: cl.c, act: 'f' });
                        });
                    } else if (rem === 0) {
                        eC.forEach(cl => {
                            if (!moves.find(m => m.r === cl.r && m.c === cl.c)) moves.push({ r: cl.r, c: cl.c, act: 'c' });
                        });
                    }
                }
            }
        }
    }

    if (moves.length > 0 || CFG.aiLvl === 'medium') return moves;

    let cspMoves = solveCSP(edge, unk, constraints, st);
    if (cspMoves.length > 0) return cspMoves;

    return [];
}

function solveCSP(edge, unk, constraints, st) {
    if (edge.length === 0 || constraints.length === 0) return [];

    let map = new Map();
    edge.forEach((e, i) => map.set(e.r + ',' + e.c, i));

    let mtx = constraints.map(c => {
        let row = Array(edge.length).fill(0);
        c.cells.forEach(cell => {
            let idx = map.get(cell.r + ',' + cell.c);
            if (idx !== undefined) row[idx] = 1;
        });
        return { r: row, t: c.mines };
    });

    let valid = [];
    let cur = Array(edge.length).fill(-1);
    let limit = (CFG.aiLvl === 'crazy') ? 80000 : 20000;

    function solve(idx) {
        if (valid.length > limit) return;
        if (idx === edge.length) {
            for (let i = 0; i < mtx.length; i++) {
                let s = 0;
                for (let j = 0; j < edge.length; j++) if (cur[j] && mtx[i].r[j]) s++;
                if (s !== mtx[i].t) return;
            }
            valid.push([...cur]);
            return;
        }

        let can0 = true, can1 = true;
        for (let i = 0; i < mtx.length; i++) {
            if (mtx[i].r[idx]) {
                let s = 0, rem = 0;
                for (let j = 0; j < idx; j++) if (cur[j] && mtx[i].r[j]) s++;
                for (let j = idx + 1; j < edge.length; j++) if (mtx[i].r[j]) rem++;
                if (s > mtx[i].t) { can0 = can1 = false; break; }
                if (s + 1 > mtx[i].t) can1 = false;
                if (s + rem < mtx[i].t) can0 = false;
            }
        }

        if (can0) { cur[idx] = 0; solve(idx + 1); }
        if (can1) { cur[idx] = 1; solve(idx + 1); }
    }

    solve(0);

    if (valid.length === 0) return [];

    let p = Array(edge.length).fill(0);
    for (let i = 0; i < valid.length; i++) {
        for (let j = 0; j < edge.length; j++) p[j] += valid[i][j];
    }

    let moves = [];
    let bp = 1.1, br = -1, bc = -1;

    for (let i = 0; i < edge.length; i++) {
        let prob = p[i] / valid.length;
        if (prob === 1) moves.push({ r: edge[i].r, c: edge[i].c, act: 'f' });
        else if (prob === 0) moves.push({ r: edge[i].r, c: edge[i].c, act: 'c' });

        if (prob < bp && prob > 0) {
            bp = prob; br = edge[i].r; bc = edge[i].c;
        }
    }

    if (moves.length > 0) return moves;

    if (CFG.aiLvl === 'hard') return [];

    let minM = Infinity;
    for (let i = 0; i < valid.length; i++) {
        let s = 0;
        for (let j = 0; j < edge.length; j++) s += valid[i][j];
        if (s < minM) minM = s;
    }

    let remM = st.m - minM;
    if (remM >= 0 && unk.length > 0 && CFG.aiLvl !== 'nightmare') {
        let unkP = remM / unk.length;
        if (unkP < bp) {
            let sl = unk[Math.floor(Math.random() * unk.length)];
            return [{ r: sl.r, c: sl.c, act: 'c' }];
        }
    }

    if (br !== -1 && bc !== -1) return [{ r: br, c: bc, act: 'c' }];
    return [];
}

function fallbackAI() {
    let u = [];
    for (let r = 0; r < CFG.rows; r++) for (let c = 0; c < CFG.cols; c++) if (!STAT.p2.r[r][c] && !STAT.p2.f[r][c]) u.push({ r, c });
    if (u.length === 0) return null;
    let sl = u[Math.floor(Math.random() * u.length)];
    return { r: sl.r, c: sl.c, act: 'c' };
}

window.addEventListener('resize', () => {
    syncUI();
    if (STAT.p1) drawBoard(1, STAT.p1);
    if (STAT.p2 && CFG.mode !== 'single') drawBoard(2, STAT.p2);
});

UI.mode.addEventListener('change', setup);
UI.style.addEventListener('change', setup);
UI.diff.addEventListener('change', setup);
UI.aiDiff.addEventListener('change', setup);
[UI.cRows, UI.cCols, UI.cMines].forEach(el => el.addEventListener('change', () => { if (UI.diff.value === 'custom') setup(); }));
UI.restart.addEventListener('click', setup);

UI.orbs.forEach(orb => {
    orb.addEventListener('click', () => {
        UI.orbs.forEach(o => o.classList.remove('active'));
        orb.classList.add('active');
        document.body.className = `theme-${orb.dataset.theme}`;
    });
});

setup();