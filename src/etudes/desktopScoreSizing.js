export const DESKTOP_SCORE_WIDTH = 1100;
export const DESKTOP_SCORE_PAGE_RATIO = 297 / 210;
export const DESKTOP_SCORE_PAGE_HEIGHT = DESKTOP_SCORE_WIDTH * DESKTOP_SCORE_PAGE_RATIO;

// Auto fits one A4 portrait page. The reader can arrange multiple pages at this
// scale without changing the engraving or shrinking the entire piece.
export function desktopScoreScale({mode='auto',width,height,scoreWidth=DESKTOP_SCORE_WIDTH}) {
  if (!(width > 0 && height > 0 && scoreWidth > 0)) return 1;
  const fitWidth = width / scoreWidth;
  if (mode === 'width') return fitWidth;
  if (mode !== 'auto') return Math.max(.5,Math.min(2,Number(mode)||1));
  return Math.min(fitWidth,height/(scoreWidth*DESKTOP_SCORE_PAGE_RATIO),1.25);
}
