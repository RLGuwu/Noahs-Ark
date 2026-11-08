'use strict';
document.addEventListener('dragstart', e => e.preventDefault());
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const fmt = n => Math.floor(n).toLocaleString('en-US');
const I = (name, cls) => `<img src="sprites/${name}.png" class="icon${cls ? ' ' + cls : ''}">`;

const STAGE_NAMES = { 1: '1/3 – Building the Ark', 2: '2/3 – The Animals', 3: '3/3 – The Flood' };
let timers = [];
let carriedPlanks = 0;
let storyMode = false;

/* =========================================================
   TUTORIAL – Noah teaches the player before each stage
   ========================================================= */
const TUTORIAL = {
    1: [
        { pose: 'happy', text: "Hello! I'm Noah. God told me the world will be covered by a great flood, and He asked me to build an ark to save my family and the animals." },
        { pose: 'neutral', text: '"Make thee an ark of gopher wood." — Genesis 6:14' },
        { pose: 'happy', text: "Click the trees to chop them and collect wood. Every 5 wood becomes 1 plank. We need 300 planks to move on, but you can make up to 1,000 — extra planks will help us survive the flood!" },
    ],
    2: [
        { pose: 'happy', text: "The ark is built! Now God said to bring the animals aboard, two by two, male and female of every kind." },
        { pose: 'neutral', text: '"And they went in unto Noah into the ark, two and two." — Genesis 7:9' },
        { pose: 'happy', text: "Find the matching pairs of animals as fast as you can. The storm clouds are gathering!" },
        { pose: 'thinking', text: "Then lead the pairs into the pen. Point at the animals (or touch near them) and they'll walk away from you. Each pair goes into the pen with its picture, and the gate closes behind them!" },
    ],
    3: [
        { pose: 'thinking', text: "The rain has begun. God said it would last 40 days and 40 nights, covering the whole earth." },
        { pose: 'neutral', text: '"And the rain was upon the earth forty days and forty nights." — Genesis 7:12' },
        { pose: 'happy', text: "Fix the leaks in the hull, keep the animals fed, and drag the small ones to the safe pen before the lion gets them. If we make it through, God promised a rainbow!" },
    ],
};

function showTutorial(stage, cb) {
    if (!storyMode || !TUTORIAL[stage]) { cb(); return; }
    const msgs = TUTORIAL[stage];
    let idx = 0;
    const render = () => {
        $('tutImg').src = `sprites/noah_${msgs[idx].pose}.png`;
        $('tutText').textContent = msgs[idx].text;
        $('tutCount').textContent = `${idx + 1} / ${msgs.length}`;
    };
    $('tutNext').onclick = () => {
        SFX.play('next');
        idx++;
        if (idx >= msgs.length) { $('tutorial').classList.remove('active'); cb(); }
        else render();
    };
    $('tutSkip').onclick = () => { SFX.play('next'); $('tutorial').classList.remove('active'); cb(); };
    render();
    $('tutorial').classList.add('active');
}

/* =========================================================
   NAVIGATION
   ========================================================= */
function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}
function clearTimers() { timers.forEach(clearInterval); timers = []; SFX.ambientOff(); }
function overlay(title, text, btnText, cb, btn2Text, cb2) {
    $('ovTitle').innerHTML = title;
    $('ovText').innerHTML = text;
    $('ovBtn').textContent = btnText;
    $('ovBtn').onclick = () => { SFX.play('confirm'); $('overlay').classList.remove('active'); cb(); };
    const b2 = $('ovBtn2');
    if (btn2Text) {
        b2.textContent = btn2Text;
        b2.style.display = '';
        b2.onclick = () => { SFX.play('next'); $('overlay').classList.remove('active'); if (cb2) cb2(); };
    } else {
        b2.style.display = 'none';
        b2.onclick = null;
    }
    $('overlay').classList.add('active');
}
function confettiBurst(count) {
    count = count || 120;
    SFX.play('cashRegister');
    const colors = ['#e85a3c', '#f7c948', '#6cc04a', '#4aa3d8', '#b8651a', '#8a5a2b', '#fff8e6'];
    const layer = document.createElement('div');
    layer.className = 'confetti-layer';
    for (let i = 0; i < count; i++) {
        const p = document.createElement('i');
        p.style.left = Math.random() * 100 + '%';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDelay = (Math.random() * 0.4) + 's';
        p.style.animationDuration = (2 + Math.random() * 1.4) + 's';
        p.style.transform = `rotate(${Math.random() * 360}deg)`;
        layer.appendChild(p);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 3600);
}
function goHome() {
    clearTimers();
    $('overlay').classList.remove('active');
    $('tutorial').classList.remove('active');
    $('stageBadge').innerHTML = I('home') + ' Home';
    show('intro');
}
$('stageBadge').onclick = $('homeTitle').onclick = goHome;
// covers the screen, shows the next stage's name, then switches screens and uncovers it
const WIPES = {
    2: { img: 'elephant', title: 'Stage 2', sub: 'The Animals' },
    3: { img: 'wave', title: 'Stage 3', sub: 'The Flood', bg: 'radial-gradient(circle at center, #4aa3d8, #163a66)' },
    menu: { img: 'dove', title: 'The End', sub: 'Thanks for playing!', bg: 'radial-gradient(circle at center, #fffaf0, #ecd9ae)', cream: true },
};
function stageTransition(key, cb) {
    const t = WIPES[key], w = $('wipe');
    $('wipeImg').src = `sprites/${t.img}.png`;
    $('wipeTitle').textContent = t.title;
    $('wipeSub').textContent = t.sub;
    w.style.background = t.bg || '';
    SFX.play('next');
    const extra = t.cream ? ' cream' : '';
    w.className = 'wipe show' + extra;
    setTimeout(() => w.classList.add('ready'), 450);
    setTimeout(() => { cb(); w.className = 'wipe hide' + extra; }, 1700);
    setTimeout(() => { w.className = 'wipe'; }, 2300);
}
// DEBUG: press P to finish the current stage instantly (set to false before release)
const DEBUG_KEYS = true;
document.addEventListener('keydown', e => {
    if (!DEBUG_KEYS || e.repeat || e.key.toLowerCase() !== 'p') return;
    if ($('overlay').classList.contains('active') || $('tutorial').classList.contains('active') || $('wipe').className !== 'wipe') return;
    if ($('game1').classList.contains('active')) {
        if (!G1.done) { const need = GOAL - G1.total; G1.planks += need; G1.total += need; endGame1(); updateUI1(); }
        carriedPlanks = G1.planks; clearTimers(); stageTransition(2, () => goStage(2));
    } else if ($('game2').classList.contains('active')) {
        if (M.finished && H.done) return;   // cards are already sliding into the herding phase
        if (!M.finished) { M.finished = true; M.memTime = M.start ? (performance.now() - M.start) / 1000 : 0; }
        if (H.done) { H.an = []; H.start = performance.now(); }
        clearTimers(); herdWin();
    } else if ($('game3').classList.contains('active')) {
        if (!W.over) { clearTimers(); win(); }
    }
});
function goStage(n) {
    clearTimers();
    $('stageBadge').innerHTML = I('home') + ' Stage ' + STAGE_NAMES[n];
    show('game' + n);
    showTutorial(n, () => [null, startGame1, startGame2, startGame3][n]());
}
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    storyMode = !b.dataset.direct;
    if (b.dataset.go === '1' && storyMode) carriedPlanks = 0;
    goStage(+b.dataset.go);
});

/* =========================================================
   MINIGAME 1 – INCREMENTAL
   ========================================================= */
const G1 = {};
const GOAL = 300, MAX_PLANKS = 1000;
const UPGRADES = [
    { id: 'axe', icon: 'axe', name: 'Sharp axe', desc: l => `Damage per click: ${1 + l} → ${2 + l}` + (l >= 4 ? ' · hits nearby trees' : ''), base: 10, mult: 1.4, max: 10 },
    { id: 'yield', icon: 'tree', name: 'Bigger trees', desc: l => `Wood per tree: ${8 + l * 5} → ${13 + l * 5}`, base: 20, mult: 1.45 },
    { id: 'worker', icon: 'family', name: "Call a relative of Noah", desc: l => `+2 wood/s each (${l} came)`, base: 15, mult: 1.12 },
    { id: 'crew', icon: 'village', name: 'Hire villagers to work', desc: l => `+20 wood/s each (${l} hired)`, base: 150, mult: 1.15 },
    { id: 'saw', icon: 'gears', name: 'Automatic saw', desc: l => l ? `Makes ${l * 0.5} plank/s by itself → ${(l + 1) * 0.5}` : 'Makes planks by itself (0.5/s)', base: 40, mult: 1.5 },
];

function startGame1() {
    SFX.windOn();
    Object.assign(G1, { wood: 0, planks: 0, total: 0, lv: {}, sawAcc: 0, trees: [] });
    UPGRADES.forEach(u => G1.lv[u.id] = 0);
    G1.done = false;
    $('nextBtn').style.display = 'none';
    buildMap();
    buildUpgrades();
    updateUI1();
    let last = performance.now();
    timers.push(setInterval(() => {
        const now = performance.now(), dt = Math.min((now - last) / 1000, 0.5); last = now;
        G1.wood += wps() * dt;
        if (G1.lv.saw) {
            G1.sawAcc += G1.lv.saw * 0.5 * dt;
            while (G1.sawAcc >= 1 && G1.wood >= 5 && G1.total < MAX_PLANKS) { G1.sawAcc--; craft(1); }
            if (G1.wood < 5) G1.sawAcc = Math.min(G1.sawAcc, 1);
        }
        updateUI1();
    }, 100));
}
const wps = () => G1.lv.worker * 2 + G1.lv.crew * 20;
const cost = u => Math.ceil(u.base * Math.pow(u.mult, G1.lv[u.id]));
const isMax = u => u.max !== undefined && G1.lv[u.id] >= u.max;
function maxAffordable(u) {
    const cap = u.max !== undefined ? u.max : Infinity;
    let lv = G1.lv[u.id], wood = G1.wood, n = 0;
    while (lv + n < cap) {
        const c = Math.ceil(u.base * Math.pow(u.mult, lv + n));
        if (wood < c) break;
        wood -= c; n++;
    }
    return n;
}
function buyMax(u) {
    const n = maxAffordable(u);
    if (n <= 0) return;
    for (let i = 0; i < n; i++) { G1.wood -= cost(u); G1.lv[u.id]++; }
    SFX.play('upgrade');
    updateUI1();
}

function buildMap() {
    const map = $('map'); map.innerHTML = '';
    G1.trees = [];
    const spots = [];
    while (spots.length < 9) {
        const p = { x: rnd(8, 92), y: rnd(12, 88) };
        if (spots.every(s => Math.hypot((s.x - p.x) * 1.5, s.y - p.y) > 17)) spots.push(p);
    }
    spots.forEach(p => {
        const el = document.createElement('div');
        el.className = 'tree';
        el.style.left = p.x + '%'; el.style.top = p.y + '%';
        const t = { el, hp: 5, alive: true, x: p.x, y: p.y };
        el.onpointerdown = e => chop(t, e);
        render(t);
        map.appendChild(el); G1.trees.push(t);
    });
}
function render(t) {
    t.el.className = 'tree' + (t.alive ? '' : ' stump');
    t.el.innerHTML = t.alive
        ? `<img src="sprites/tree.png" class="tree-img"><div class="hp"><i style="width:${t.hp * 20}%"></i></div>`
        : '<img src="sprites/log.png" class="stump-img">';
}
const SPLASH_LVL = 5, SPLASH_R = 22;
function chop(t, e) {
    if (!t.alive) return;
    SFX.play('chop');
    const dmg = 1 + G1.lv.axe, cx = t.x, cy = t.y;
    damageTree(t, dmg, e);
    // from axe level 5: nearby trees also take half damage (at least 1)
    if (G1.lv.axe >= SPLASH_LVL) {
        const sd = Math.max(1, Math.floor(dmg / 2));
        G1.trees.forEach(o => {
            if (o !== t && o.alive && Math.hypot((o.x - cx) * 1.5, o.y - cy) < SPLASH_R) damageTree(o, sd, null);
        });
    }
    updateUI1();
}
function damageTree(t, dmg, e) {
    if (!t.alive) return;
    t.hp -= dmg;
    t.el.classList.add('hit'); setTimeout(() => t.el.classList.remove('hit'), 150);
    if (t.hp <= 0) {
        const gain = 8 + G1.lv.yield * 5;
        G1.wood += gain;
        if (e) floatText(e, '+' + gain + ' ' + I('log'));
        const stump = document.createElement('div');
        stump.className = 'tree stump';
        stump.innerHTML = '<img src="sprites/log.png" class="stump-img">';
        stump.style.left = t.x + '%'; stump.style.top = t.y + '%';
        $('map').appendChild(stump);
        setTimeout(() => stump.remove(), 2000);
        const others = G1.trees.filter(o => o !== t);
        let p, tries = 0;
        do { p = { x: rnd(8, 92), y: rnd(12, 88) }; tries++; }
        while (tries < 50 && others.some(o => Math.hypot((o.x - p.x) * 1.5, o.y - p.y) < 17));
        t.x = p.x; t.y = p.y; t.hp = 5;
        t.el.style.left = p.x + '%'; t.el.style.top = p.y + '%';
        render(t);
    } else {
        const hpEl = t.el.querySelector('.hp i'); if (hpEl) hpEl.style.width = t.hp * 20 + '%';
    }
}
function floatText(e, txt) {
    const r = $('map').getBoundingClientRect();
    const f = document.createElement('div'); f.className = 'float'; f.innerHTML = txt;
    f.style.left = (e.clientX - r.left - 15) + 'px'; f.style.top = (e.clientY - r.top - 20) + 'px';
    $('map').appendChild(f); setTimeout(() => f.remove(), 900);
}
function craft(n) {
    n = Math.min(n, MAX_PLANKS - G1.total);
    if (n <= 0 || G1.wood < 5 * n) return;
    G1.wood -= 5 * n; G1.planks += n; G1.total += n;
    if (G1.total >= GOAL && !G1.done) endGame1();
}
$('nextBtn').onclick = () => {
    overlay('Move on to the next stage?',
        `You currently have <b>${fmt(G1.planks)}</b> planks. You can keep chopping and crafting (up to ${fmt(MAX_PLANKS)}) before calling the animals, or confirm now to move on.`,
        'Confirm · Call the animals', () => { carriedPlanks = G1.planks; clearTimers(); stageTransition(2, () => goStage(2)); },
        'Keep collecting planks', null);
};
$('craftBtn').onclick = () => { SFX.play('plank'); craft(Math.max(1, Math.floor(G1.wood / 5))); updateUI1(); };

function buildUpgrades() {
    $('upgrades').innerHTML = '';
    UPGRADES.forEach(u => {
        const d = document.createElement('div'); d.className = 'upg';
        d.innerHTML = `<div><b id="t_${u.id}" class="upg-title">${I(u.icon)} ${u.name}</b></div><div class="upg-btns"><button id="b_${u.id}"></button><button id="bm_${u.id}" class="upg-max">Max</button></div>`;
        $('upgrades').appendChild(d);
        const buy = () => {
            if (!isMax(u) && G1.wood >= cost(u)) { SFX.play('upgrade'); G1.wood -= cost(u); G1.lv[u.id]++; updateUI1(); }
        };
        $('b_' + u.id).onclick = buy;
        $('t_' + u.id).onclick = buy;
        $('bm_' + u.id).onclick = () => buyMax(u);
    });
}
function updateUI1() {
    $('wood').textContent = fmt(G1.wood);
    $('planks').textContent = fmt(G1.planks);
    $('wps').textContent = wps();
    const canMake = Math.min(Math.floor(G1.wood / 5), MAX_PLANKS - G1.total);
    $('craftBtn').disabled = canMake < 1;
    $('craftBtn').innerHTML = G1.total >= MAX_PLANKS
        ? I('plank') + ' 1000 plank limit reached'
        : canMake >= 2 ? `Make ${canMake} planks (${canMake * 5} ${I('log')})` : `Make plank (5 ${I('log')} → 1 ${I('plank')})`;
    $('goalBar').style.width = Math.min(100, G1.total / GOAL * 100) + '%';
    $('goalTxt').innerHTML = `${fmt(G1.total)} / ${GOAL} planks (limit ${MAX_PLANKS})` + (G1.done ? ' – Goal reached! ' + I('confetti') : '');
    UPGRADES.forEach(u => {
        const maxed = isMax(u);
        const b = $('b_' + u.id);
        if (maxed) { b.textContent = 'MAX'; b.disabled = true; }
        else { b.textContent = fmt(cost(u)); b.disabled = G1.wood < cost(u); }
        const bm = $('bm_' + u.id);
        if (maxed) { bm.style.display = 'none'; }
        else {
            const n = maxAffordable(u);
            bm.style.display = '';
            bm.textContent = n > 1 ? `Max (x${n})` : 'Max';
            bm.disabled = n < 1;
        }
    });
}
function endGame1() {
    G1.done = true;
    $('nextBtn').style.display = 'block';
    confettiBurst();
}

/* =========================================================
   MINIGAME 2 – MEMORY
   ========================================================= */
const ANIMALS = ['elephant', 'lion', 'sheep', 'camel', 'turtle', 'giraffe', 'rabbit', 'owl'];
const MEM_TITLE = 'The animals arrive two by two';
const MEM_HINT = 'Find the pairs of matching animals. The timer starts on the first card!';
const M = {};
function startGame2() {
    SFX.grassOn();
    Object.assign(M, { first: null, lock: false, moves: 0, pairs: 0, start: 0, finished: false, memTime: 0 });
    H.done = true;
    $('memBoard').style.display = '';
    $('herd').style.display = 'none'; $('herd').classList.remove('slide-in');
    $('memStats').style.display = '';
    $('memTitle').textContent = MEM_TITLE; $('memHint').textContent = MEM_HINT;
    const deck = [...ANIMALS, ...ANIMALS];
    for (let i = deck.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [deck[i], deck[k]] = [deck[k], deck[i]]; }
    const board = $('memBoard'); board.innerHTML = '';
    deck.forEach(a => {
        const c = document.createElement('div'); c.className = 'mcard'; c.dataset.a = a;
        c.innerHTML = `<div class="in"><div class="b"><img src="sprites/log.png" class="card-back-img"></div><div class="f"><img src="sprites/${a}.png" class="card-face-img"></div></div>`;
        c.onclick = () => flipCard(c);
        board.appendChild(c);
    });
    $('memTime').textContent = '0.0'; $('memMoves').textContent = 0; $('memPairs').textContent = 0;
    timers.push(setInterval(() => {
        if (M.start && !M.finished) $('memTime').textContent = ((performance.now() - M.start) / 1000).toFixed(1);
    }, 100));
}
function flipCard(c) {
    if (M.lock || c.classList.contains('flip') || c.classList.contains('done')) return;
    if (!M.start) M.start = performance.now();
    c.classList.add('flip');
    if (!M.first) { M.first = c; return; }
    M.moves++; $('memMoves').textContent = M.moves;
    const a = M.first, b = c; M.first = null;
    if (a.dataset.a === b.dataset.a) {
        SFX.play('match');
        a.classList.replace('flip', 'done'); b.classList.replace('flip', 'done');
        $('memPairs').textContent = ++M.pairs;
        if (M.pairs === 8) endGame2();
    } else {
        SFX.play('miss');
        M.lock = true;
        setTimeout(() => { a.classList.remove('flip'); b.classList.remove('flip'); M.lock = false; }, 800);
    }
}
function endGame2() {
    M.finished = true;
    M.memTime = (performance.now() - M.start) / 1000;
    $('memTime').textContent = M.memTime.toFixed(1);
    setTimeout(() => {
        SFX.play('next');
        document.querySelectorAll('#memBoard .mcard').forEach((c, i) => {
            c.style.transitionDelay = ((i % 4) * 0.06 + Math.floor(i / 4) * 0.03) + 's';
            c.classList.add('slide-out');
        });
        setTimeout(() => {
            if (!$('game2').classList.contains('active')) return;
            $('memBoard').style.display = 'none';
            $('memStats').style.display = 'none';
            $('memTitle').textContent = 'Lead the pairs into the pen';
            $('memHint').textContent = 'Point at the animals (or touch near them) to push them away. Lead each pair into the pen with its picture. The gate closes when both are inside!';
            const h = $('herd');
            h.style.display = '';
            h.classList.remove('slide-in'); void h.offsetWidth; h.classList.add('slide-in');
            startHerd();
        }, 900);
    }, 600);
}

/* ---------- herding phase: push each pair into its own pen ---------- */
// faces: which way the sprite looks (1 = right, -1 = left); tall: height relative to the base size
const HERD_KINDS = [
    { img: 'sheep', faces: 1, speed: 150, tall: 0.8 },
    { img: 'rabbit', faces: -1, speed: 230, tall: 0.8 },
    { img: 'camel', faces: 1, speed: 130, tall: 1.05 },
    { img: 'giraffe', faces: -1, speed: 140, tall: 1.35 },
];
// pens as fractions of the field; the gate always faces the middle of the field
const PENS = [
    { x1: 0.03, x2: 0.24, y1: 0.06, y2: 0.45, gate: 'right' },
    { x1: 0.03, x2: 0.24, y1: 0.55, y2: 0.94, gate: 'right' },
    { x1: 0.76, x2: 0.97, y1: 0.06, y2: 0.45, gate: 'left' },
    { x1: 0.76, x2: 0.97, y1: 0.55, y2: 0.94, gate: 'left' },
];
const H = { done: true };

function startHerd() {
    const field = $('herd');
    field.querySelectorAll('.herd-an, .pen').forEach(e => e.remove());
    const w = field.clientWidth, h = field.clientHeight;
    const kinds = [...HERD_KINDS].sort(() => Math.random() - 0.5);
    Object.assign(H, { an: [], pens: [], pointer: null, done: false, start: performance.now(), last: performance.now(), winTime: 0 });
    PENS.forEach((p, i) => {
        const el = document.createElement('div');
        el.className = 'pen gate-' + p.gate;
        Object.assign(el.style, { left: p.x1 * 100 + '%', top: p.y1 * 100 + '%', width: (p.x2 - p.x1) * 100 + '%', height: (p.y2 - p.y1) * 100 + '%' });
        el.innerHTML = `<img src="sprites/${kinds[i].img}.png" class="pen-sign"><i class="pa"></i><i class="pg"></i><i class="pb"></i>`;
        field.appendChild(el);
        H.pens.push({ ...p, kind: kinds[i], el, closed: false });
    });
    HERD_KINDS.forEach(k => {
        for (let n = 0; n < 2; n++) {
            const el = document.createElement('div'); el.className = 'herd-an';
            el.innerHTML = `<img src="sprites/${k.img}.png">`;
            field.appendChild(el);
            H.an.push({ k, el, x: rnd(0.34, 0.66) * w, y: rnd(0.12, 0.88) * h, vx: 0, vy: 0 });
        }
    });
    timers.push(setInterval(herdTick, 16));
}

(() => {
    const field = $('herd'), cur = $('herdCursor');
    const point = e => {
        const r = field.getBoundingClientRect();
        H.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
        cur.style.display = 'block';
        cur.style.left = H.pointer.x + 'px'; cur.style.top = H.pointer.y + 'px';
    };
    const release = () => { H.pointer = null; cur.style.display = 'none'; };
    field.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') field.releasePointerCapture?.(e.pointerId); point(e); });
    field.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) point(e); });
    field.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') release(); });
    field.addEventListener('pointercancel', release);
    field.addEventListener('pointerleave', release);
})();

// fence segments of a pen in pixels: [x1, y1, x2, y2]; the gate gap is the middle half of the gate side
function penWalls(p, w, h) {
    const x1 = p.x1 * w, x2 = p.x2 * w, y1 = p.y1 * h, y2 = p.y2 * h, q = (y2 - y1) / 4;
    const gx = p.gate === 'right' ? x2 : x1, bx = p.gate === 'right' ? x1 : x2;
    const walls = [[x1, y1, x2, y1], [x1, y2, x2, y2], [bx, y1, bx, y2], [gx, y1, gx, y1 + q], [gx, y2 - q, gx, y2]];
    if (p.closed) walls.push([gx, y1 + q, gx, y2 - q]);
    return walls;
}

// pushes an animal (a circle of radius r) out of a fence segment
function collideWall(a, ox, oy, s, r) {
    const cx = Math.min(Math.max(a.x, Math.min(s[0], s[2])), Math.max(s[0], s[2]));
    const cy = Math.min(Math.max(a.y, Math.min(s[1], s[3])), Math.max(s[1], s[3]));
    let dx = a.x - cx, dy = a.y - cy, d = Math.hypot(dx, dy);
    if (d >= r) return;
    if (d < 0.01) { dx = ox - cx; dy = oy - cy; d = Math.hypot(dx, dy) || 1; if (d < 0.01) { dx = 1; dy = 0; d = 1; } }
    const nx = dx / d, ny = dy / d;
    a.x = cx + nx * r; a.y = cy + ny * r;
    const vn = a.vx * nx + a.vy * ny;
    if (vn < 0) { a.vx -= vn * nx; a.vy -= vn * ny; }
}

function herdTick() {
    if (H.done) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - H.last) / 1000); H.last = now;
    const field = $('herd');
    const w = field.clientWidth, h = field.clientHeight;
    const size = Math.max(34, Math.min(62, w * 0.065)), rad = size * 0.4, reach = size * 2.6;
    const cur = $('herdCursor');
    cur.style.width = cur.style.height = reach * 2 + 'px';
    const inPen = (a, p) => a.x > p.x1 * w + rad * 0.5 && a.x < p.x2 * w - rad * 0.5 && a.y > p.y1 * h + rad * 0.5 && a.y < p.y2 * h - rad * 0.5;
    const walls = H.pens.flatMap(p => penWalls(p, w, h));
    const inside = a => H.pens.some(p => p.kind === a.k && inPen(a, p));

    H.an.forEach(a => {
        let ax = 0, ay = 0;
        if (H.pointer) {
            const dx = a.x - H.pointer.x, dy = a.y - H.pointer.y, d = Math.hypot(dx, dy) || 1;
            if (d < reach) { const f = (1 - d / reach) * a.k.speed * 9; ax += dx / d * f; ay += dy / d * f; }
        }
        H.an.forEach(b => {
            if (b === a) return;
            const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1;
            if (d < rad * 2) { ax += dx / d * 700; ay += dy / d * 700; }
        });
        // idle animals wander a little, unless they're already in their own pen
        if (!H.pointer && !inside(a) && Math.random() < dt * 0.6) {
            a.vx += rnd(-30, 30); a.vy += rnd(-30, 30);
        }
        a.vx += ax * dt; a.vy += ay * dt;
        const sp = Math.hypot(a.vx, a.vy);
        if (sp > a.k.speed) { a.vx *= a.k.speed / sp; a.vy *= a.k.speed / sp; }
        const fr = Math.pow(0.05, dt); a.vx *= fr; a.vy *= fr;

        const ox = a.x, oy = a.y;
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < rad) { a.x = rad; a.vx = Math.max(0, a.vx); }
        if (a.x > w - rad) { a.x = w - rad; a.vx = Math.min(0, a.vx); }
        if (a.y < rad) { a.y = rad; a.vy = Math.max(0, a.vy); }
        if (a.y > h - rad) { a.y = h - rad; a.vy = Math.min(0, a.vy); }
        walls.forEach(s => collideWall(a, ox, oy, s, rad));

        a.el.style.height = size * a.k.tall + 'px';
        a.el.style.transform = `translate(${a.x}px, ${a.y}px)`;
        a.el.classList.toggle('walk', Math.hypot(a.vx, a.vy) > 15);
        if (Math.abs(a.vx) > 8) a.el.classList.toggle('flip', Math.sign(a.vx) !== a.k.faces);
    });

    // a pen closes its gate once its own pair (and nobody else) is inside
    H.pens.forEach(p => {
        if (p.closed) return;
        const inside = H.an.filter(a => inPen(a, p));
        if (inside.length === 2 && inside.every(a => a.k === p.kind)) {
            p.closed = true;
            p.el.classList.add('closed');
            SFX.play('match');
        }
    });
    if (H.pens.every(p => p.closed)) {
        H.winTime += dt;
        if (H.winTime > 0.5) herdWin();
    }
}

function herdWin() {
    H.done = true;
    H.an.forEach(a => a.el.classList.remove('walk'));
    $('herdCursor').style.display = 'none';
    const t = M.memTime, ht = (performance.now() - H.start) / 1000;
    const stars = I('star').repeat(t < 40 ? 3 : t < 70 ? 2 : 1);
    confettiBurst();
    setTimeout(() => overlay('All aboard!',
        `Memory: <b>${t.toFixed(1)}s</b> in <b>${M.moves}</b> moves<br>Herding: <b>${ht.toFixed(1)}s</b><br>${stars}<br><br>But the clouds darken… the flood has begun!`,
        'Face the flood', () => { clearTimers(); stageTransition(3, () => goStage(3)); }), 700);
}

/* =========================================================
   MINIGAME 3 – THE FLOOD
   ========================================================= */
const FARM = [
    { img: 'elephant', name: 'Elephant', drain: 1.7 }, { img: 'lion', name: 'Lion', drain: 1.7 },
    { img: 'sheep', name: 'Sheep', drain: 0.6 }, { img: 'camel', name: 'Camel', drain: 1.0 },
    { img: 'giraffe', name: 'Giraffe', drain: 1.4 }, { img: 'rabbit', name: 'Rabbit', drain: 0.4 },
];
const LEAK_SPOTS = [8, 24, 40, 56, 72, 88];          // normal leaks (random during the flood)
const EXTRA_LEAK_SPOTS = [14, 32, 48, 66];           // 4 extra holes, all open on night 40
const LEAK_ALL = [...LEAK_SPOTS, ...EXTRA_LEAK_SPOTS];
const DAYS = 40, DAY_LEN = 4;
const REPAIR_COST = 10, FEED_COST = 4, FEED_GAIN = 30;
const W = {};

function startGame3() {
    Object.assign(W, {
        day: 1, t: 0, water: 5, food: 30, planks: carriedPlanks || 300, fishCd: 0, over: false,
        leaks: LEAK_ALL.map(() => false), finalLeaks: false, sinkTimer: 0,
        an: FARM.map(f => ({ ...f, hunger: 100, dead: false })),
        crit: [], spawn: 3, eaten: 0, saved: 0,
    });
    $('lane').querySelectorAll('.critter').forEach(c => c.remove());
    $('lane').style.display = ''; document.querySelector('.lane-hint').style.display = '';
    SFX.rainOn();
    const rain = $('rain'); rain.innerHTML = '';
    for (let i = 0; i < 70; i++) {
        const d = document.createElement('i');
        d.style.left = Math.random() * 100 + '%';
        d.style.animationDuration = rnd(0.5, 1.1) + 's';
        d.style.animationDelay = -Math.random() + 's';
        rain.appendChild(d);
    }
    const hull = $('hull'); hull.innerHTML = '';
    LEAK_ALL.forEach((x, i) => {
        const b = document.createElement('button'); b.className = 'leak';
        b.innerHTML = '<img src="sprites/waterdrop.png" class="leak-img">';
        b.style.left = x + '%'; b.style.top = (i % 2 ? 64 : 47) + '%'; b.style.display = 'none';
        b.onclick = () => repair(i);
        hull.appendChild(b);
    });
    const box = $('animals'); box.innerHTML = '';
    W.an.forEach((a, i) => {
        const d = document.createElement('div'); d.className = 'an'; d.id = 'an' + i;
        d.innerHTML = `<div class="e"><img src="sprites/${a.img}.png" class="animal-img"></div><small>${a.name}</small><div class="hb"><i></i></div>`;
        d.onclick = () => feed(i);
        box.appendChild(d);
    });
    $('bailBtn').onclick = () => { if (!W.over) { SFX.play('bail'); W.water = Math.max(0, W.water - 3); draw3(); } };
    $('fishBtn').onclick = () => {
        if (W.over || W.fishCd > 0) return;
        SFX.play('fish');
        W.food += 10; W.fishCd = 6; say(I('fish') + ' You caught some food!');
    };
    say('Click the leaks ' + I('waterdrop') + ' to repair them (10 planks) and the animals to feed them (4 ' + I('apple') + ').');
    draw3();
    let last = performance.now();
    timers.push(setInterval(() => {
        const now = performance.now(), dt = Math.min((now - last) / 1000, 0.5); last = now;
        tick3(dt);
    }, 100));
}
function say(t) { $('msg').innerHTML = t; }

const SMALL = ['rabbit', 'sheep', 'turtle', 'owl'];
const SAFE_X = 14, LION_X = 88;
function spawnCritter() {
    const el = document.createElement('div');
    el.className = 'critter';
    const kind = SMALL[Math.floor(Math.random() * SMALL.length)];
    el.innerHTML = `<img src="sprites/${kind}.png" class="critter-img">`;
    el.dataset.kind = kind;
    const c = { el, x: 18, drag: false, speed: rnd(5, 7) + W.day * 0.08 };
    el.style.top = rnd(23, 61) + 'px'; el.style.left = c.x + '%';
    const lane = $('lane');
    const moveTo = e => {
        const r = lane.getBoundingClientRect();
        c.x = Math.max(1, Math.min(99, (e.clientX - r.left) / r.width * 100));
        el.style.left = c.x + '%';
        el.style.top = Math.max(23, Math.min(r.height - 23, e.clientY - r.top)) + 'px';
    };
    el.onpointerdown = e => { if (W.over) return; c.drag = true; el.classList.add('drag'); el.setPointerCapture(e.pointerId); moveTo(e); };
    el.onpointermove = e => { if (c.drag) moveTo(e); };
    el.onpointerup = el.onpointercancel = () => {
        if (!c.drag) return;
        c.drag = false; el.classList.remove('drag');
        if (c.x <= SAFE_X) { W.saved++; removeCritter(c); say(I('checkmark') + ' Little animal saved in the pen!'); }
        else if (c.x >= LION_X) eatCritter(c);
    };
    lane.appendChild(el); W.crit.push(c);
}
function removeCritter(c) { c.el.remove(); W.crit = W.crit.filter(x => x !== c); }
function eatCritter(c) {
    W.eaten++; SFX.play('animalDown'); say(I('lion') + ' The lion got the ' + (c.el.dataset.kind || 'critter') + '!');
    removeCritter(c);
}
function updateCritters(dt) {
    if (W.an[1].dead) {
        if (!W.laneOff) {
            W.laneOff = true;
            [...W.crit].forEach(removeCritter);
            $('lane').style.display = 'none';
            document.querySelector('.lane-hint').style.display = 'none';
            say(I('lion') + ' Without the lion, the small animals are safe.');
        }
        return;
    }
    W.spawn -= dt;
    if (W.spawn <= 0) { spawnCritter(); W.spawn = rnd(4, 7) - Math.min(2, W.day * 0.04); }
    [...W.crit].forEach(c => {
        if (c.drag) return;
        c.x += c.speed * dt; c.el.style.left = c.x + '%';
        if (c.x >= LION_X) eatCritter(c);
    });
}
const lostCount = () => W.an.filter(a => a.dead).length + W.eaten;
const MAX_LOST = 3;
function repair(i) {
    if (W.over || !W.leaks[i]) return;
    if (W.planks < REPAIR_COST) return say('Not enough planks to repair!');
    W.planks -= REPAIR_COST; W.leaks[i] = false; draw3();
}
function feed(i) {
    const a = W.an[i];
    if (W.over || a.dead) return;
    if (W.food < FEED_COST) return say('No food! Go fishing ' + I('fishingrod'));
    if (a.hunger > 90) return say(a.name + ' is not hungry.');
    W.food -= FEED_COST; a.hunger = Math.min(100, a.hunger + FEED_GAIN); draw3();
    floatFeed(i, FEED_COST);
}
function floatFeed(i, amount) {
    const e = document.querySelector('#an' + i + ' .e');
    if (!e) return;
    const f = document.createElement('div');
    f.className = 'feed-float';
    f.innerHTML = '-' + amount + ' ' + I('apple');
    e.appendChild(f);
    setTimeout(() => f.remove(), 900);
}
function tick3(dt) {
    if (W.over) return;
    W.t += dt;
    if (W.fishCd > 0) W.fishCd = Math.max(0, W.fishCd - dt);
    if (W.t >= DAY_LEN) { W.t -= DAY_LEN; W.day++; }
    // night 40: four extra holes open in the hull
    if (W.day === DAYS && !W.finalLeaks) {
        W.finalLeaks = true;
        for (let k = LEAK_SPOTS.length; k < W.leaks.length; k++) W.leaks[k] = true;
        SFX.play('leak');
        say('The storm is at its worst: four new holes in the hull!');
    }
    if (Math.random() < (0.12 + W.day * 0.006) * dt * 2) {
        const free = W.leaks.map((l, i) => (l || i >= LEAK_SPOTS.length) ? -1 : i).filter(i => i >= 0);
        if (free.length) { W.leaks[free[Math.floor(Math.random() * free.length)]] = true; SFX.play('leak'); }
    }
    const n = W.leaks.filter(Boolean).length;
    W.water = Math.min(100, W.water + n * 1.3 * dt);
    W.an.forEach(a => {
        if (a.dead) return;
        a.hunger -= a.drain * (1 + (W.day - 1) * 0.03) * dt;
        if (a.hunger < 30 && !a.hungrySfx) { a.hungrySfx = true; SFX.play('hungry'); }
        else if (a.hunger >= 30) a.hungrySfx = false;
        if (a.hunger <= 0) { a.dead = true; a.hunger = 0; SFX.play('animalDown'); say(`${I(a.img)} ${a.name} could not survive the hunger…`); }
    });
    updateCritters(dt);
    draw3();
    // full boat: 3 seconds to repair or bail before sinking
    if (W.water >= 100) {
        if (!W.sinkTimer) say('The boat is about to sink! Repair the holes or bail water now!');
        W.sinkTimer = (W.sinkTimer || 3) - dt;
        if (W.sinkTimer <= 0) return lose('The boat filled with water and sank! ' + I('wave', 'lg'));
    } else {
        W.sinkTimer = 0;
    }
    if (lostCount() >= MAX_LOST) return lose('Many animals died…');
    if (W.day > DAYS) win();
}
function draw3() {
    $('day').textContent = Math.min(W.day, DAYS);
    $('food').textContent = Math.floor(W.food);
    $('planks3').textContent = fmt(W.planks);
    $('waterBar').style.height = W.water + '%';
    $('waterBar').classList.toggle('danger', W.water > 70);
    $('waterTxt').textContent = Math.floor(W.water) + '%';
    $('deadInfo').innerHTML = `${I('skull')} Losses: ${lostCount()}/${MAX_LOST}  ·  ${I('bucket')} Saved: ${W.saved}`;
    $('fishBtn').disabled = W.fishCd > 0;
    $('fishBtn').innerHTML = W.fishCd > 0 ? `${I('fishingrod')} Wait ${Math.ceil(W.fishCd)}s` : `${I('fishingrod')} Fish (+10 ${I('apple')})`;
    document.querySelectorAll('#hull .leak').forEach((b, i) => b.style.display = W.leaks[i] ? 'block' : 'none');
    W.an.forEach((a, i) => {
        const el = $('an' + i);
        el.querySelector('.hb i').style.width = a.hunger + '%';
        el.classList.toggle('low', !a.dead && a.hunger < 30);
        el.classList.toggle('dead', a.dead);
    });
}
function lose(txt) {
    W.over = true; SFX.rainOff();
    overlay('The flood won…', txt + `<br>You reached day ${Math.min(W.day, DAYS)} of ${DAYS}.`, 'Try again', () => goStage(3));
}
function win() {
    W.over = true; SFX.rainOff();
    confettiBurst(200);
    overlay(I('dove', 'lg') + ' The dove returned with an olive branch!',
        `You survived 40 days and 40 nights, with ${lostCount()} loss(es) and ${W.saved} little animals saved from the lion.<br>
        <i class="verse">"I do set my bow in the cloud, and it shall be for a token of a covenant between me and the earth." – Genesis 9:13</i>`,
        'Back to menu', () => { carriedPlanks = 0; clearTimers(); stageTransition('menu', goHome); });
}
