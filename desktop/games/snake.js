// Snake: canvas view and controls on top of the pure model.
import { createGame } from './kit.js';
import { GRID, createSnake, step, turn, tickMs } from './snake-model.js';

const CELL = 20;

export function mount(host) {
  const game = createGame(host, { label: 'Snake game', bestKey: 'lc.snake.best', width: GRID * CELL, height: GRID * CELL, pad: 'dpad', help: 'Arrows or WASD to steer. Space to pause.' });
  let s = createSnake();
  let raf = 0;
  let last = 0;
  let acc = 0;
  const state = () => game.host.dataset.state;

  const draw = () => {
    const { ctx } = game;
    const c = game.colors();
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, game.width, game.height);
    if (s.food) {
      ctx.fillStyle = c.alt;
      ctx.fillRect(s.food.x * CELL + 5, s.food.y * CELL + 5, CELL - 10, CELL - 10);
    }
    s.body.forEach((p, i) => {
      ctx.fillStyle = i === 0 ? c.fg : c.accent;
      ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
    });
  };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    acc += Math.min(t - last, 250);
    last = t;
    while (acc >= tickMs(s) && !s.over) {
      acc -= tickMs(s);
      step(s);
      game.setScore(s.score);
    }
    if (s.over) {
      stop();
      game.finish(s.score);
      game.setState('over', { title: 'Game over', message: `You scored ${s.score}.`, action: 'Play again' });
    }
    draw();
  };
  const start = () => {
    if (s.over || state() === 'ready') { s = createSnake(); game.setScore(0); }
    game.setState('running');
    last = performance.now();
    acc = 0;
    stop();
    raf = requestAnimationFrame(frame);
    game.focus();
  };
  const pause = () => {
    if (state() !== 'running') return;
    stop();
    game.setState('paused', { title: 'Paused', message: 'Press Space to continue.', action: 'Resume' });
  };

  game.onAction((a) => {
    if (a === 'primary' || a === 'pause') { if (state() === 'running') pause(); else start(); return; }
    if (state() === 'running') turn(s, a);
  });
  game.onSuspend(pause);
  game.onDestroy(stop);
  game.setState('ready', { title: 'Snake', message: 'Eat the tokens. Don’t hit the walls or yourself.', action: 'Start' });
  draw();
  game.focus();
}
