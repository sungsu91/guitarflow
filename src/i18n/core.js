import ko from './locales/ko.js';
import en from './locales/en.js';
import { formatMessage } from './format.js';
export { formatMessage } from './format.js';

export const LANGUAGE_STORAGE_KEY = 'language';
export const languages = Object.freeze(['ko', 'en']);
const listeners = new Set();
const normalize = value => languages.includes(value) ? value : 'ko';
function readLanguage() {
  try { return normalize(globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY)); }
  catch { return 'ko'; }
}
let language = readLanguage();
export const getLanguage = () => language;
export function subscribeLanguage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function publish(next) {
  language = normalize(next);
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  listeners.forEach(listener => listener());
}
export function setLanguage(next) {
  if (!languages.includes(next)) return;
  try { globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* Session switching still works when storage is unavailable. */ }
  publish(next);
}
export function syncDocumentLanguage() {
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === LANGUAGE_STORAGE_KEY || event.key === null) publish(readLanguage());
  });
}
export function translate(key, values, locale = language) {
  const resource = locale === 'en' ? en : ko;
  const message = resource[key] ?? ko[key];
  if (message === undefined) throw new Error(`Missing translation: ${key}`);
  return formatMessage(message, values);
}
export const t = translate;

const sourceKeys = new Map();
for (const [key, value] of Object.entries(ko)) {
  if (!sourceKeys.has(value)) sourceKeys.set(value, key);
}
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const messagePatterns = Object.entries(ko).filter(([, value]) => /\{value\d+\}/.test(value)).map(([key, value]) => {
  const names = [...value.matchAll(/\{(value\d+)\}/g)].map(match => match[1]);
  const parts = value.split(/\{value\d+\}/g);
  return { key, names, prefix: parts[0], specificity: parts.join('').length, pattern: new RegExp('^' + parts.map(escapePattern).join('([\\s\\S]*?)') + '$') };
}).sort((a, b) => b.specificity - a.specificity);
const displayCache = new Map();
subscribeLanguage(() => displayCache.clear());

// For canonical application labels/messages only. Never apply this to user
// titles, imported content, filenames, chord names, or persisted input values.
export function localizeUi(value, overrides) {
  if (language === 'en' && typeof value === 'string' && overrides && Object.hasOwn(overrides, value)) return translate(overrides[value]);
  if (language === 'ko' || typeof value !== 'string' || !/[\u3131-\u318e\uac00-\ud7a3]/.test(value)) return value;
  if (displayCache.has(value)) return displayCache.get(value);
  let result = value;
  const key = sourceKeys.get(value);
  if (key) result = translate(key);
  else {
    for (const candidate of messagePatterns) {
      if (candidate.prefix && !value.startsWith(candidate.prefix)) continue;
      const match = candidate.pattern.exec(value);
      if (!match) continue;
      result = translate(candidate.key, Object.fromEntries(candidate.names.map((name, index) => [name, match[index + 1]])));
      break;
    }
  }
  if (displayCache.size >= 1000) displayCache.clear();
  displayCache.set(value, result);
  return result;
}
