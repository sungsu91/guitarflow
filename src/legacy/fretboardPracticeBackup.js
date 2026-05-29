// Backup marker for inactive fretboard practice modes.
//
// The tutorial, Stage1, Stage2, Stage4, and the old falling-note rhythm practice
// are preserved in src/App.jsx as LEGACY_PRACTICE_CATEGORIES and behind
// LEGACY_PRACTICE_RENDERING_ENABLED.
//
// This file is intentionally not imported by the app, so it adds no runtime
// rendering or state cost. It exists only to make the backup location explicit
// for future restoration work.
export const fretboardPracticeBackup = {
  preservedIn: "src/App.jsx",
  categorySource: "LEGACY_PRACTICE_CATEGORIES",
  renderGate: "LEGACY_PRACTICE_RENDERING_ENABLED",
  activeModes: ["rhythm"],
};
