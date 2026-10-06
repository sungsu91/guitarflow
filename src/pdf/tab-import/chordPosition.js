// Align the root's ink, not the label's left edge, with the musical column.
// Long extensions must not pull the chord forward by half the whole word.
export const chordAnchorX=word=>word.x+Math.min((word.width??0)/2,(word.height??0)*.45);
