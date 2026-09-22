import {createGroovePattern} from './groove.js';
import {RECOMMENDED_GROOVE_PACKS} from './recommendedGrooves.js';

export const STORAGE_KEY = 'rifflab.metronome.groove-packs.v1';
const listeners = new Set();
export function savePacks(packs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
  listeners.forEach(listener => listener());
}
export function subscribeGroovePacks(listener) {
  listeners.add(listener);
  const onStorage = event => { if (event.key === STORAGE_KEY || event.key === null) listener(); };
  globalThis.window?.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); globalThis.window?.removeEventListener('storage', onStorage); };
}
export function readPacks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(p => p?.id && typeof p.title === 'string' && Array.isArray(p.pattern?.rows) && p.pattern.rows.length && p.pattern.rows.every(r => typeof r.tone === 'string' && Array.isArray(r.steps))) : [];
  } catch { return []; }
}
export const defaults = [...[['8beat','8비트'],['16beat','16비트']].map(([id,title]) => ({id,title,category:'기본',builtin:true,pattern:createGroovePattern(id),timeSignature:'4/4',subdivision:'sixteenth',description:'기본 격자 연습.'})), ...RECOMMENDED_GROOVE_PACKS];
