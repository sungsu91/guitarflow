const activeBackingLoops = new Set();

export function registerBackingLoopActivity(ownerMode, deactivate, activate = null) {
  if (!ownerMode || typeof deactivate !== "function") return () => {};
  const entry = { activate, deactivate, ownerMode };
  activeBackingLoops.add(entry);
  activate?.();
  return () => activeBackingLoops.delete(entry);
}

export function deactivateBackingLoopsExcept(nextMode) {
  activeBackingLoops.forEach((entry) => {
    if (entry.ownerMode === nextMode) entry.activate?.();
    else entry.deactivate();
  });
}

export function resetBackingLoopActivityForTests() {
  activeBackingLoops.clear();
}
