const MAX_DECODED_IMAGES = 6;
const MAX_DECODED_PIXELS = 4_000_000;

// Prepare the already-mounted first screen. No new screens, fetches, audio
// contexts, user settings, or retained copies of images are created here.
export async function prepareInitialSurface({
  root,
  documentObject = root?.ownerDocument,
  targetWindow = documentObject?.defaultView,
  budgetMs = 1200,
} = {}) {
  if (!root || !targetWindow?.requestAnimationFrame) return { status: 'skipped', images: 0 };

  let stopped = false;
  let deadlineId;
  const frameIds = new Set();
  const nextFrame = () => new Promise((resolve) => {
    const id = targetWindow.requestAnimationFrame(() => {
      frameIds.delete(id);
      resolve();
    });
    frameIds.add(id);
  });

  const preparation = (async () => {
    // Child effects and the visible catalog have committed before this frame.
    await nextFrame();
    if (stopped) return;
    let pixels = 0;
    const images = [];
    for (const image of root.querySelectorAll('img')) {
      if (images.length >= MAX_DECODED_IMAGES) break;
      if (!image.complete || !image.naturalWidth || typeof image.decode !== 'function') continue;
      const bounds = image.getBoundingClientRect();
      if (!bounds.width || !bounds.height || bounds.bottom <= 0 || bounds.right <= 0
        || bounds.top >= targetWindow.innerHeight || bounds.left >= targetWindow.innerWidth) continue;
      const imagePixels = image.naturalWidth * image.naturalHeight;
      if (pixels + imagePixels > MAX_DECODED_PIXELS) continue;
      pixels += imagePixels;
      images.push(image);
    }
    await Promise.allSettled([
      documentObject?.fonts?.ready,
      ...images.map((image) => Promise.resolve().then(() => image.decode())),
    ]);
    if (stopped) return;
    // Fonts can change geometry. Let layout settle before revealing this same DOM.
    await nextFrame();
    if (stopped) return;
    root.getBoundingClientRect();
    await nextFrame();
    return { status: 'prepared', images: images.length };
  })();
  const deadline = new Promise((resolve) => {
    deadlineId = targetWindow.setTimeout(() => resolve({ status: 'budget-reached', images: 0 }), budgetMs);
  });

  try {
    return await Promise.race([preparation, deadline]);
  } finally {
    stopped = true;
    targetWindow.clearTimeout(deadlineId);
    frameIds.forEach((id) => targetWindow.cancelAnimationFrame(id));
  }
}
