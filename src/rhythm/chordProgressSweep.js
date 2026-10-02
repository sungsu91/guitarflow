// Read the same cumulative beat clock as playback, including short chords,
// automatic rests, and chords that continue across a barline.
export function chordSweepProgress(absoluteBeat, cycleBeats, startBeat, beatLength) {
  if (!Number.isFinite(absoluteBeat) || !(cycleBeats > 0) || !(beatLength > 0)) return null;
  const beat = ((absoluteBeat % cycleBeats) + cycleBeats) % cycleBeats;
  return beat >= startBeat && beat < startBeat + beatLength
    ? (beat - startBeat) / beatLength : null;
}
