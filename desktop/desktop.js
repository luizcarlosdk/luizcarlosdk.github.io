import { icon } from './ui.js';

const root = document.createElement('div');
root.className = 'dt';
root.id = 'desktop';
root.innerHTML = `<p>${icon('desktop')} luiz@workstation</p>`;
document.body.append(root);
window.lcMode.ready();
