export const INITIAL_PREPARED_MODES = Object.freeze([
  'fretboard-viewer', 'tuner', 'metronome', 'practice', 'mini-chord-maker',
]);

export const loadRhythmTrainer = () => import('../rhythm-trainer/RhythmTrainer.jsx');
export const loadScoreStudio = () => import('../pdf/PdfStudio.jsx');

const MODE_LOADERS = [
  ['rhythm-trainer', loadRhythmTrainer],
  ['etudes', () => Promise.all([loadScoreStudio(), import('../etudes/EtudeStudio.jsx')])],
];

// A DOM marker is deliberate: effects and refs are disconnected in a hidden
// Activity, so an effect cannot report when its first render has committed.
export function waitForPreparedModes({ root, modes, signal }) {
  return new Promise(resolve => {
    const targetWindow = root?.ownerDocument?.defaultView;
    if (!root || !targetWindow?.MutationObserver || signal?.aborted) return resolve();
    const finish = () => {
      observer.disconnect();
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    const check = () => {
      if (modes.every(mode => root.querySelector(`[data-prepared-mode="${mode}"]`))) finish();
    };
    const observer = new targetWindow.MutationObserver(check);
    observer.observe(root, { childList: true, subtree: true });
    signal?.addEventListener('abort', finish, { once: true });
    check();
  });
}

// Keep requests bounded, and retry failed assets on a later full preparation.
const decodedImages = new Map();
export function prepareModeImages(sources, targetWindow = window) {
  return Promise.allSettled([...new Set(sources)].map(src => {
    if (decodedImages.has(src)) return decodedImages.get(src);
    const pending = new Promise((resolve, reject) => {
      const image = new targetWindow.Image();
      const timer = targetWindow.setTimeout(() => finish(false), 5000);
      const finish = ok => {
        targetWindow.clearTimeout(timer);
        image.onload = image.onerror = null;
        if (ok) resolve();
        else reject(new Error(`Image preparation failed: ${src}`));
      };
      image.onload = () => {
        Promise.resolve().then(() => image.decode?.()).then(() => finish(true), () => finish(false));
      };
      image.onerror = () => finish(false);
      image.src = src;
    }).catch(error => { decodedImages.delete(src); throw error; });
    decodedImages.set(src, pending);
    return pending;
  }));
}

export async function prepareAppModes({
  root, mountModes, imageSources = [], budgetMs = 6500,
  loaders = MODE_LOADERS, prepareImages = prepareModeImages,
}) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise(resolve => {
    timer = setTimeout(() => { controller.abort(); resolve('budget-reached'); }, budgetMs);
  });
  const preparation = (async () => {
    mountModes(INITIAL_PREPARED_MODES);
    const images = prepareImages(imageSources);
    const loaded = await Promise.allSettled(loaders.map(([, load]) => load()));
    if (controller.signal.aborted) return 'budget-reached';
    const modes = loaded.flatMap((result, index) => result.status === 'fulfilled' ? [loaders[index][0]] : []);
    mountModes(modes);
    await Promise.all([
      images,
      waitForPreparedModes({ root, modes: [...INITIAL_PREPARED_MODES, ...modes], signal: controller.signal }),
    ]);
    return 'modes-prepared';
  })();
  try {
    return await Promise.race([preparation, deadline]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
