// Incident Response: pure model of an original fixed shooter. Bugs march in formation,
// the on-call ship fires patches, firewalls erode, and a zero-day crosses for bonus points.
// Destroyed bugs sometimes, and the zero-day always, drop a power-up for the ship to catch.
// Every third wave is a boss fight: Kernel Panic sweeps the top and fills the field with bullets.
export const W = 240;
export const H = 260;
export const PLAYER_Y = H - 22;
export const ROW_POINTS = [30, 20, 20, 10, 10];
export const ZERO_DAY_POINTS = [50, 100, 150, 300];
export const POWER_KINDS = ['hotfix', 'spread', 'rebuild', 'rollback', 'sandbox', 'gc', 'ratelimit', 'pierce'];
// Timed powers run side by side, each on its own clock; the rest act once when caught.
const TIMED = new Set(['hotfix', 'spread', 'ratelimit', 'pierce']);
export const POWER_MS = 8000;
const DROP_CHANCE = 0.08;
const MAX_LIVES = 5;
// Match the 32×14 BOSS art in invaders-sprites.js (m5-boss checks they agree).
export const BOSS_W = 32;
export const BOSS_H = 14;
const BOSS_Y = 12;
const MAX_BULLETS = 160;
// Every third wave (index 2, 5, 8…) is a boss wave; each boss is tougher than the last.
export const isBossWave = (wave) => wave % 3 === 2;
const COLS = 8;
const ROWS = 5;
const CELL_W = 22;
const CELL_H = 18;
const BUG_W = 12;
const BUG_H = 8;
const SHIELD_W = 22;
const SHIELD_H = 14;

function shieldBits() {
  const rows = [];
  for (let y = 0; y < SHIELD_H; y++) {
    const row = [];
    for (let x = 0; x < SHIELD_W; x++) {
      const corner = y < 3 && (x + y < 3 || SHIELD_W - 1 - x + y < 3);
      const notch = y > SHIELD_H - 6 && x > 6 && x < SHIELD_W - 7;
      row.push(!corner && !notch);
    }
    rows.push(row);
  }
  return rows;
}

function createBoss(level) {
  const hp = 30 + 15 * (level - 1);
  return { level, x: (W - BOSS_W) / 2, y: BOSS_Y, w: BOSS_W, h: BOSS_H, hp, maxHp: hp, dir: 1, flash: 0, spin: 0, timers: { fan: 300, ring: 600, spiral: 0 } };
}

function newWave(s) {
  s.bugs = [];
  s.boss = null;
  s.event = isBossWave(s.wave) ? 'boss' : 'wave';
  if (isBossWave(s.wave)) s.boss = createBoss(Math.floor(s.wave / 3) + 1);
  else for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) s.bugs.push({ r, c, alive: true });
  s.formation = { x: 24, y: 36 + 8 * Math.min(s.wave, 4), dir: 1, timer: 0, frame: 0 };
  s.shots = [];
  s.patches = [];
  s.drops = [];
}

export function createInvaders(rand = Math.random) {
  const s = { rand, score: 0, lives: 3, wave: 0, over: false, player: { x: W / 2, invulnerable: 0, sandbox: false }, patches: [], drops: [], powers: {}, collected: null, boss: null, event: null, breather: 0, shots: [], zeroDay: null, zeroDayTimer: 15000, shields: [], bugs: [], formation: null };
  s.shields = [0, 1, 2].map((i) => ({ x: Math.round((W * (i + 1)) / 4 - SHIELD_W / 2), y: PLAYER_Y - 34, bits: shieldBits() }));
  newWave(s);
  return s;
}

export const bugBox = (s, b) => ({ x: s.formation.x + b.c * CELL_W, y: s.formation.y + b.r * CELL_H, w: BUG_W, h: BUG_H });
const alive = (s) => s.bugs.filter((b) => b.alive);
export const stepMs = (s) => Math.max(40, (60 + (540 * alive(s).length) / (ROWS * COLS)) * 0.85 ** s.wave);
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function erode(shield, px, py, radius = 2) {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const bx = Math.round(px - shield.x + x);
      const by = Math.round(py - shield.y + y);
      if (x * x + y * y <= radius * radius && shield.bits[by]?.[bx]) shield.bits[by][bx] = false;
    }
  }
}

function hitsShield(s, shot) {
  for (const sh of s.shields) {
    const bx = Math.round(shot.x - sh.x);
    const by = Math.round(shot.y - sh.y);
    for (let dy = 0; dy < shot.h; dy++) {
      if (sh.bits[by + dy]?.[bx]) { erode(sh, shot.x, shot.y + dy); return true; }
    }
  }
  return false;
}

const drop = (s, x, y) => s.drops.push({ kind: POWER_KINDS[Math.floor(s.rand() * POWER_KINDS.length)], x: x - 3, y, w: 7, h: 7 });

// Timed: hotfix (faster patches), spread (three patches), ratelimit (enemies at half speed),
// pierce (patches pass through bugs); catching one again adds time, up to twice the duration.
// Instant: rebuild (firewalls), rollback (a life), sandbox (absorbs one hit), gc (clears enemy fire).
function collect(s, kind) {
  if (TIMED.has(kind)) s.powers[kind] = Math.min((s.powers[kind] ?? 0) + POWER_MS, 2 * POWER_MS);
  else if (kind === 'rebuild') s.shields.forEach((sh) => { sh.bits = shieldBits(); });
  else if (kind === 'rollback') s.lives = Math.min(MAX_LIVES, s.lives + 1);
  else if (kind === 'sandbox') s.player.sandbox = true;
  else if (kind === 'gc') s.shots = [];
  s.collected = kind;
}

// Bullet patterns. Angles are in radians from the +x axis; π/2 points straight down.
function bullet(s, x, y, angle, speed) {
  if (s.shots.length < MAX_BULLETS) s.shots.push({ x, y, w: 2, h: 2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, boss: true });
}

function updateBoss(s, dt) {
  const b = s.boss;
  const sec = dt / 1000;
  const pace = 0.85 ** (b.level - 1);
  b.flash = Math.max(0, b.flash - dt);
  b.x += b.dir * (20 + 5 * b.level) * sec;
  if (b.x < 8) { b.x = 8; b.dir = 1; } else if (b.x > W - 8 - b.w) { b.x = W - 8 - b.w; b.dir = -1; }
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h;
  const t = b.timers;
  // Aimed fan: five bullets spread around the ship's position.
  if ((t.fan -= dt) <= 0) {
    t.fan += 900 * pace;
    const aim = Math.atan2(PLAYER_Y - cy, s.player.x - cx);
    for (let i = -2; i <= 2; i++) bullet(s, cx, cy, aim + i * 0.22, 85);
  }
  // Ring: sixteen bullets in every direction, rotated a little each time.
  if ((t.ring -= dt) <= 0) {
    t.ring += 1600 * pace;
    b.spin += 0.2;
    for (let i = 0; i < 16; i++) bullet(s, cx, cy - b.h / 2, b.spin + (i * Math.PI) / 8, 60);
  }
  // Below half health, a two-armed spiral joins in.
  // Several pairs can fire in one long frame, so the density doesn't depend on the frame rate.
  if (b.hp <= b.maxHp / 2) {
    for (t.spiral -= dt; t.spiral <= 0; t.spiral += 110 * pace) {
      b.spin += 0.27;
      bullet(s, cx, cy, b.spin, 70);
      bullet(s, cx, cy, b.spin + Math.PI, 70);
    }
  }
}

function defeatBoss(s) {
  s.score += 1000 * s.boss.level;
  drop(s, s.boss.x + s.boss.w / 2, s.boss.y + s.boss.h);
  s.shots = [];
  s.boss = null;
  s.event = 'boss-down';
  // A breather before the next wave, so the reward can be caught.
  s.breather = 6000;
}

export function update(s, dt, input) {
  if (s.over) return s;
  const sec = dt / 1000;
  const p = s.player;
  if (input.left) p.x = Math.max(8, p.x - 120 * sec);
  if (input.right) p.x = Math.min(W - 8, p.x + 120 * sec);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  for (const kind of Object.keys(s.powers)) if ((s.powers[kind] -= dt) <= 0) delete s.powers[kind];
  // Rate limit slows everything hostile: the formation, its shots and the boss.
  const edt = s.powers.ratelimit ? dt / 2 : dt;
  const esec = edt / 1000;
  if (input.fire && !s.patches.length) {
    const xs = s.powers.spread ? [p.x - 5, p.x, p.x + 5] : [p.x];
    s.patches = xs.map((x) => ({ x, y: PLAYER_Y - 6, w: 1, h: 4 }));
  }

  // Patches fly faster in boss fights, so a shot reaches the boss before it sweeps away.
  const speed = (s.powers.hotfix ? 440 : 220) * (s.boss ? 1.6 : 1);
  // True when the patch hit something (and is used up). Patches move in steps no taller than
  // themselves, so a fast patch can't skip past a bug.
  const hit = (patch) => {
    const target = alive(s).find((b) => overlaps(patch, bugBox(s, b)));
    if (target) {
      target.alive = false;
      s.score += ROW_POINTS[target.r];
      if (s.rand() < DROP_CHANCE) { const box = bugBox(s, target); drop(s, box.x + box.w / 2, box.y + box.h); }
      return !s.powers.pierce;
    }
    if (s.boss && overlaps(patch, s.boss)) {
      s.boss.hp -= 1;
      s.boss.flash = 80;
      s.score += 10;
      return true;
    }
    if (s.zeroDay && overlaps(patch, s.zeroDay)) {
      s.score += s.zeroDay.points;
      drop(s, s.zeroDay.x + s.zeroDay.w / 2, s.zeroDay.y + s.zeroDay.h);
      s.zeroDay = null;
      return true;
    }
    return hitsShield(s, patch);
  };
  s.patches = s.patches.filter((patch) => {
    for (let left = speed * sec; left > 0; left -= patch.h) {
      patch.y -= Math.min(patch.h, left);
      if (patch.y < 0 || hit(patch)) return false;
    }
    return true;
  });

  const f = s.formation;
  f.timer += edt;
  while (alive(s).length && f.timer >= stepMs(s)) {
    f.timer -= stepMs(s);
    f.frame ^= 1;
    const boxes = alive(s).map((b) => bugBox(s, b));
    const minX = Math.min(...boxes.map((b) => b.x));
    const maxX = Math.max(...boxes.map((b) => b.x + b.w));
    if ((f.dir > 0 && maxX + 4 > W - 4) || (f.dir < 0 && minX - 4 < 4)) { f.y += 8; f.dir = -f.dir; }
    else f.x += 4 * f.dir;
    if (s.shots.length < 3 && s.rand() < 0.35) {
      const cols = [...new Set(alive(s).map((b) => b.c))];
      const c = cols[Math.floor(s.rand() * cols.length)];
      const bottom = alive(s).filter((b) => b.c === c).sort((a, b) => b.r - a.r)[0];
      const box = bugBox(s, bottom);
      s.shots.push({ x: box.x + box.w / 2, y: box.y + box.h, w: 1, h: 4 });
    }
  }

  if (s.boss) {
    if (s.boss.hp <= 0) defeatBoss(s);
    else updateBoss(s, edt);
  }

  for (const shot of s.shots) { shot.x += (shot.vx ?? 0) * esec; shot.y += (shot.vy ?? 90) * esec; }
  const ship = { x: p.x - 6, y: PLAYER_Y, w: 13, h: 7 };
  // Boss bullets only count on the ship's centre, as in bullet-hell games, so gaps can be threaded.
  const core = { x: p.x - 2, y: PLAYER_Y + 2, w: 5, h: 4 };
  s.drops = s.drops.filter((d) => {
    d.y += 40 * sec;
    if (overlaps(d, ship)) { collect(s, d.kind); return false; }
    return d.y < H;
  });
  s.shots = s.shots.filter((shot) => {
    if (shot.y > H || shot.y < -4 || shot.x < -4 || shot.x > W + 4 || hitsShield(s, shot)) return false;
    if (overlaps(shot, shot.boss ? core : ship)) {
      if (p.sandbox && !p.invulnerable) { p.sandbox = false; p.invulnerable = 500; }
      else if (!p.invulnerable) {
        s.lives -= 1;
        p.invulnerable = 1000;
        if (s.lives <= 0) s.over = true;
      }
      return false;
    }
    return true;
  });

  for (const b of alive(s)) {
    const box = bugBox(s, b);
    for (const sh of s.shields) {
      if (!overlaps(box, { x: sh.x, y: sh.y, w: SHIELD_W, h: SHIELD_H })) continue;
      for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) {
        const row = sh.bits[box.y + y - sh.y];
        if (row && row[box.x + x - sh.x] !== undefined) row[box.x + x - sh.x] = false;
      }
    }
    if (box.y + box.h >= PLAYER_Y) s.over = true;
  }

  if (s.zeroDay) {
    s.zeroDay.x += s.zeroDay.dir * 50 * sec;
    if (s.zeroDay.x < -20 || s.zeroDay.x > W + 20) s.zeroDay = null;
  } else if (!s.boss) {
    s.zeroDayTimer -= dt;
    if (s.zeroDayTimer <= 0) {
      const dir = s.rand() < 0.5 ? 1 : -1;
      s.zeroDay = { x: dir > 0 ? -16 : W, y: 16, w: 16, h: 7, dir, points: ZERO_DAY_POINTS[Math.floor(s.rand() * ZERO_DAY_POINTS.length)] };
      s.zeroDayTimer = 18000 + s.rand() * 7000;
    }
  }

  if (s.breather) s.breather = s.drops.length ? Math.max(0, s.breather - dt) : 0;
  if (!s.over && !alive(s).length && !s.boss && !s.breather) { s.wave += 1; newWave(s); }
  return s;
}
