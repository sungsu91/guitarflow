// Stored meter is the number of main beats. Older packs omit the denominator.
// The duration grid remains 12 ticks per quarter note for all time signatures.
export const TIME_SIGNATURES = ['2/4','3/4','4/4','6/8','9/8','12/8'];
export function meterInfo(value = 4) {
  const denominator = typeof value === 'string' ? Number(value.split('/')[1]) : typeof value === 'object' ? value.meterDenominator ?? 4 : 4;
  const compound = denominator === 8;
  const beats = typeof value === 'string' ? Number(value.split('/')[0]) / (compound ? 3 : 1) : typeof value === 'object' ? value.meter : value;
  return {beats, compound, denominator, beatTicks:compound ? 18 : 12, signature:`${beats * (compound ? 3 : 1)}/${denominator}`};
}
export const timeSignature = value => meterInfo(value).signature;
export const beatTicks = value => meterInfo(value).beatTicks;
export const secondsPerTick = pattern => 60 / (pattern.bpm * beatTicks(pattern));
export const tempoMark = pattern => `${meterInfo(pattern).compound ? '♩.' : '♩'} = ${pattern.bpm}`;
