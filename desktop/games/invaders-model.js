// Incident Response: pure model of an original fixed shooter. Bugs march in formation,
// the on-call ship fires patches, firewalls erode, and a zero-day crosses for bonus points.
// Destroyed bugs sometimes, and the zero-day always, drop a power-up for the ship to catch.
export const W = 240;
export const H = 260;
export const PLAYER_Y = H - 22;
export const ROW_POINTS = [30, 20, 20, 10, 10];
export const ZERO_DAY_POINTS = [50, 100, 150, 300];
export const POWER_KINDS = ['hotfix', 'spread', 'rebuild', 'rollback'];
export const POWER_MS = 8000;
const DROP_CHANCE = 0.08;
const MAX_LIVES = 5;
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

function newWave(s) {
  s.bugs = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) s.bugs.push({ r, c, alive: true });
  s.formation = { x: 24, y: 36 + 8 * Math.min(s.wave, 4), dir: 1, timer: 0, frame: 0 };
  s.shots = [];
  s.patches = [];
  s.drops = [];
}

export function createInvaders(rand = Math.random) {
  const s = { rand, score: 0, lives: 3, wave: 0, over: false, player: { x: W / 2, invulnerable: 0 }, patches: [], drops: [], power: null, collected: null, shots: [], zeroDay: null, zeroDayTimer: 15000, shields: [], bugs: [], formation: null };
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

// Rebuild and rollback act at once; hotfix (faster patches) and spread (three patches) last a while.
function collect(s, kind) {
  if (kind === 'rebuild') s.shields.forEach((sh) => { sh.bits = shieldBits(); });
  else if (kind === 'rollback') s.lives = Math.min(MAX_LIVES, s.lives + 1);
  else s.power = { kind, ms: POWER_MS };
  s.collected = kind;
}

export function update(s, dt, input) {
  if (s.over) return s;
  const sec = dt / 1000;
  const p = s.player;
  if (input.left) p.x = Math.max(8, p.x - 120 * sec);
  if (input.right) p.x = Math.min(W - 8, p.x + 120 * sec);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  if (s.power && (s.power.ms -= dt) <= 0) s.power = null;
  if (input.fire && !s.patches.length) {
    const xs = s.power?.kind === 'spread' ? [p.x - 5, p.x, p.x + 5] : [p.x];
    s.patches = xs.map((x) => ({ x, y: PLAYER_Y - 6, w: 1, h: 4 }));
  }

  const speed = s.power?.kind === 'hotfix' ? 440 : 220;
  // True when the patch hit something (and is used up). Patches move in steps no taller than
  // themselves, so a fast patch can't skip past a bug.
  const hit = (patch) => {
    const target = alive(s).find((b) => overlaps(patch, bugBox(s, b)));
    if (target) {
      target.alive = false;
      s.score += ROW_POINTS[target.r];
      if (s.rand() < DROP_CHANCE) { const box = bugBox(s, target); drop(s, box.x + box.w / 2, box.y + box.h); }
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
  f.timer += dt;
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

  for (const shot of s.shots) shot.y += 90 * sec;
  const ship = { x: p.x - 6, y: PLAYER_Y, w: 13, h: 7 };
  s.drops = s.drops.filter((d) => {
    d.y += 40 * sec;
    if (overlaps(d, ship)) { collect(s, d.kind); return false; }
    return d.y < H;
  });
  s.shots = s.shots.filter((shot) => {
    if (shot.y > H || hitsShield(s, shot)) return false;
    if (overlaps(shot, ship)) {
      if (!p.invulnerable) {
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
  } else {
    s.zeroDayTimer -= dt;
    if (s.zeroDayTimer <= 0) {
      const dir = s.rand() < 0.5 ? 1 : -1;
      s.zeroDay = { x: dir > 0 ? -16 : W, y: 16, w: 16, h: 7, dir, points: ZERO_DAY_POINTS[Math.floor(s.rand() * ZERO_DAY_POINTS.length)] };
      s.zeroDayTimer = 18000 + s.rand() * 7000;
    }
  }

  if (!s.over && !alive(s).length) { s.wave += 1; newWave(s); }
  return s;
}
