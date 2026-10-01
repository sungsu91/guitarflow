import { getViewportProfile } from './viewportProfile.js';

// Keep tablet identity in split view and when a keyboard/trackpad is attached.
// A wide phone in landscape must continue using its existing phone layout.
export function getIsTabletLayout(target = typeof window === 'undefined' ? null : window) {
  if (!target) return false;
  const profile = getViewportProfile(target);
  const nav = target.navigator ?? {};
  const ua = nav.userAgent ?? '';
  const tabletDevice = /iPad/i.test(ua)
    || (/Macintosh/i.test(ua) && nav.maxTouchPoints > 1)
    || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const screenShortSide = Math.min(target.screen?.width || profile.width, target.screen?.height || profile.height);
  return tabletDevice || (profile.isMobileSurface && screenShortSide >= 600
    && (Math.min(profile.width, profile.height) >= 600 || nav.maxTouchPoints > 0));
}
