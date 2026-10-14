// Shared helpers for desktop mode.
export const PHONE = matchMedia('(max-width: 760px)');

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => REDUCE.matches || document.documentElement.hasAttribute('data-reduce-motion');

export const icon = (name) => `<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

export const storage = {
  get(area, key) {
    try { return window[area].getItem(key); } catch (_) { return null; }
  },
  set(area, key, value) {
    try {
      if (value === null) window[area].removeItem(key);
      else window[area].setItem(key, value);
    } catch (_) { /* storage blocked */ }
  },
};
