export const MINI_CHORD_MIN_BARS = 4;
export const MINI_CHORD_MAX_BARS = 256;
export const MINI_CHORD_BARS_PER_PAGE = 32;

export function normalizeMiniChordBarCount(value) {
  const numeric = Math.round(Number(value) || MINI_CHORD_MIN_BARS);
  return Math.max(MINI_CHORD_MIN_BARS, Math.min(MINI_CHORD_MAX_BARS, numeric));
}

export function getMiniChordPageWindow(barCount = MINI_CHORD_MIN_BARS, pageIndex = 0) {
  const safeBarCount = normalizeMiniChordBarCount(barCount);
  const pageCount = Math.max(1, Math.ceil(safeBarCount / MINI_CHORD_BARS_PER_PAGE));
  const safePageIndex = Math.max(0, Math.min(pageCount - 1, Math.round(Number(pageIndex) || 0)));
  const startBarIndex = safePageIndex * MINI_CHORD_BARS_PER_PAGE;
  const endBarIndex = Math.min(safeBarCount - 1, startBarIndex + MINI_CHORD_BARS_PER_PAGE - 1);

  return {
    pageCount,
    pageIndex: safePageIndex,
    startBarIndex,
    endBarIndex,
    startBarNumber: startBarIndex + 1,
    endBarNumber: endBarIndex + 1,
  };
}

export function getMiniChordPageIndexForBar(barIndex = 0) {
  const safeBarIndex = Math.max(0, Math.round(Number(barIndex) || 0));
  return Math.floor(safeBarIndex / MINI_CHORD_BARS_PER_PAGE);
}

export function getMiniChordSwipePageDelta(deltaX = 0, deltaY = 0, minimumDistance = 48) {
  const horizontalDistance = Number(deltaX) || 0;
  const verticalDistance = Number(deltaY) || 0;
  const threshold = Math.max(1, Number(minimumDistance) || 48);
  if (
    Math.abs(horizontalDistance) < threshold
    || Math.abs(horizontalDistance) <= Math.abs(verticalDistance) * 1.15
  ) {
    return 0;
  }
  return horizontalDistance < 0 ? 1 : -1;
}
