export const NOTE_VFX_DURATION_MS = 420;
// Optional development map preview; neon monsters are always enabled.
export function isNoteVfxPreviewRequested(dev, search = '') {
  return dev === true && new URLSearchParams(search).get('shooterNoteVfx') === '1';
}
// Seven fixed hues shared by the ring, note symbol and hit fireworks.
// Octaves and accidentals retain their letter's color (C2 / C5 / C#3).
export const NOTE_VFX_COLORS = Object.freeze({
  C: '#ff4f78', // Coral pink
  D: '#ff963c', // Orange
  E: '#ffe34f', // Yellow
  F: '#49f58b', // Green
  G: '#36e4f5', // Cyan
  A: '#5484ff', // Blue
  B: '#c16aff', // Violet
});
export function noteVfxColor(pitch) {
  return NOTE_VFX_COLORS[String(pitch).trim()[0]?.toUpperCase()] || NOTE_VFX_COLORS.E;
}
