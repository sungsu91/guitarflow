import { useSyncExternalStore } from 'react';
import { getLanguage, subscribeLanguage, translate } from './core.js';

export function useLanguage() {
  return useSyncExternalStore(subscribeLanguage, getLanguage, () => 'ko');
}

// A text-only React component also updates module-level help/guide JSX without
// adding an element, remounting its parent, or touching the parent state.
export function Translation({ id, values }) {
  const language = useLanguage();
  return translate(id, values, language);
}
