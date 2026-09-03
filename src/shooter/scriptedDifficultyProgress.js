export function getScriptedDifficultyRoundProgress({
  recommendedBpms,
  stableAccuracy = 85,
  requiredStableRounds = 2,
  bpm,
  hits = 0,
  misses = 0,
  stableRounds = 0,
} = {}) {
  const bpms = Array.isArray(recommendedBpms) && recommendedBpms.length
    ? recommendedBpms
    : [60];
  const safeHits = Math.max(0, Number(hits) || 0);
  const safeMisses = Math.max(0, Number(misses) || 0);
  const total = safeHits + safeMisses;
  const accuracy = total > 0 ? Math.round((safeHits / total) * 100) : 0;
  let nextStableRounds = accuracy >= stableAccuracy ? Math.max(0, Number(stableRounds) || 0) + 1 : 0;
  const requestedBpm = Number(bpm);
  const currentBpmIndex = Math.max(0, bpms.indexOf(requestedBpm));
  let nextBpm = bpms[currentBpmIndex];

  if (nextStableRounds >= requiredStableRounds && currentBpmIndex < bpms.length - 1) {
    nextBpm = bpms[currentBpmIndex + 1];
    nextStableRounds = 0;
  }

  return {
    accuracy,
    bpm: nextBpm,
    bpmRaised: nextBpm > requestedBpm,
    stableRounds: nextStableRounds,
  };
}
