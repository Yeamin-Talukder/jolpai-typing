// Typing preferences from the settings page, kept in this browser.

export interface Prefs {
  liveSpeed: boolean;
  liveAcc: boolean;
  liveBurst: boolean;
  timerBar: boolean;
  fontSize: 's' | 'm' | 'l' | 'xl';
  caret: 'line' | 'block' | 'underline' | 'off';
  smoothCaret: boolean;
  stopOnError: 'off' | 'letter' | 'word';
  confidence: 'off' | 'on' | 'max';
  blind: boolean;
  sound: 'off' | 'click' | 'pop' | 'typewriter';
  errorSound: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  liveSpeed: true,
  liveAcc: true,
  liveBurst: false,
  timerBar: true,
  fontSize: 'm',
  caret: 'line',
  smoothCaret: true,
  stopOnError: 'off',
  confidence: 'off',
  blind: false,
  sound: 'off',
  errorSound: false,
};

const KEY = 'jolpai-type:prefs';

/** Load saved preferences; anything missing or invalid falls back to the default. */
export function loadPrefs(): Prefs {
  const p = { ...DEFAULT_PREFS };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    for (const k of Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]) {
      if (saved[k] !== undefined && typeof saved[k] === typeof DEFAULT_PREFS[k]) (p as Record<string, unknown>)[k] = saved[k];
    }
  } catch { /* first visit or storage blocked */ }
  return p;
}

export function savePrefs(p: Prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export const FONT_PX: Record<Prefs['fontSize'], number> = { s: 22, m: 28, l: 34, xl: 42 };
