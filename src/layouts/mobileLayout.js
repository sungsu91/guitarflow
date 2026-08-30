export const MOBILE_LAYOUT_MAX_WIDTH = 680;
export const MOBILE_LAYOUT_MEDIA_QUERY = `(max-width: ${MOBILE_LAYOUT_MAX_WIDTH}px)`;

const MOBILE_USER_AGENT_PATTERN = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile/i;

export function isLikelyMobileDevice(navigatorObject) {
  if (!navigatorObject) return false;
  if (navigatorObject.userAgentData?.mobile === true) return true;
  const userAgent = navigatorObject.userAgent ?? "";
  const isIPadLike = /Macintosh/i.test(userAgent)
    && (navigatorObject.maxTouchPoints ?? 0) > 1;
  return MOBILE_USER_AGENT_PATTERN.test(userAgent) || isIPadLike;
}

export function getIsMobileLayout(
  targetWindow = typeof window === "undefined" ? null : window,
) {
  if (!targetWindow) return false;
  const compactViewport = typeof targetWindow.matchMedia === "function"
    && targetWindow.matchMedia(MOBILE_LAYOUT_MEDIA_QUERY).matches;
  return compactViewport || isLikelyMobileDevice(targetWindow.navigator);
}

