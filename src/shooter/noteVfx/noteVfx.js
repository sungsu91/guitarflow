export const NOTE_VFX_DURATION_MS = 420;
export function isNoteVfxEnabled(dev, search = '') {
  return dev === true && new URLSearchParams(search).get('shooterNoteVfx') === '1';
}
export function noteVfxColor(pitch) {
  return ({ C: '#80ecff', D: '#bca3ff', E: '#ffda79', F: '#ff9bd2', G: '#93f0ba', A: '#ffb48b', B: '#a7c5ff' })[String(pitch)[0]] || '#ffda79';
}
