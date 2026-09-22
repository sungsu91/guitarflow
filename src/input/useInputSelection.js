import { useSyncExternalStore } from 'react';
import { midiInput } from './midiInput.js';
import { getAudioInputSelection, subscribeAudioInput } from './audioInputSelection.js';
export const useAudioInputSelection = () => useSyncExternalStore(subscribeAudioInput, getAudioInputSelection);
export function useMidiConnection() {
  const state = useSyncExternalStore(midiInput.subscribe, midiInput.getSnapshot);
  return { ...state, supported: midiInput.supported(), connect: () => midiInput.connect(true), setSelected: midiInput.select };
}
