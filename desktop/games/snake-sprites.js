// Original pixel art for Snake: a dragon's head in profile, drawn facing right with its jaws open.
// h = horn, # = scales, e = eye; '.' shows the field. Each pixel is 2 game px, so it fills one cell.
const DRAGON = [
  'hh........',
  '.hh.......',
  '..h####...',
  '.###e###..',
  '.#########',
  '.######...',
  '.####.....',
  '.#######..',
  '..#####...',
  '..##......',
];

const mirror = (rows) => rows.map((row) => [...row].reverse().join(''));
const clockwise = (rows) => [...rows[0]].map((_, x) => rows.map((row) => row[x]).reverse().join(''));
const counterClockwise = (rows) => [...rows[0]].map((_, x) => rows.map((row) => row[row.length - 1 - x]).join(''));

// The head turns with the snake, snout first. Going up or down, it keeps the side it last faced,
// so a turn looks like the head lifting or dipping rather than flipping over.
const RIGHT = { right: DRAGON, up: counterClockwise(DRAGON), down: clockwise(DRAGON) };
const LEFT = { left: mirror(DRAGON), up: mirror(RIGHT.up), down: mirror(RIGHT.down) };

export const dragonHead = (dir, facing = 'right') => (dir === 'left' ? LEFT.left : dir === 'right' ? RIGHT.right : (facing === 'left' ? LEFT : RIGHT)[dir]);
