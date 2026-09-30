// Choose a complete octave segment before applying direction and subdivision.
// Its shared root endpoint must remain in the sequence when practiced alone.
export function selectRootScalePractice(practice, segmentIndex = null) {
  if (segmentIndex == null || !practice.rootScaleSegments?.length) return practice;
  const index = Math.max(0, Math.min(practice.rootScaleSegments.length - 1, Math.trunc(segmentIndex) || 0));
  const notes = practice.rootScaleSegments[index];
  return {
    ...practice,
    notes,
    activeRootScaleSegment: index,
    sequence: notes.map(note => ({
      pitch: note.pitch,
      noteId: note.id,
      stringNumber: note.stringNumber,
      fretNumber: note.fretNumber,
      rootScaleSegment: index,
    })),
  };
}
