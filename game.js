/* ═══════════════════════════════════════════════
   SNAKES & LADDERS  —  game.js
   • 20-square 4×5 snaking board
   • Randomised snakes & ladders on reset
   • Step-by-step animated movement
   • Bounce-back on last roll overshoot
   • Prize squares: 4 (Teddy Bear), 8 (Helmet),
     12 (Backpack), 16 (Umbrella), 20 (Voucher)
   • Mobile sticky bar kept in sync
═══════════════════════════════════════════════ */

const ROWS = 5, COLS = 4, TOTAL = 20, MAX_ROLLS = 5;

/* ── Prize definitions ─────────────────────── */
const PRIZES = {
  4:  { file: 'bear.svg',    name: 'Gấu Bông',       emoji: '🧸', desc: 'Một chú gấu bông dễ thương!' },
  8:  { file: 'helmet.svg', name: 'Mũ Bảo Hiểm',           emoji: '⛑️', desc: 'Mũ bảo hiểm sành điệu!' },
  12: { file: 'backpack.svg',      name: 'Ba Lô',         emoji: '🎒', desc: 'Ba lô thời trang!' },
  16: { file: 'umbrella.svg',      name: 'Ô Dù',         emoji: '☂️', desc: 'Chiếc ô tiện lợi!' },
  20: { file: 'voucher.svg',       name: 'Giảm giá 50% cho tất cả tour Hàn Quốc', emoji: '🎫', desc: 'Giảm giá 50% cho tất cả tour Hàn Quốc!' },
};

/* ── Game state ────────────────────────────── */
let position  = 1;
let turnsLeft = MAX_ROLLS;
let rolling   = false;
let gameOver  = false;
let snakes    = {};
let ladders   = {};
let sqMap     = {};

/* ── DOM helper ────────────────────────────── */
const $ = id => document.getElementById(id);

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
window.addEventListener('load', () => {
  createStarfield();
  buildSquareMap();
  renderBoard();
  randomiseGame();
  placePlayer(1, false);
  updateStats();
  syncMobBar('🎮 Sẵn sàng? Nhấn TUNG!', '');
});

window.addEventListener('resize', () => {
  renderSnakesLadders();
  placePlayer(position, false);
});

/* ════════════════════════════════════════════
   SQUARE MAP  (row/col from top-left)
════════════════════════════════════════════ */
function buildSquareMap() {
  for (let sq = 1; sq <= TOTAL; sq++) {
    const rowFromBottom = Math.floor((sq - 1) / COLS);
    const posInRow      = (sq - 1) % COLS;
    const col = rowFromBottom % 2 === 0 ? posInRow : (COLS - 1 - posInRow);
    const row = ROWS - 1 - rowFromBottom;
    sqMap[sq] = { row, col };
  }
}

/* ════════════════════════════════════════════
   RENDER BOARD
════════════════════════════════════════════ */
function renderBoard() {
  const grid = $('boardGrid');
  grid.innerHTML = '';

  const cells = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let sq = 1; sq <= TOTAL; sq++) {
    const { row, col } = sqMap[sq];
    cells[row][col] = sq;
  }

  /* Warm orange-family pastel palette for board squares */
  const COLORS = [
    '#FFF3E0','#FFF8F5','#FFF0E8','#FFFBF0',
    '#FDEBD0','#FFF9F0','#FEF3E8','#FFF8EE',
    '#FFFAE4','#FEF5EE','#FFF3E0','#FFFAF4',
    '#FEF0E4','#FFF9EC','#FFF2EE','#FEF8F4',
    '#FFF0EC','#FFF3E0','#FEF8E4','#FFFDF0',
  ];

  let ci = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const sq  = cells[r][c];
      const div = document.createElement('div');
      div.className = 'sq';
      div.dataset.sq = sq;
      div.style.background = COLORS[ci++ % COLORS.length];
      div.style.gridRow    = r + 1;
      div.style.gridColumn = c + 1;

      /* Square number label */
      const numSpan = document.createElement('span');
      numSpan.className = 'sq-num';
      numSpan.textContent = sq;
      div.appendChild(numSpan);

      /* Special square icons */
      const iconSpan = document.createElement('span');
      iconSpan.className = 'sq-icon';
      if (sq === 1)  { iconSpan.textContent = '🏁'; div.classList.add('sq-start'); }
      if (sq === 20) { iconSpan.textContent = '🏆'; div.classList.add('sq-end'); }
      div.appendChild(iconSpan);

      /* Prize square decoration */
      if (PRIZES[sq]) {
        div.classList.add('sq-prize');
        const img = document.createElement('img');
        img.className = 'sq-prize-icon';
        img.src   = PRIZES[sq].file;
        img.alt   = PRIZES[sq].name;
        img.title = PRIZES[sq].name;
        img.onerror = () => { img.style.display = 'none'; };
        div.appendChild(img);
      }

      grid.appendChild(div);
    }
  }
}

/* ════════════════════════════════════════════
   RANDOMISE SNAKES & LADDERS
════════════════════════════════════════════ */
function randomiseGame() {
  /* Prize squares must never be clobbered by snake heads or ladder bases */
  const prizeSquares = new Set(Object.keys(PRIZES).map(Number));
  const used = new Set([1, 20, ...prizeSquares]);
  snakes = {}; ladders = {};

  let tries = 0;
  while (Object.keys(ladders).length < 2 && tries++ < 300) {
    const base = rnd(2, 15);
    const top  = rnd(base + 4, Math.min(19, base + 13));
    if (!used.has(base) && !used.has(top)) {
      ladders[base] = top; used.add(base); used.add(top);
    }
  }
  tries = 0;
  while (Object.keys(snakes).length < 2 && tries++ < 300) {
    const head = rnd(7, 19);
    const tail = rnd(Math.max(2, head - 13), head - 4);
    if (tail > head - 4) continue;
    if (!used.has(head) && !used.has(tail)) {
      snakes[head] = tail; used.add(head); used.add(tail);
    }
  }

  markSpecialSquares();
  renderSnakesLadders();
}

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function markSpecialSquares() {
  document.querySelectorAll('.sq').forEach(el => el.classList.remove('sq-ladder-base','sq-snake-head'));
  Object.keys(ladders).forEach(b => { const el = document.querySelector(`[data-sq="${b}"]`); if (el) el.classList.add('sq-ladder-base'); });
  Object.keys(snakes) .forEach(h => { const el = document.querySelector(`[data-sq="${h}"]`); if (el) el.classList.add('sq-snake-head'); });
}

/* ════════════════════════════════════════════
   SVG SPRITES — LADDERS & SNAKES
════════════════════════════════════════════ */
function renderSnakesLadders() {
  const svg = $('boardSvg');
  svg.innerHTML = '';
  Object.entries(ladders).forEach(([b, t]) => drawLadder(svg, +b, +t));
  Object.entries(snakes) .forEach(([h, t]) => drawSnake (svg, +h, +t));
}

function sqCenter(num) {
  const el  = document.querySelector(`[data-sq="${num}"]`);
  const svg = $('boardSvg');
  if (!el) return { x: 0, y: 0 };
  const er = el.getBoundingClientRect();
  const sr = svg.getBoundingClientRect();
  return { x: er.left - sr.left + er.width/2, y: er.top - sr.top + er.height/2 };
}

function mkSvg(tag, attrs) {
  const NS = 'http://www.w3.org/2000/svg';
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v));
  return el;
}

/* ── LADDER (gold gradient with glow) ─────── */
function drawLadder(svg, base, top) {
  const p1 = sqCenter(base), p2 = sqCenter(top);
  const dx = p2.x-p1.x, dy = p2.y-p1.y;
  const len = Math.hypot(dx, dy);
  const pw = 11, px = (-dy/len)*pw, py = (dx/len)*pw;
  const uid = 'lg'+base+'_'+top;

  const defs = mkSvg('defs',{});
  const grad = mkSvg('linearGradient',{ id:uid+'_g', gradientUnits:'userSpaceOnUse', x1:p1.x, y1:p1.y, x2:p2.x, y2:p2.y });
  [['0%','#F37821'],['45%','#FFD000'],['100%','#FFF8A0']].forEach(([o,c]) => {
    const s = mkSvg('stop',{}); s.setAttribute('offset',o); s.setAttribute('stop-color',c); grad.appendChild(s);
  });
  defs.appendChild(grad);
  const filt = mkSvg('filter',{ id:uid+'_f', x:'-40%', y:'-40%', width:'180%', height:'180%' });
  filt.appendChild(mkSvg('feGaussianBlur',{ stdDeviation:'3', result:'blur' }));
  filt.appendChild(mkSvg('feComposite',  { in:'SourceGraphic', in2:'blur', operator:'over' }));
  defs.appendChild(filt); svg.appendChild(defs);

  /* glow halos */
  [1,-1].forEach(s => svg.appendChild(mkSvg('line',{ x1:p1.x+s*px, y1:p1.y+s*py, x2:p2.x+s*px, y2:p2.y+s*py, stroke:'#FFD000','stroke-width':12,'stroke-linecap':'round', opacity:.25, filter:`url(#${uid}_f)` })));
  /* shadows */
  [1,-1].forEach(s => svg.appendChild(mkSvg('line',{ x1:p1.x+s*px+2, y1:p1.y+s*py+3, x2:p2.x+s*px+2, y2:p2.y+s*py+3, stroke:'rgba(0,0,0,.3)','stroke-width':7,'stroke-linecap':'round' })));
  /* rails */
  [1,-1].forEach(s => {
    svg.appendChild(mkSvg('line',{ x1:p1.x+s*px, y1:p1.y+s*py, x2:p2.x+s*px, y2:p2.y+s*py, stroke:`url(#${uid}_g)`,'stroke-width':7,'stroke-linecap':'round' }));
    svg.appendChild(mkSvg('line',{ x1:p1.x+s*px, y1:p1.y+s*py, x2:p2.x+s*px, y2:p2.y+s*py, stroke:'rgba(255,255,255,.50)','stroke-width':2.5,'stroke-linecap':'round','stroke-dasharray':'4 8' }));
  });
  /* rungs */
  const steps = Math.max(3, Math.floor(len/24));
  for (let i = 1; i < steps; i++) {
    const t = i/steps, rx = p1.x+dx*t, ry = p1.y+dy*t;
    svg.appendChild(mkSvg('line',{ x1:rx+px+1, y1:ry+py+2, x2:rx-px+1, y2:ry-py+2, stroke:'rgba(0,0,0,.25)','stroke-width':5,'stroke-linecap':'round' }));
    svg.appendChild(mkSvg('line',{ x1:rx+px, y1:ry+py, x2:rx-px, y2:ry-py, stroke:`url(#${uid}_g)`,'stroke-width':5,'stroke-linecap':'round' }));
    svg.appendChild(mkSvg('line',{ x1:rx+px, y1:ry+py, x2:rx-px, y2:ry-py, stroke:'rgba(255,255,255,.55)','stroke-width':2,'stroke-linecap':'round' }));
  }
  /* end caps */
  [p1,p2].forEach(p => {
    svg.appendChild(mkSvg('circle',{ cx:p.x+px, cy:p.y+py, r:5, fill:'#FFD000', stroke:'#fff','stroke-width':1.5 }));
    svg.appendChild(mkSvg('circle',{ cx:p.x-px, cy:p.y-py, r:5, fill:'#FFD000', stroke:'#fff','stroke-width':1.5 }));
  });
  /* top badge */
  svg.appendChild(mkSvg('circle',{ cx:p2.x, cy:p2.y-16, r:10, fill:'#F37821', opacity:.90 }));
  const badge = mkSvg('text',{ x:p2.x, y:p2.y-16,'text-anchor':'middle','dominant-baseline':'middle','font-size':13 });
  badge.textContent = '🪜'; svg.appendChild(badge);
}

/* ── SNAKE (neon green gradient, cartoon head) */
function drawSnake(svg, head, tail) {
  const p1 = sqCenter(head), p2 = sqCenter(tail);
  const dx = p2.x-p1.x, dy = p2.y-p1.y;
  const len = Math.hypot(dx, dy);
  const pw = 24, px = (-dy/len)*pw, py = (dx/len)*pw;
  const uid = 'sn'+head+'_'+tail;

  const defs = mkSvg('defs',{});
  const grad = mkSvg('linearGradient',{ id:uid+'_g', gradientUnits:'userSpaceOnUse', x1:p1.x, y1:p1.y, x2:p2.x, y2:p2.y });
  [['0%','#00E676'],['40%','#00BCD4'],['80%','#76FF03'],['100%','#CCFF90']].forEach(([o,c]) => {
    const s = mkSvg('stop',{}); s.setAttribute('offset',o); s.setAttribute('stop-color',c); grad.appendChild(s);
  });
  defs.appendChild(grad);
  const filt = mkSvg('filter',{ id:uid+'_f', x:'-50%', y:'-50%', width:'200%', height:'200%' });
  filt.appendChild(mkSvg('feGaussianBlur',{ stdDeviation:'4', result:'blur' }));
  filt.appendChild(mkSvg('feComposite',  { in:'SourceGraphic', in2:'blur', operator:'over' }));
  defs.appendChild(filt); svg.appendChild(defs);

  const q1 = { x:p1.x+dx*.25+px, y:p1.y+dy*.25+py };
  const q2 = { x:p1.x+dx*.50-px, y:p1.y+dy*.50-py };
  const q3 = { x:p1.x+dx*.75+px, y:p1.y+dy*.75+py };
  const d  = `M ${p1.x} ${p1.y} Q ${q1.x} ${q1.y} ${p1.x+dx*.375} ${p1.y+dy*.375} Q ${q2.x} ${q2.y} ${p1.x+dx*.625} ${p1.y+dy*.625} Q ${q3.x} ${q3.y} ${p2.x} ${p2.y}`;

  svg.appendChild(mkSvg('path',{ d, fill:'none', stroke:'#00E676','stroke-width':18,'stroke-linecap':'round', opacity:.22, filter:`url(#${uid}_f)` }));
  svg.appendChild(mkSvg('path',{ d, fill:'none', stroke:'rgba(0,0,0,.32)','stroke-width':13,'stroke-linecap':'round','stroke-linejoin':'round' }));
  svg.appendChild(mkSvg('path',{ d, fill:'none', stroke:`url(#${uid}_g)`,'stroke-width':11,'stroke-linecap':'round','stroke-linejoin':'round' }));
  svg.appendChild(mkSvg('path',{ d, fill:'none', stroke:'rgba(255,255,255,.38)','stroke-width':4,'stroke-linecap':'round','stroke-dasharray':'5 9' }));

  /* Head */
  svg.appendChild(mkSvg('circle',{ cx:p1.x, cy:p1.y, r:16, fill:'#00E676', opacity:.28, filter:`url(#${uid}_f)` }));
  svg.appendChild(mkSvg('circle',{ cx:p1.x, cy:p1.y, r:14, fill:'#00C853', stroke:'#fff','stroke-width':2 }));
  svg.appendChild(mkSvg('circle',{ cx:p1.x, cy:p1.y, r:11, fill:'#00E676' }));
  svg.appendChild(mkSvg('ellipse',{ cx:p1.x-6, cy:p1.y+4, rx:3.5, ry:2, fill:'rgba(255,80,80,.45)' }));
  svg.appendChild(mkSvg('ellipse',{ cx:p1.x+6, cy:p1.y+4, rx:3.5, ry:2, fill:'rgba(255,80,80,.45)' }));
  [-4,4].forEach(ex => {
    svg.appendChild(mkSvg('circle',{ cx:p1.x+ex, cy:p1.y-3, r:3.2, fill:'#fff' }));
    svg.appendChild(mkSvg('circle',{ cx:p1.x+ex, cy:p1.y-3, r:1.6, fill:'#1a1a2e' }));
    svg.appendChild(mkSvg('circle',{ cx:p1.x+ex+.8, cy:p1.y-3.8, r:.7, fill:'#fff' }));
  });
  svg.appendChild(mkSvg('line',{ x1:p1.x, y1:p1.y+10, x2:p1.x-3, y2:p1.y+15, stroke:'#FF1744','stroke-width':1.8,'stroke-linecap':'round' }));
  svg.appendChild(mkSvg('line',{ x1:p1.x, y1:p1.y+10, x2:p1.x+3, y2:p1.y+15, stroke:'#FF1744','stroke-width':1.8,'stroke-linecap':'round' }));
  /* Tail */
  svg.appendChild(mkSvg('circle',{ cx:p2.x, cy:p2.y, r:7, fill:'#CCFF90', stroke:'rgba(255,255,255,.5)','stroke-width':1.5 }));
}

/* ════════════════════════════════════════════
   PLAYER POSITIONING
════════════════════════════════════════════ */
function placePlayer(sq, animate, animClass = 'hop') {
  const tok  = $('playerToken');
  const wrap = $('boardWrap');
  const sqEl = document.querySelector(`[data-sq="${sq}"]`);
  if (!sqEl || !wrap) return;

  const wr = wrap.getBoundingClientRect();
  const sr = sqEl.getBoundingClientRect();
  tok.style.left = (sr.left - wr.left + sr.width/2)  + 'px';
  tok.style.top  = (sr.top  - wr.top  + sr.height/2) + 'px';

  if (animate) {
    tok.classList.remove('hop','slide','climb','bounce');
    void tok.offsetWidth; // force reflow
    tok.classList.add(animClass);
    setTimeout(() => tok.classList.remove(animClass), 500);
  }
}

/* ════════════════════════════════════════════
   PRIZE ODDS  (last roll only)
   Grand prize sq20 : 0.02%  independent
   Mini prize sq4/8/12/16 : 15% each independent
   Returns a forced dice value (1-6) or null
════════════════════════════════════════════ */
function computeLastRoll(pos) {
  const GRAND_CHANCE = 0.0002;   // 0.02%
  const MINI_CHANCE  = 0.15;     // 15%

  // Build every (roll → prize_sq) mapping reachable from pos.
  // Two paths to a prize square:
  //   Direct : pos + roll === sq           → roll = sq - pos
  //   Bounce : pos + roll > 20 → land at (20 - overshoot) === sq
  //            overshoot = pos + roll - 20, so sq = 20 - (pos+roll-20) = 40 - pos - roll
  //            → roll = 40 - pos - sq  (only valid if sq < 20)
  const candidates = [];
  for (const sqStr of Object.keys(PRIZES)) {
    const sq = +sqStr;

    const directRoll = sq - pos;
    if (directRoll >= 1 && directRoll <= 6) {
      candidates.push({ roll: directRoll, sq });
    }

    if (sq < 20) {
      const bounceRoll = 40 - pos - sq;
      if (bounceRoll >= 1 && bounceRoll <= 6) {
        candidates.push({ roll: bounceRoll, sq });
      }
    }
  }

  // Evaluate each candidate independently.
  // Grand prize wins over any mini prize if both fire.
  let forcedRoll = null;
  let foundGrand = false;

  for (const c of candidates) {
    const isGrand  = (c.sq === 20);
    const chance   = isGrand ? GRAND_CHANCE : MINI_CHANCE;

    if (Math.random() < chance) {
      if (isGrand) {
        forcedRoll = c.roll;
        foundGrand = true;
        break;          // grand prize takes priority, stop immediately
      } else if (!foundGrand && forcedRoll === null) {
        forcedRoll = c.roll;  // first mini-prize that fires wins
      }
    }
  }

  return forcedRoll;   // null → caller uses normal random roll
}

/* ════════════════════════════════════════════
   ROLL DICE  (main game loop)
════════════════════════════════════════════ */
async function rollDice() {
  if (rolling || gameOver || turnsLeft <= 0) return;

  rolling = true;
  setRollDisabled(true);
  addRipple($('rollBtn'));

  /* Capture whether this is the last roll BEFORE decrement */
  const isLastRoll = (turnsLeft === 1);

  /* Animate dice */
  const diceBox  = $('dice');
  const mobDice  = $('mobBarDice');
  diceBox.classList.add('rolling');
  if (mobDice) mobDice.classList.add('rolling');

  let flashTimer = setInterval(() => {
    const v = Math.ceil(Math.random() * 6);
    $('diceVal').textContent = v;
    if (mobDice) mobDice.textContent = v;
  }, 75);

  await sleep(650);
  clearInterval(flashTimer);
  diceBox.classList.remove('rolling');
  if (mobDice) mobDice.classList.remove('rolling');

  const roll = isLastRoll
    ? (computeLastRoll(position) ?? Math.ceil(Math.random() * 6))
    : Math.ceil(Math.random() * 6);
  $('diceVal').textContent = roll;
  if (mobDice) mobDice.textContent = roll;

  const rl = $('rollLabel');
  if (rl) rl.textContent = isLastRoll ? `⚠️ Lượt cuối: ${roll}!` : `Bạn tung được: ${roll} 🎲`;
  const ml = $('mobBarLbl');
  if (ml) ml.textContent = isLastRoll ? `Cuối! Tung ${roll}` : `Tung: ${roll}`;

  /* Decrement turns */
  turnsLeft--;
  updateStats();

  /* ── MOVEMENT PHASE ── */
  let didBounce = false;

  if (position + roll > TOTAL) {
    /* BOUNCE-BACK on ANY roll: walk forward to 20, then bounce back by overshoot */
    const overshoot    = (position + roll) - TOTAL;
    const bounceTarget = TOTAL - overshoot;

    /* Step forward to TOTAL */
    for (let p = position + 1; p <= TOTAL; p++) {
      position = p;
      placePlayer(p, true, 'hop');
      await sleep(200);
      updateStats();
    }

    setMsg(`↩️ Quá xa! Bật ngược ${overshoot} bước…`, 'bounce-msg');
    await sleep(480);

    /* Step backward from TOTAL to bounceTarget */
    for (let p = TOTAL - 1; p >= bounceTarget; p--) {
      position = p;
      placePlayer(p, true, 'bounce');
      await sleep(200);
      updateStats();
    }

    didBounce = true;

  } else {
    /* Normal movement — snapshot target BEFORE mutating position */
    const target = position + roll;
    for (let p = position + 1; p <= target; p++) {
      position = p;
      placePlayer(p, true, 'hop');
      await sleep(230);
      updateStats();
    }
  }

  /* ── SNAKE / LADDER CHECK (runs after bounce or normal move) ── */
  if (ladders[position]) {
    const dest = ladders[position];
    setMsg(`🪜 THANG! Leo từ ${position} → ${dest}!`, 'ladder-msg');
    await sleep(550);
    position = dest;
    placePlayer(dest, true, 'climb');
    await sleep(350);
    updateStats();

  } else if (snakes[position]) {
    const dest = snakes[position];
    setMsg(`🐍 RẮN! Tụt từ ${position} → ${dest}!`, 'snake-msg');
    await sleep(550);
    position = dest;
    placePlayer(dest, true, 'slide');
    await sleep(350);
    updateStats();

  } else if (didBounce) {
    setMsg(`↩️ Bật ngược về Ô ${position}.`, 'bounce-msg');
  } else {
    setMsg(`🎲 Tung ${roll}! Hiện tại ở Ô ${position}.`, '');
  }

  /* ── PRIZE / WIN CHECK ── */
  /* Square 20 (grand prize) always ends the game immediately on any roll.
     Mini prizes (4,8,12,16) only trigger on the last roll. */
  if (position === 20) {
    await sleep(400);
    setMsg('🏆 TRÚNG LỚN! Bạn đã đến Ô 20!', 'win');
    $('boardWrap').classList.add('game-end');
    setTimeout(() => $('boardWrap').classList.remove('game-end'), 800);
    gameOver = true;
    await sleep(700);
    showModal(20, MAX_ROLLS - turnsLeft);
    rolling = false;
    return;
  }

  if (isLastRoll && PRIZES[position]) {
    await sleep(400);
    const prize = PRIZES[position];
    setMsg(`🎁 Trúng giải! Bạn dừng tại Ô ${position} — ${prize.emoji} ${prize.name}!`, 'prize-msg');
    gameOver = true;
    await sleep(700);
    showModal(position, MAX_ROLLS - turnsLeft);
    rolling = false;
    return;
  }

  /* ── OUT OF ROLLS (no prize) ── */
  if (turnsLeft <= 0) {
    await sleep(700);
    setMsg(`😢 Hết lượt! Dừng tại Ô ${position}. Không trúng giải lần này.`, 'lose');
    gameOver = true;
    await sleep(700);
    showModal(position, MAX_ROLLS);
    rolling = false;
    return;
  }

  rolling = false;
  setRollDisabled(false);
}

/* ════════════════════════════════════════════
   RESET
════════════════════════════════════════════ */
function resetGame() {
  hideModal();
  position  = 1;
  turnsLeft = MAX_ROLLS;
  rolling   = false;
  gameOver  = false;

  randomiseGame();
  placePlayer(1, false);
  updateStats();
  setMsg('🔄 Bàn mới! Giải thưởng mới. Chúc may mắn!', '');
  syncMobBar('🔄 Bàn mới! Chúc may mắn!', '');

  $('diceVal').textContent = '?';
  const mobD = $('mobBarDice'); if (mobD) mobD.textContent = '?';
  const rl   = $('rollLabel');  if (rl)   rl.textContent   = 'Tung xúc xắc để bắt đầu!';
  const ml   = $('mobBarLbl'); if (ml)   ml.textContent   = 'Nhấn TUNG!';
  setRollDisabled(false);
}

/* ════════════════════════════════════════════
   UI HELPERS
════════════════════════════════════════════ */
function updateStats() {
  const tv = `${turnsLeft} / ${MAX_ROLLS}`;
  const pv = `Ô ${position}`;
  const isLast = turnsLeft === 1 && !gameOver;

  const tvEl = $('turnsVal');
  if (tvEl) {
    tvEl.textContent = tv;
    tvEl.className   = 'stat-val' + (isLast ? ' last-roll-warning' : '');
  }
  const pvEl = $('posVal');
  if (pvEl) pvEl.textContent = pv;

  /* Mobile strip */
  const mt = $('mobTurns');
  if (mt) {
    mt.textContent = tv;
    mt.className   = 'mob-stat-val' + (isLast ? ' last-roll-warning' : '');
  }
  const mp = $('mobPos');
  if (mp) mp.textContent = `Ô ${position}`;
}

function setMsg(text, cls) {
  const card = $('msgCard');
  if (card) {
    card.className = 'card msg-card' + (cls ? ' ' + cls : '');
    const mt = $('msgText'); if (mt) mt.textContent = text;
  }
  syncMobBar(text, cls);
}

function syncMobBar(text, cls) {
  const mob = $('mobBarMsg');
  if (!mob) return;
  mob.className   = 'mob-bar-msg' + (cls ? ' ' + cls : '');
  mob.textContent = text;
}

function setRollDisabled(disabled) {
  const rb  = $('rollBtn');
  const mrb = $('mobRollBtn');
  if (rb)  rb.disabled  = disabled;
  if (mrb) mrb.disabled = disabled;
}

function addRipple(btn) {
  if (!btn) return;
  const span = document.createElement('span');
  span.className = 'ripple';
  btn.appendChild(span);
  setTimeout(() => span.remove(), 600);
}

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }


/* ════════════════════════════════════════════
   RESULT MODAL
   Prize is determined solely by finalPos:
     sq 20       → grand prize (voucher)
     sq 4/8/12/16 → corresponding mini prize
     anything else → no prize
════════════════════════════════════════════ */

/* Render SVG as <img> with cache-bust so the browser never reuses a stale render */
function svgImg(src, cls, alt) {
  const cb = `?v=${Date.now()}`;
  return `<img src="${src}${cb}" class="${cls}" alt="${alt}" onerror="this.style.opacity='0'" />`;
}

function showModal(finalPos, rollsUsed) {
  const backdrop = $('modalBackdrop');
  const box      = $('modalBox');
  box.classList.remove('modal-grand', 'modal-prize', 'modal-lose');

  const prizeArea = $('modalEmoji');

  if (finalPos === 20) {
    /* ── GRAND PRIZE: player landed on sq 20 ── */
    box.classList.add('modal-grand');
    prizeArea.innerHTML = svgImg('voucher.svg', 'modal-prize-img grand-img', 'Grand Prize Voucher');
    $('modalTitle').textContent = '🎉 TRÚNG LỚN!';
    $('modalSub').textContent   = 'Bạn đã trúng GIẢI LỚN!';
    const pd = $('modalPrizeDesc');
    pd.className = 'modal-prize-desc';
    pd.innerHTML = `<strong>Giảm 7,5 Triệu VND</strong> cho đơn hàng nhóm tiếp theo của bạn!`;
    celebrate();

  } else if (PRIZES[finalPos]) {
    /* ── MINI PRIZE: player landed on sq 4, 8, 12 or 16 ── */
    const prize = PRIZES[finalPos];
    box.classList.add('modal-prize');
    prizeArea.innerHTML = svgImg(prize.file, 'modal-prize-img', prize.name);
    $('modalTitle').textContent = '🎁 BẠN NHẬN QUÀ!';
    $('modalSub').textContent   = `Bạn dừng tại Ô ${finalPos}!`;
    const pd = $('modalPrizeDesc');
    pd.className = 'modal-prize-desc';
    pd.innerHTML = `${prize.emoji} <strong>${prize.name}</strong>`;

  } else {
    /* ── NO PRIZE ── */
    box.classList.add('modal-lose');
    prizeArea.innerHTML = `<span class="modal-emoji-text">😢</span>`;
    $('modalTitle').textContent = 'RẤT TIẾC!';
    $('modalSub').textContent   = 'Không trúng giải lần này — chúc may mắn lần sau!';
    const pd = $('modalPrizeDesc');
    pd.className   = 'modal-prize-desc no-prize';
    pd.textContent = `Bạn dừng tại Ô ${finalPos}. Thử lại nhé!`;
  }

  $('modalStats').innerHTML = `
    <div class="modal-stat-pill">Ô Cuối<span>${finalPos}</span></div>
    <div class="modal-stat-pill">Số Lượt<span>${rollsUsed} / ${MAX_ROLLS}</span></div>
  `;

  backdrop.classList.add('show');
  backdrop.setAttribute('aria-hidden', 'false');
}

function hideModal() {
  const bd = $('modalBackdrop');
  if (bd) { bd.classList.remove('show'); bd.setAttribute('aria-hidden','true'); }
}

/* ════════════════════════════════════════════
   CONFETTI  (grand prize celebration)
════════════════════════════════════════════ */
function celebrate() {
  const icons = ['🎉','🧡','⭐','✨','🎊','🎫','🎈','💫','🔥'];
  for (let i = 0; i < 28; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.textContent = icons[Math.floor(Math.random() * icons.length)];
      el.style.setProperty('--cf-dur',  (1.4 + Math.random()*1.3) + 's');
      el.style.setProperty('--cf-del',  '0s');
      el.style.setProperty('--cf-size', (0.9 + Math.random()*1.2) + 'rem');
      el.style.left = (Math.random()*100) + 'vw';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }, i * 80);
  }
}

/* ════════════════════════════════════════════
   STARFIELD
════════════════════════════════════════════ */
function createStarfield() {
  const c = $('starfield');
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = 1 + Math.random() * 2.0;
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;width:${size}px;height:${size}px;--dur:${1.5+Math.random()*2.5}s;--del:${Math.random()*3}s;`;
    c.appendChild(s);
  }
}

/* ════════════════════════════════════════════
   WIRE UP BUTTONS
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  $('rollBtn')      .addEventListener('click', rollDice);
  $('resetBtn')     .addEventListener('click', resetGame);
  $('modalBtn')     .addEventListener('click', resetGame);
  $('mobRollBtn')   .addEventListener('click', rollDice);
  $('mobResetBtn')  .addEventListener('click', resetGame);
  $('modalBackdrop').addEventListener('click', e => {
    if (e.target === $('modalBackdrop')) hideModal();
  });
});
