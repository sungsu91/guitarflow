import { memo, useSyncExternalStore } from "react";

function useActiveBar(store, barIndex) {
  return useSyncExternalStore(store.subscribe, () => store.getSnapshot().barIndex === barIndex, () => false);
}

export const MiniChordPlaybackBar = memo(function MiniChordPlaybackBar({ store, barIndex, className, ...props }) {
  const active = useActiveBar(store, barIndex);
  return <article {...props} className={`${className}${active ? " is-playing" : ""}`} />;
});

export const MiniChordPlaybackSeekButton = memo(function MiniChordPlaybackSeekButton({ store, barIndex, ...props }) {
  const active = useActiveBar(store, barIndex);
  return <button {...props} aria-current={active ? "true" : undefined} />;
});

export const MiniChordPlaybackSlot = memo(function MiniChordPlaybackSlot({ store, playbackIndexes, className, children, ...props }) {
  const active = useSyncExternalStore(store.subscribe,
    () => playbackIndexes.includes(store.getSnapshot().slotIndex), () => false);
  return <button {...props} className={`${className}${active ? " playing" : ""}`}>
    {children}
    <span className="miniChordPlaybackProgress" aria-hidden="true" />
  </button>;
});
