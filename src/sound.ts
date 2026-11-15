// Key sounds, made with the Web Audio API so there are no sound files to load.
import type { Prefs } from './prefs';

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { return null; }
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function burst(a: AudioContext, freq: number, q: number, gain: number, dur: number, type: BiquadFilterType = 'bandpass') {
  const src = a.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.9 + Math.random() * 0.2; // keys never sound quite the same
  const f = a.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start();
  src.stop(a.currentTime + dur);
}

function tone(a: AudioContext, from: number, to: number, type: OscillatorType, gain: number, dur: number) {
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(to, a.currentTime + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

/** Play the chosen key sound, or the error sound for a wrong key. */
export function keySound(prefs: Prefs, ok: boolean) {
  if (!ok && prefs.errorSound) {
    const a = audio();
    if (a) tone(a, 180, 120, 'square', 0.05, 0.12);
    return;
  }
  if (prefs.sound === 'off') return;
  const a = audio();
  if (!a) return;
  if (prefs.sound === 'click') burst(a, 2400, 1.2, 0.5, 0.04);
  else if (prefs.sound === 'pop') tone(a, 720, 280, 'sine', 0.18, 0.06);
  else { burst(a, 1200, 0.8, 0.7, 0.05); burst(a, 4000, 3, 0.25, 0.02, 'highpass'); }
}

/** A sample, for the settings page. */
export function previewSound(prefs: Prefs) {
  keySound({ ...prefs, errorSound: false }, true);
}
