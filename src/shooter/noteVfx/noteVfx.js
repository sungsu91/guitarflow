export const NOTE_VFX_DURATION_MS = 420;
export function isNoteVfxEnabled(dev, search = '') {
  return dev === true && new URLSearchParams(search).get('shooterNoteVfx') === '1';
}
export function noteVfxColor(pitch) {
  return ({ C: '#47dfff', D: '#b070ff', E: '#ffc34f', F: '#ff73cd', G: '#62efaa', A: '#659cff', B: '#ba91ff' })[String(pitch)[0]] || '#ffc34f';
}
