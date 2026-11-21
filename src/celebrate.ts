// A short celebration for a new personal best: confetti bursts out of the
// speed, two rings ripple around it and the number glows. Nothing moves when
// the typist asks for reduced motion; the badge alone says it.
import { reduceMotion } from './icons';

let layer: HTMLDivElement | null = null;
let timer = 0;

/** Remove any celebration still on screen (a new test started). */
export function stopCelebration() {
  clearTimeout(timer);
  layer?.remove();
  layer = null;
}

/** Celebrate around `anchor` after `delay` ms (so the speed has finished counting up). */
export function celebrate(anchor: HTMLElement, delay = 0) {
  stopCelebration();
  timer = window.setTimeout(() => burst(anchor), delay);
}

function burst(anchor: HTMLElement) {
  anchor.classList.remove('pb-hit');
  void anchor.offsetWidth; // restart the glow if it ran before
  anchor.classList.add('pb-hit');
  if (reduceMotion()) return;

  const r = anchor.getBoundingClientRect();
  if (!r.width) return;
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const css = getComputedStyle(document.documentElement);
  const theme = ['--main', '--text', '--main'].map(v => css.getPropertyValue(v).trim()).filter(Boolean);
  const colors = [...theme, '#f2c94c', '#ffe28a']; // the theme's colours plus trophy gold

  layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const own = layer;

  // rings that ripple out from the number
  for (let i = 0; i < 2; i++) {
    const ring = document.createElement('span');
    ring.className = 'cf-ring';
    ring.style.left = `${cx}px`;
    ring.style.top = `${cy}px`;
    own.appendChild(ring);
    ring.animate(
      [{ transform: 'translate(-50%, -50%) scale(.3)', opacity: .7 }, { transform: 'translate(-50%, -50%) scale(3.2)', opacity: 0 }],
      { duration: 900, delay: i * 180, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' },
    );
  }

  // confetti: mostly up and out, then it falls
  const small = innerWidth < 700;
  const count = small ? 56 : 90;
  let longest = 0;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    const shape = Math.random();
    p.className = `cf-bit${shape < .3 ? ' round' : shape < .5 ? ' strip' : ''}`;
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    own.appendChild(p);
    const angle = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.5; // a wide fan, pointing up
    const speed = (small ? 120 : 180) + Math.random() * (small ? 160 : 260);
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    const fall = 140 + Math.random() * 220;
    const spin = (Math.random() - .5) * 900;
    const duration = 1100 + Math.random() * 700;
    longest = Math.max(longest, duration);
    p.animate([
      { transform: 'translate(-50%, -50%) scale(.3) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${spin * .5}deg)`, opacity: 1, offset: .35 },
      { transform: `translate(calc(-50% + ${dx * 1.25}px), calc(-50% + ${dy + fall}px)) scale(.9) rotate(${spin}deg)`, opacity: 0 },
    ], { duration, delay: Math.random() * 90, easing: 'cubic-bezier(.15,.6,.35,1)', fill: 'both' });
  }
  timer = window.setTimeout(() => { if (layer === own) stopCelebration(); }, longest + 200);
}
