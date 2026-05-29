// Legacy backup for the removed tuner feature.
//
// The active app no longer exposes the tuner route, menu, rendering branch, or
// tuner-specific microphone execution path. This file preserves the tuner UI
// markup and restoration notes without being imported by the runtime.
//
// To restore:
// 1. Re-add APP_MODES.TUNER and APP_ROUTES.TUNER in src/App.jsx.
// 2. Re-add the menu buttons that call the tuner entry handler.
// 3. Reconnect the archived tuner state/refs and microphone branch from git
//    history around the May 29, 2026 tuner removal.
// 4. Import or inline a restored Tuner component from this file.

export function TunerLegacy() {
  return null;
}

export const tunerLegacyNotes = {
  removedFromActiveRuntime: true,
  archivedFeature: "practice/reference tuner",
  formerRoute: "#tuner",
  formerMode: "tuner",
  preservedFor: "future restoration",
};
