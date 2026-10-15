// Incident Response: canvas view and controls on top of the pure model.
import { createGame } from './kit.js';
import { W, H, PLAYER_Y, POWER_MS, createInvaders, update, bugBox } from './invaders-model.js';
import { BUGS, SHIP, ZERO_DAY, POWER_UPS, BOSS } from './invaders-sprites.js';

const PICKUP = {
  hotfix: 'Hotfix: faster patches',
  spread: 'Spread: three patches at once',
  rebuild: 'Firewalls rebuilt',
  rollback: 'Rollback: extra life',
  sandbox: 'Sandbox: absorbs one hit',
  gc: 'Garbage collector: enemy fire cleared',
  ratelimit: 'Rate limit: enemies slowed',
  pierce: 'Pierce: patches go through bugs',
};
// Timed powers shown in the bottom bar, in this order from the right.
const TIMED_ORDER = ['hotfix', 'spread', 'ratelimit', 'pierce'];
const FONT = '"Intel One Mono", ui-monospace, monospace';
export const waveTitle = (s) => `WAVE ${s.wave + 1}${s.boss ? ' · BOSS' : ''}`;

const KIND = [0, 1, 1, 2, 2];
const EVENTS = { wave: (s) => `Wave ${s.wave + 1}`, boss: (s) => `Wave ${s.wave + 1}: boss, Kernel Panic. Watch for bullet patterns.`, 'boss-down': () => 'Kernel Panic defeated!' };

const sprite = (ctx, rows, x, y, color, paint = {}) => {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const fill = row[i] === '#' ? color : paint[row[i]];
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
    }
  });
};

// Draws one frame of the field from the model state; c holds the theme colours. A banner, when
// given, is shown large across the middle (the wave title at the start of a wave).
export function drawField(ctx, s, c, { banner = null } = {}) {
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  const rowColor = [c.accent, c.alt, c.alt, c.fg, c.fg];
  for (const b of s.bugs) {
    if (!b.alive) continue;
    const box = bugBox(s, b);
    const art = BUGS[KIND[b.r]][s.formation.frame];
    sprite(ctx, art, box.x + (box.w - art[0].length) / 2, box.y, rowColor[b.r]);
  }
  if (s.boss) {
    // Health bar across the top, then the boss itself, flashing when hit.
    ctx.fillStyle = c.dim;
    ctx.fillRect(40, 3, W - 80, 3);
    ctx.fillStyle = c.accent;
    ctx.fillRect(40, 3, Math.ceil(((W - 80) * s.boss.hp) / s.boss.maxHp), 3);
    sprite(ctx, BOSS, s.boss.x, s.boss.y, s.boss.flash ? c.fg : c.accent, { o: c.bg });
  }
  ctx.fillStyle = c.alt;
  for (const sh of s.shields) sh.bits.forEach((row, y) => row.forEach((on, x) => { if (on) ctx.fillRect(sh.x + x, sh.y + y, 1, 1); }));
  if (!(s.player.invulnerable && Math.floor(s.player.invulnerable / 100) % 2)) sprite(ctx, SHIP, s.player.x - 6, PLAYER_Y, c.fg);
  if (s.player.sandbox) {
    ctx.strokeStyle = c.alt;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(s.player.x + 0.5, PLAYER_Y + 3.5, 10, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = c.fg;
  for (const patch of s.patches) ctx.fillRect(Math.round(patch.x), Math.round(patch.y), 1, 4);
  for (const d of s.drops) sprite(ctx, POWER_UPS[d.kind], d.x, d.y, c.alt);
  for (const shot of s.shots) {
    ctx.fillStyle = shot.boss ? c.fg : c.accent;
    ctx.fillRect(Math.round(shot.x), Math.round(shot.y), shot.w, shot.h);
  }
  if (s.zeroDay) sprite(ctx, ZERO_DAY, s.zeroDay.x, s.zeroDay.y, c.accent);
  for (let i = 0; i < s.lives; i++) sprite(ctx, SHIP, 6 + i * 16, H - 9, c.alt);
  ctx.fillStyle = c.dim;
  ctx.fillRect(0, H - 11, W, 1);
  // Active timed powers, right to left: each icon with a bar under it that runs down.
  TIMED_ORDER.filter((k) => s.powers[k]).forEach((k, i) => {
    const x = W - 13 - i * 12;
    sprite(ctx, POWER_UPS[k], x, H - 9, c.alt);
    ctx.fillStyle = c.alt;
    ctx.fillRect(x, H - 1, Math.ceil((7 * Math.min(s.powers[k], POWER_MS)) / POWER_MS), 1);
  });
  // The current stage, always visible in the middle of the bottom bar.
  ctx.fillStyle = c.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `7px ${FONT}`;
  ctx.fillText(waveTitle(s), W / 2, H - 2);
  if (banner) {
    ctx.fillStyle = c.bg;
    ctx.fillRect(30, 112, W - 60, 26);
    ctx.fillStyle = s.boss ? c.accent : c.fg;
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(banner, W / 2, 131);
  }
}

export function mount(host) {
  const game = createGame(host, { label: 'Incident Response game', bestKey: 'lc.invaders.best', width: W, height: H, pad: 'shooter', help: 'Arrows or A/D to move. Space fires a patch. P pauses. Catch falling power-ups.' });
  const { ctx } = game;
  let s = createInvaders();
  let raf = 0;
  let last = 0;
  const state = () => game.host.dataset.state;

  let banner = null;
  let bannerUntil = 0;
  const draw = () => drawField(ctx, s, game.colors(), { banner: performance.now() < bannerUntil ? banner : null });
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(t - last, 50);
    last = t;
    update(s, dt, { left: game.held.has('left'), right: game.held.has('right'), fire: game.held.has('primary') });
    game.setScore(s.score);
    if (s.collected) { game.announce(PICKUP[s.collected]); s.collected = null; }
    if (s.event) {
      game.announce(EVENTS[s.event](s));
      if (s.event !== 'boss-down') { banner = waveTitle(s); bannerUntil = performance.now() + 1800; }
      s.event = null;
    }
    if (s.over) {
      stop();
      game.finish(s.score);
      game.setState('over', { title: 'Incident closed', message: `You scored ${s.score} and reached wave ${s.wave + 1}.`, action: 'Play again' });
    }
    draw();
  };
  const start = () => {
    if (s.over || state() === 'ready') { s = createInvaders(); game.setScore(0); }
    game.setState('running');
    // The Space or Fire press that started the game shouldn't also fire a patch.
    game.held.delete('primary');
    last = performance.now();
    stop();
    raf = requestAnimationFrame(frame);
    game.focus();
  };
  const pause = () => {
    if (state() !== 'running') return;
    stop();
    game.setState('paused', { title: 'Paused', message: 'Press Space or P to continue.', action: 'Resume' });
  };

  game.onAction((a) => {
    if (a === 'pause') { if (state() === 'running') pause(); else start(); return; }
    if (a === 'primary' && state() !== 'running') start();
  });
  game.onSuspend(pause);
  game.onDestroy(stop);
  game.setState('ready', { title: 'Incident Response', message: 'Bugs are marching on production. Patch them before they reach you.', action: 'Start' });
  draw();
  game.focus();
}
