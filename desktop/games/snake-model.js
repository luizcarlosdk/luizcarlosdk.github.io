// Pure Snake model: no DOM, deterministic given rand.
export const GRID = 20;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

function placeFood(s) {
  const free = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (!s.body.some((p) => p.x === x && p.y === y)) free.push({ x, y });
  return free[Math.floor(s.rand() * free.length)] ?? null;
}

export function createSnake(rand = Math.random) {
  const s = { rand, body: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }], dir: 'right', next: 'right', food: null, score: 0, over: false };
  s.food = placeFood(s);
  return s;
}

export function turn(s, dir) {
  if (DIRS[dir] && dir !== OPPOSITE[s.dir]) s.next = dir;
}

export const tickMs = (s) => Math.max(70, 130 - 3 * s.score);

export function step(s) {
  if (s.over) return s;
  s.dir = s.next;
  const [dx, dy] = DIRS[s.dir];
  const head = { x: s.body[0].x + dx, y: s.body[0].y + dy };
  const eating = Boolean(s.food) && head.x === s.food.x && head.y === s.food.y;
  const body = eating ? s.body : s.body.slice(0, -1);
  if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID || body.some((p) => p.x === head.x && p.y === head.y)) {
    s.over = true;
    return s;
  }
  s.body = [head, ...body];
  if (eating) {
    s.score += 1;
    s.food = placeFood(s);
    if (!s.food) s.over = true;
  }
  return s;
}
