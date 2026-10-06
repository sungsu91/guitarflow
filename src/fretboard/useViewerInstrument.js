import { useEffect, useState } from 'react';
import { getViewerProfile, normalizeViewerSelection, selectViewerInstrument, selectViewerProfile } from './instruments.js';

const STORAGE_KEY = 'rifflab.fretboard.instrument.v1';
export default function useViewerInstrument() {
  const [selection, setSelection] = useState(() => {
    try { return normalizeViewerSelection(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch { return normalizeViewerSelection(); }
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selection)); } catch { /* Storage may be unavailable. */ }
  }, [selection]);
  return {
    profile: getViewerProfile(selection[selection.instrument]),
    selectInstrument: instrument => setSelection(current => selectViewerInstrument(current, instrument)),
    selectProfile: id => setSelection(current => selectViewerProfile(current, id)),
  };
}
