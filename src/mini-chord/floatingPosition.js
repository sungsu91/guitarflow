function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

/** Keep a fixed-position mini-chord popover inside the active viewport. */
export function clampMiniChordFloatingPosition({
  left = 0,
  top = 0,
  width = 0,
  height = 0,
  viewportLeft = 0,
  viewportTop = 0,
  viewportWidth = 0,
  viewportHeight = 0,
  margin = 8,
} = {}) {
  const safeMargin = Math.max(0, toFiniteNumber(margin, 8));
  const safeViewportLeft = toFiniteNumber(viewportLeft);
  const safeViewportTop = toFiniteNumber(viewportTop);
  const safeViewportWidth = Math.max(0, toFiniteNumber(viewportWidth));
  const safeViewportHeight = Math.max(0, toFiniteNumber(viewportHeight));
  const safeWidth = Math.max(0, toFiniteNumber(width));
  const safeHeight = Math.max(0, toFiniteNumber(height));
  const minLeft = safeViewportLeft + safeMargin;
  const minTop = safeViewportTop + safeMargin;
  const maxLeft = Math.max(
    minLeft,
    safeViewportLeft + safeViewportWidth - safeWidth - safeMargin,
  );
  const maxTop = Math.max(
    minTop,
    safeViewportTop + safeViewportHeight - safeHeight - safeMargin,
  );

  return {
    left: Math.max(minLeft, Math.min(maxLeft, toFiniteNumber(left, minLeft))),
    top: Math.max(minTop, Math.min(maxTop, toFiniteNumber(top, minTop))),
  };
}

/**
 * Place the chord editor next to its measure without covering the bottom
 * navigation. Prefer above the measure, then below, and shrink only the
 * panel's scrollable height when neither side has the full requested space.
 */
export function getMiniChordFloatingEditorPosition({
  anchorRect = {},
  viewportLeft = 0,
  viewportTop = 0,
  viewportWidth = 390,
  viewportHeight = 844,
  requestedWidth = 284,
  requestedHeight = 420,
  bottomInset = 0,
  margin = 8,
  gap = 8,
  minHeight = 180,
} = {}) {
  const safeViewportLeft = toFiniteNumber(viewportLeft);
  const safeViewportTop = toFiniteNumber(viewportTop);
  const safeViewportWidth = Math.max(0, toFiniteNumber(viewportWidth, 390));
  const safeViewportHeight = Math.max(0, toFiniteNumber(viewportHeight, 844));
  const safeMargin = Math.max(0, toFiniteNumber(margin, 8));
  const safeGap = Math.max(0, toFiniteNumber(gap, 8));
  const safeBottomInset = Math.max(0, toFiniteNumber(bottomInset));
  const safeTop = safeViewportTop + safeMargin;
  const safeBottom = Math.max(
    safeTop,
    safeViewportTop + safeViewportHeight - safeBottomInset - safeMargin,
  );
  const safeLeft = safeViewportLeft + safeMargin;
  const safeRight = Math.max(
    safeLeft,
    safeViewportLeft + safeViewportWidth - safeMargin,
  );
  const availableViewportHeight = Math.max(0, safeBottom - safeTop);
  const width = Math.min(
    Math.max(120, toFiniteNumber(requestedWidth, 284)),
    Math.max(120, safeRight - safeLeft),
  );
  const requestedPanelHeight = Math.min(
    Math.max(120, toFiniteNumber(requestedHeight, 420)),
    availableViewportHeight,
  );
  const anchorLeft = toFiniteNumber(anchorRect.left, safeLeft);
  const anchorTop = toFiniteNumber(anchorRect.top, safeTop);
  const anchorRight = toFiniteNumber(anchorRect.right, anchorLeft);
  const anchorBottom = toFiniteNumber(anchorRect.bottom, anchorTop);
  const anchorCenter = anchorLeft + Math.max(0, anchorRight - anchorLeft) / 2;
  const availableAbove = Math.max(0, anchorTop - safeGap - safeTop);
  const availableBelow = Math.max(0, safeBottom - anchorBottom - safeGap);
  const fitsAbove = availableAbove >= requestedPanelHeight;
  const fitsBelow = availableBelow >= requestedPanelHeight;
  const placement = fitsAbove || (!fitsBelow && availableAbove >= availableBelow) ? "above" : "below";
  const chosenSpace = placement === "above" ? availableAbove : availableBelow;
  const safeMinHeight = Math.min(
    requestedPanelHeight,
    Math.max(120, toFiniteNumber(minHeight, 180)),
  );
  const maxHeight = Math.min(
    requestedPanelHeight,
    Math.max(safeMinHeight, chosenSpace),
    availableViewportHeight,
  );
  const unclampedLeft = anchorCenter - width / 2;
  const left = Math.max(safeLeft, Math.min(safeRight - width, unclampedLeft));
  const requestedTop = placement === "above"
    ? anchorTop - safeGap - maxHeight
    : anchorBottom + safeGap;
  const top = Math.max(safeTop, Math.min(safeBottom - maxHeight, requestedTop));
  const anchorX = Math.max(18, Math.min(width - 18, anchorCenter - left));

  return {
    anchorX: Math.round(anchorX),
    left: Math.round(left),
    maxHeight: Math.round(maxHeight),
    placement,
    position: "fixed",
    top: Math.round(top),
    width: Math.round(width),
  };
}
