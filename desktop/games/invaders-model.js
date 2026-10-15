// Incident Response: pure model of an original fixed shooter. Bugs march in formation,
// the on-call ship fires patches, firewalls erode, and a zero-day crosses for bonus points.
export const W = 240;
export const H = 260;
export const PLAYER_Y = H - 22;
export const ROW_POINTS = [30, 20, 20, 10, 10];
export const ZERO_DAY_POINTS = [50, 100, 150, 300];
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
  s.patch = null;
}

export function createInvaders(rand = Math.random) {
  const s = { rand, score: 0, lives: 3, wave: 0, over: false, player: { x: W / 2, invulnerable: 0 }, patch: null, shots: [], zeroDay: null, zeroDayTimer: 15000, shields: [], bugs: [], formation: null };
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

export function update(s, dt, input) {
  if (s.over) return s;
  const sec = dt / 1000;
  const p = s.player;
  if (input.left) p.x = Math.max(8, p.x - 120 * sec);
  if (input.right) p.x = Math.min(W - 8, p.x + 120 * sec);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  if (input.fire && !s.patch) s.patch = { x: p.x, y: PLAYER_Y - 6, w: 1, h: 4 };

  if (s.patch) {
    s.patch.y -= 220 * sec;
    if (s.patch.y < 0) s.patch = null;
  }
  if (s.patch) {
    const target = alive(s).find((b) => overlaps(s.patch, bugBox(s, b)));
    if (target) { target.alive = false; s.score += ROW_POINTS[target.r]; s.patch = null; }
    else if (s.zeroDay && overlaps(s.patch, s.zeroDay)) { s.score += s.zeroDay.points; s.zeroDay = null; s.patch = null; }
    else if (hitsShield(s, s.patch)) s.patch = null;
  }

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
