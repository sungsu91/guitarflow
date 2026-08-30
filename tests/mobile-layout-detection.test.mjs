import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MOBILE_LAYOUT_MEDIA_QUERY,
  getIsMobileLayout,
  isLikelyMobileDevice,
} from "../src/layouts/mobileLayout.js";

function createWindow({
  maxTouchPoints = 0,
  mobile = false,
  userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  width = 1440,
} = {}) {
  return {
    matchMedia(query) {
      assert.equal(query, MOBILE_LAYOUT_MEDIA_QUERY);
      return { matches: width <= 680 };
    },
    navigator: {
      maxTouchPoints,
      userAgent,
      userAgentData: { mobile },
    },
  };
}

test("compact desktop windows continue to use the mobile layout", () => {
  assert.equal(getIsMobileLayout(createWindow({ width: 430 })), true);
});

test("an unfolded Galaxy Fold remains a mobile device above the old breakpoint", () => {
  const foldWindow = createWindow({
    mobile: true,
    userAgent: "Mozilla/5.0 (Linux; Android 16; SM-F966N) AppleWebKit Mobile Safari",
    width: 768,
  });

  assert.equal(isLikelyMobileDevice(foldWindow.navigator), true);
  assert.equal(getIsMobileLayout(foldWindow), true);
});

test("iPad-style touch devices remain mobile while wide desktop browsers do not", () => {
  assert.equal(getIsMobileLayout(createWindow({
    maxTouchPoints: 5,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
    width: 1024,
  })), true);
  assert.equal(getIsMobileLayout(createWindow()), false);
});

test("the canonical shooter canvas is gated by the runtime mobile class, not viewport width", async () => {
  const styles = await readFile(
    new URL("../src/shooter/mobile-canonical-viewport.css", import.meta.url),
    "utf8",
  );

  assert.match(styles, /html\.shooterCanonicalMobile/);
  assert.doesNotMatch(styles, /@media \(max-width: 680px\)/);
});

