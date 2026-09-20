// The audio clock publishes only slot changes. Subscribers select their own
// highlight so a beat never renders the full arrangement editor/App again.
export function createMiniChordPlaybackStore() {
  let position = { barIndex: null, slotIndex: null };
  const listeners = new Set();
  return {
    getSnapshot: () => position,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    setPosition(next = { barIndex: null, slotIndex: null }) {
      if (position.barIndex === next.barIndex && position.slotIndex === next.slotIndex) return;
      position = { ...next };
      listeners.forEach(listener => listener());
    },
  };
}
