const PRIZES = {
  mini10: { exactScore: 10, file: 'bear.svg', name: 'Gấu Bông', emoji: '🧸', desc: 'Một chú gấu bông dễ thương!' },
  mini20: { exactScore: 20, file: 'helmet.svg', name: 'Mũ Bảo Hiểm', emoji: '🪖', desc: 'Mũ bảo hiểm sành điệu!' },
  mini30: { exactScore: 30, file: 'backpack.svg', name: 'Ba Lô', emoji: '🎒', desc: 'Ba lô thời trang!' },
  mini40: { exactScore: 40, file: 'umbrella.svg', name: 'Ô Dù', emoji: '☂️', desc: 'Chiếc ô tiện lợi!' },
  grand: { exactScore: 50, file: 'voucher.svg', name: 'Giảm giá 50% cho tất cả tour Hàn Quốc', emoji: '🎫', desc: 'Giảm giá 50% cho tất cả tour Hàn Quốc!' }
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const state = {
  mode: 'idle',
  score: 0,
  best: Number(localStorage.getItem('bpFlappyBest') || 0),
  frame: 0,
  pipes: [],
  pipeSpawnGap: 92,
  bird: {
    x: canvas.width * 0.26,
    y: canvas.height * 0.45,
    radius: 18,
    vy: 0,
    rot: 0
  }
};

const physics = {
  gravity: 0.34,
  flapImpulse: -6.4,
  maxDownSpeed: 8.6,
  pipeSpeed: 2.6,
  pipeWidth: 72,
  gapHeight: 170,
  floorHeight: 82
};

const ui = {
  scoreVal: document.getElementById('scoreVal'),
  bestVal: document.getElementById('bestVal'),
  mobileScore: document.getElementById('mobileScore'),
  mobileBest: document.getElementById('mobileBest'),
  mobileScorePill: document.getElementById('mobileScorePill'),
  mobileBestPill: document.getElementById('mobileBestPill'),
  msgCard: document.getElementById('msgCard'),
  msgText: document.getElementById('msgText'),
  startBtn: document.getElementById('startBtn'),
  resetBtn: document.getElementById('resetBtn'),
  mobileResetBtn: document.getElementById('mobileResetBtn'),
  mobileFlapBtn: document.getElementById('mobileFlapBtn'),
  tapLayer: document.getElementById('tapLayer'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  modalBox: document.getElementById('modalBox'),
  modalEmoji: document.getElementById('modalEmoji'),
  modalTitle: document.getElementById('modalTitle'),
  modalSub: document.getElementById('modalSub'),
  modalPrizeDesc: document.getElementById('modalPrizeDesc'),
  modalStats: document.getElementById('modalStats'),
  modalBtn: document.getElementById('modalBtn')
};

const gameBg = new Image();
gameBg.src = 'background.jpg';

const birdFrames = {
  up: new Image(),
  mid: new Image(),
  down: new Image()
};
birdFrames.up.src = '1.svg';
birdFrames.mid.src = '2.svg';
birdFrames.down.src = '3.svg';

function init() {
  createStarfield();
  bindEvents();
  resetGame(false);
  requestAnimationFrame(loop);
}

function bindEvents() {
  ui.startBtn.addEventListener('click', () => {
    if (state.mode !== 'running') startGame();
  });
  ui.resetBtn.addEventListener('click', () => resetGame(true));
  ui.mobileResetBtn.addEventListener('click', () => resetGame(true));
  ui.mobileFlapBtn.addEventListener('click', onFlapInput);
  ui.modalBtn.addEventListener('click', () => {
    hideModal();
    resetGame(true);
  });
  ui.modalBackdrop.addEventListener('click', e => {
    if (e.target === ui.modalBackdrop) hideModal();
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      onFlapInput();
    }
  });

  canvas.addEventListener('mousedown', onFlapInput);
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    onFlapInput();
  }, { passive: false });
}

function onFlapInput() {
  if (state.mode === 'idle') {
    startGame();
  }
  if (state.mode === 'running') {
    flap();
  }
  if (state.mode === 'gameover') {
    resetGame(true);
    startGame();
  }
}

function startGame() {
  hideModal();
  state.mode = 'running';
  ui.tapLayer.classList.remove('show');
  setMessage('Nhấn hoặc Space để vượt ống. Cố lên!', 'good');
  disableStart(true);
}

function resetGame(showHint) {
  state.mode = 'idle';
  state.score = 0;
  state.frame = 0;
  state.pipes = [];
  state.bird.x = canvas.width * 0.26;
  state.bird.y = canvas.height * 0.45;
  state.bird.vy = 0;
  state.bird.rot = 0;

  disableStart(false);
  updateScoreUI();
  if (showHint) {
    setMessage('Vẫn mới, sẵn sàng. Nhấn BẮT ĐẦU để chơi.', 'warn');
  } else {
    setMessage('Sẵn sàng? Nhấn BẮT ĐẦU rồi click/space để flap.', '');
  }
  ui.tapLayer.classList.add('show');
}

function flap() {
  state.bird.vy = physics.flapImpulse;
  state.bird.rot = -0.22;
}

function loop() {
  state.frame += 1;

  if (state.mode === 'running') {
    updateBird();
    updatePipes();
    detectGameOver();
  } else if (state.mode === 'idle') {
    idleFloatBird();
  }

  render();
  requestAnimationFrame(loop);
}

function idleFloatBird() {
  state.bird.y = canvas.height * 0.45 + Math.sin(state.frame * 0.08) * 8;
  state.bird.rot = Math.sin(state.frame * 0.06) * 0.06;
}

function updateBird() {
  state.bird.vy = Math.min(state.bird.vy + physics.gravity, physics.maxDownSpeed);
  state.bird.y += state.bird.vy;
  state.bird.rot = clamp((state.bird.vy / 10) * 0.55, -0.24, 0.35);
}

function updatePipes() {
  if (state.frame % state.pipeSpawnGap === 0) {
    spawnPipe();
  }

  for (const pipe of state.pipes) {
    pipe.x -= physics.pipeSpeed;

    if (!pipe.passed && pipe.x + physics.pipeWidth < state.bird.x) {
      pipe.passed = true;
      state.score += 1;
      if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem('bpFlappyBest', String(state.best));
      }
      updateScoreUI();
      setMessage(`Tốt! Điểm hiện tại: ${state.score}`, 'good');
    }
  }

  state.pipes = state.pipes.filter(pipe => pipe.x + physics.pipeWidth > -20);
}

function spawnPipe() {
  const marginTop = 90;
  const marginBottom = physics.floorHeight + 80;
  const minGapY = marginTop + physics.gapHeight / 2;
  const maxGapY = canvas.height - marginBottom - physics.gapHeight / 2;
  const gapY = randomInt(minGapY, maxGapY);

  state.pipes.push({
    x: canvas.width + 16,
    gapY,
    passed: false
  });
}

function detectGameOver() {
  const birdTop = state.bird.y - state.bird.radius;
  const birdBottom = state.bird.y + state.bird.radius;
  const floorY = canvas.height - physics.floorHeight;

  if (birdTop <= 0 || birdBottom >= floorY) {
    finishGame();
    return;
  }

  for (const pipe of state.pipes) {
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + physics.pipeWidth;
    const inPipeX = state.bird.x + state.bird.radius > pipeLeft && state.bird.x - state.bird.radius < pipeRight;

    if (!inPipeX) continue;

    const gapTop = pipe.gapY - physics.gapHeight / 2;
    const gapBottom = pipe.gapY + physics.gapHeight / 2;
    const hitUpper = birdTop < gapTop;
    const hitLower = birdBottom > gapBottom;

    if (hitUpper || hitLower) {
      finishGame();
      return;
    }
  }
}

function finishGame() {
  state.mode = 'gameover';
  disableStart(false);
  const reward = resolvePrizeByScore(state.score);
  setMessage(`Game over! Bạn đạt ${state.score} điểm.`, 'bad');
  showModal(state.score, reward);
  if (reward && reward.key === 'grand') celebrate();
}

function resolvePrizeByScore(score) {
  const matchedPrize = Object.entries(PRIZES).find(([, prize]) => prize.exactScore === score);
  if (matchedPrize) {
    const [key, prize] = matchedPrize;
    return { key, ...prize };
  }
  return null;
}

function render() {
  drawSky();
  drawPipes();
  drawGround();
  drawBird();
  drawScoreOverlay();
}

function drawSky() {
  if (gameBg.complete && gameBg.naturalWidth > 0) {
    ctx.drawImage(gameBg, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(10, 3, 0, 0.24)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#3A1600');
    grad.addColorStop(0.6, '#2B0F00');
    grad.addColorStop(1, '#180600');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 6; i++) {
    const x = (state.frame * 0.25 + i * 95) % (canvas.width + 80) - 80;
    const y = 80 + i * 70;
    ctx.fillStyle = '#FFD0A0';
    roundRect(ctx, x, y, 76, 24, 12);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPipes() {
  for (const pipe of state.pipes) {
    const topH = pipe.gapY - physics.gapHeight / 2;
    const bottomY = pipe.gapY + physics.gapHeight / 2;
    const bottomH = canvas.height - physics.floorHeight - bottomY;

    drawPipeSegment(pipe.x, 0, physics.pipeWidth, topH, true);
    drawPipeSegment(pipe.x, bottomY, physics.pipeWidth, bottomH, false);
  }
}

function drawPipeSegment(x, y, w, h, isTop) {
  if (h <= 0) return;

  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, '#F37821');
  grad.addColorStop(0.5, '#FF9A4D');
  grad.addColorStop(1, '#BC542F');

  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  roundRect(ctx, x + 8, y + 8, 9, h - 16, 4);
  ctx.fill();

  const lipH = 18;
  const lipY = isTop ? h - lipH : y;
  ctx.fillStyle = '#FFD0A0';
  roundRect(ctx, x - 4, lipY, w + 8, lipH, 6);
  ctx.fill();
}

function drawGround() {
  const floorY = canvas.height - physics.floorHeight;
  const grad = ctx.createLinearGradient(0, floorY, 0, canvas.height);
  grad.addColorStop(0, '#D96027');
  grad.addColorStop(1, '#8A3C1B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, floorY, canvas.width, physics.floorHeight);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  for (let i = 0; i < 12; i++) {
    const x = ((state.frame * 1.4) + i * 44) % (canvas.width + 44) - 44;
    ctx.fillRect(x, floorY + 12, 18, 6);
  }
}

function drawBird() {
  ctx.save();
  ctx.translate(state.bird.x, state.bird.y);
  ctx.rotate(state.bird.rot);

  const frame = pickBirdFrame();
  const birdSize = state.bird.radius * 2.8;

  if (frame && frame.complete && frame.naturalWidth > 0) {
    ctx.drawImage(frame, -birdSize / 2, -birdSize / 2, birdSize, birdSize);
  } else {
    // Fallback if SVGs are still loading.
    ctx.beginPath();
    ctx.arc(0, 0, state.bird.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD0A0';
    ctx.fill();
  }

  ctx.restore();
}

function pickBirdFrame() {
  if (state.mode === 'idle') {
    const idleCycle = Math.floor(state.frame / 10) % 3;
    if (idleCycle === 0) return birdFrames.up;
    if (idleCycle === 1) return birdFrames.mid;
    return birdFrames.down;
  }

  if (state.bird.vy < -1.4) return birdFrames.up;
  if (state.bird.vy > 2.2) return birdFrames.down;
  return birdFrames.mid;
}

function drawScoreOverlay() {
  ctx.fillStyle = 'rgba(0,0,0,0.26)';
  roundRect(ctx, 10, 10, 120, 44, 10);
  ctx.fill();

  ctx.fillStyle = '#FFD0A0';
  ctx.font = '14px Montserrat Alternates, sans-serif';
  ctx.fillText(`Điểm: ${state.score}`, 20, 38);

  if (state.mode === 'idle') {
    ctx.fillStyle = 'rgba(255, 208, 160, 0.95)';
    ctx.font = '20px Montserrat Alternates, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Flappy BestPrice', canvas.width / 2, 92);
    ctx.textAlign = 'start';
  }
}

function updateScoreUI() {
  ui.scoreVal.textContent = state.score;
  ui.bestVal.textContent = state.best;
  ui.mobileScore.textContent = state.score;
  ui.mobileBest.textContent = state.best;
  ui.mobileScorePill.textContent = `Điểm: ${state.score}`;
  ui.mobileBestPill.textContent = `Kỷ lục: ${state.best}`;
}

function setMessage(text, styleClass) {
  ui.msgText.textContent = text;
  ui.msgCard.className = 'card msg-card' + (styleClass ? ` ${styleClass}` : '');
}

function disableStart(disabled) {
  ui.startBtn.disabled = disabled;
  ui.startBtn.textContent = disabled ? 'Đang chơi' : 'Bắt đầu';
}

function svgImg(src, cls, alt) {
  const cb = `?v=${Date.now()}`;
  return `<img src="${src}${cb}" class="${cls}" alt="${alt}" />`;
}

function showModal(score, reward) {
  if (reward) {
    if (reward.key === 'grand') {
      ui.modalEmoji.innerHTML = svgImg(reward.file, 'modal-prize-img grand-img', reward.name);
      ui.modalTitle.textContent = 'Trúng lớn!';
      ui.modalSub.textContent = 'Bạn đã đạt cột mốc giải đặc biệt.';
      ui.modalPrizeDesc.innerHTML = `<strong>${reward.desc}</strong>`;
    } else {
      ui.modalEmoji.innerHTML = svgImg(reward.file, 'modal-prize-img', reward.name);
      ui.modalTitle.textContent = 'Bạn nhận quà!';
      ui.modalSub.textContent = `Điểm của bạn: ${score}`;
      ui.modalPrizeDesc.innerHTML = `${reward.emoji} <strong>${reward.name}</strong>`;
    }
  } else {
    ui.modalEmoji.innerHTML = '<span class="modal-emoji-text">😢</span>';
    ui.modalTitle.textContent = 'Rất tiếc!';
    ui.modalSub.textContent = `Bạn đạt ${score} điểm.`;
    ui.modalPrizeDesc.textContent = 'Chưa đạt mốc quà thưởng. Thử lại nhé!';
  }

  ui.modalStats.innerHTML = `
    <div class="modal-stat-pill">Điểm<span>${score}</span></div>
    <div class="modal-stat-pill">Kỷ lục<span>${state.best}</span></div>
  `;

  ui.modalBackdrop.classList.add('show');
  ui.modalBackdrop.setAttribute('aria-hidden', 'false');
}

function hideModal() {
  ui.modalBackdrop.classList.remove('show');
  ui.modalBackdrop.setAttribute('aria-hidden', 'true');
}

function celebrate() {
  const icons = ['🎉', '✨', '🎊', '🏆', '🎁', '🔥', '💫', '⭐', '👏'];
  for (let i = 0; i < 28; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.textContent = icons[Math.floor(Math.random() * icons.length)];
      el.style.setProperty('--cf-dur', (1.4 + Math.random() * 1.3) + 's');
      el.style.setProperty('--cf-size', (0.9 + Math.random() * 1.2) + 'rem');
      el.style.left = (Math.random() * 100) + 'vw';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }, i * 80);
  }
}

function createStarfield() {
  const c = document.getElementById('starfield');
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = 1 + Math.random() * 2;
    s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${size}px;height:${size}px;--dur:${1.5 + Math.random() * 2.5}s;--del:${Math.random() * 3}s;`;
    c.appendChild(s);
  }
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

init();
