// Incident Response: canvas view and controls on top of the pure model.
import { createGame } from './kit.js';
import { W, H, PLAYER_Y, POWER_MS, createInvaders, update, bugBox } from './invaders-model.js';
import { BUGS, SHIP, ZERO_DAY, POWER_UPS } from './invaders-sprites.js';

const PICKUP = {
  hotfix: 'Hotfix: faster patches',
  spread: 'Spread: three patches at once',
  rebuild: 'Firewalls rebuilt',
  rollback: 'Rollback: extra life',
};

const KIND = [0, 1, 1, 2, 2];

export function mount(host) {
  const game = createGame(host, { label: 'Incident Response game', bestKey: 'lc.invaders.best', width: W, height: H, pad: 'shooter', help: 'Arrows or A/D to move. Space fires a patch. P pauses. Catch falling power-ups.' });
  const { ctx } = game;
  let s = createInvaders();
  let raf = 0;
  let last = 0;
  const state = () => game.host.dataset.state;

  const sprite = (rows, x, y, color) => {
    ctx.fillStyle = color;
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') ctx.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
    });
  };
  const draw = () => {
    const c = game.colors();
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    const rowColor = [c.accent, c.alt, c.alt, c.fg, c.fg];
    for (const b of s.bugs) {
      if (!b.alive) continue;
      const box = bugBox(s, b);
      const art = BUGS[KIND[b.r]][s.formation.frame];
      sprite(art, box.x + (box.w - art[0].length) / 2, box.y, rowColor[b.r]);
    }
    ctx.fillStyle = c.alt;
    for (const sh of s.shields) sh.bits.forEach((row, y) => row.forEach((on, x) => { if (on) ctx.fillRect(sh.x + x, sh.y + y, 1, 1); }));
    if (!(s.player.invulnerable && Math.floor(s.player.invulnerable / 100) % 2)) sprite(SHIP, s.player.x - 6, PLAYER_Y, c.fg);
    ctx.fillStyle = c.fg;
    for (const patch of s.patches) ctx.fillRect(Math.round(patch.x), Math.round(patch.y), 1, 4);
    for (const d of s.drops) sprite(POWER_UPS[d.kind], d.x, d.y, c.alt);
    ctx.fillStyle = c.accent;
    for (const shot of s.shots) ctx.fillRect(Math.round(shot.x), Math.round(shot.y), 1, 4);
    if (s.zeroDay) sprite(ZERO_DAY, s.zeroDay.x, s.zeroDay.y, c.accent);
    for (let i = 0; i < s.lives; i++) sprite(SHIP, 6 + i * 16, H - 9, c.alt);
    ctx.fillStyle = c.dim;
    ctx.fillRect(0, H - 11, W, 1);
    // Active power: its icon and a bar that runs down with the time left.
    if (s.power) {
      sprite(POWER_UPS[s.power.kind], W - 52, H - 9, c.alt);
      ctx.fillStyle = c.alt;
      ctx.fillRect(W - 42, H - 6, Math.ceil((36 * s.power.ms) / POWER_MS), 2);
    }
  };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(t - last, 50);
    last = t;
    update(s, dt, { left: game.held.has('left'), right: game.held.has('right'), fire: game.held.has('primary') });
    game.setScore(s.score);
    if (s.collected) { game.announce(PICKUP[s.collected]); s.collected = null; }
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
