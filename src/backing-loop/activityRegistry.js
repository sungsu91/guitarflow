const activeBackingLoops = new Set();

export function registerBackingLoopActivity(ownerMode, deactivate, activate = null, onNavigate = null) {
  if (!ownerMode || typeof deactivate !== "function") return () => {};
  const entry = { activate, deactivate, ownerMode, onNavigate };
  activeBackingLoops.add(entry);
  activate?.();
  return () => activeBackingLoops.delete(entry);
}

export function deactivateBackingLoopsExcept(nextMode) {
  activeBackingLoops.forEach((entry) => {
    if (entry.onNavigate) entry.onNavigate(nextMode);
    else if (entry.ownerMode === nextMode) entry.activate?.();
    else entry.deactivate();
  });
}

export function resetBackingLoopActivityForTests() {
  activeBackingLoops.clear();
}
