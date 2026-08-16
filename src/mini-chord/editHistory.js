const DEFAULT_HISTORY_LIMIT = 80;

export function cloneMiniChordEditSnapshot(snapshot) {
  return JSON.parse(JSON.stringify(snapshot ?? {}));
}

export function getMiniChordEditSnapshotKey(snapshot) {
  return JSON.stringify(snapshot ?? {});
}

export function createMiniChordEditHistory(snapshot, limit = DEFAULT_HISTORY_LIMIT) {
  return {
    future: [],
    limit: Math.max(1, Math.round(Number(limit) || DEFAULT_HISTORY_LIMIT)),
    past: [],
    present: cloneMiniChordEditSnapshot(snapshot),
  };
}

export function recordMiniChordEdit(history, snapshot) {
  const current = history ?? createMiniChordEditHistory(snapshot);
  const nextSnapshot = cloneMiniChordEditSnapshot(snapshot);
  if (getMiniChordEditSnapshotKey(current.present) === getMiniChordEditSnapshotKey(nextSnapshot)) {
    return current;
  }
  return {
    ...current,
    future: [],
    past: [...current.past, cloneMiniChordEditSnapshot(current.present)].slice(-current.limit),
    present: nextSnapshot,
  };
}

export function undoMiniChordEdit(history) {
  if (!history?.past?.length) return { history, snapshot: null };
  const snapshot = cloneMiniChordEditSnapshot(history.past[history.past.length - 1]);
  return {
    history: {
      ...history,
      future: [cloneMiniChordEditSnapshot(history.present), ...history.future],
      past: history.past.slice(0, -1),
      present: snapshot,
    },
    snapshot,
  };
}

export function redoMiniChordEdit(history) {
  if (!history?.future?.length) return { history, snapshot: null };
  const snapshot = cloneMiniChordEditSnapshot(history.future[0]);
  return {
    history: {
      ...history,
      future: history.future.slice(1),
      past: [...history.past, cloneMiniChordEditSnapshot(history.present)].slice(-history.limit),
      present: snapshot,
    },
    snapshot,
  };
}

