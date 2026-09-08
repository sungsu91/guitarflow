import { RECORDING_WIDTH } from "./recordingMedia.js";
import { createPaintTexture } from "./canvasPaintTexture.js";
const UI = ".mobileShooterTopHud,.mobileShooterTargetHud,.mobileShooterScoreHud,.mobileShooterLives,.shooterCenterStatus,.shooterCountInOverlay,.shooterScenarioCountdown,.shooterScenarioRoundSummary,.shooterPitchMonitorMobile,.shooterPitchMonitorDesktop,.shooterEnemyPitchLabel,.shooterGuitarCabinet--gameplay";
const urlFrom = (value) => /^url\(["']?(.*?)["']?\)$/.exec(value)?.[1];
const number = (value) => Number.parseFloat(value) || 0;
const boxSize = (n, s, axis) => {
  const value = number(s[axis]);
  if (!value) return axis === "width" ? n.offsetWidth : n.offsetHeight;
  const sides = axis === "width" ? ["Left", "Right"] : ["Top", "Bottom"];
  return value + (s.boxSizing === "border-box" ? 0 : sides.reduce((sum, side) => sum + number(s["padding" + side]) + number(s["border" + side + "Width"]), 0));
};
export function createSceneCapture(panel) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("영상 합성 기능을 사용할 수 없습니다.");
  const textures = new Map(), images = new Map(), renderers = new Set();
  const spriteFrames = new Map();
  let spriteBytes = 0;
  const previousTextures = new WeakMap();
  let textureBytes = 0;
  let disposed = false, fatal = null;
  const stats = {
    frames: 0,
    totalMs: 0,
    maxMs: 0,
    pending: 0,
    textureBuilds: 0
  };
  let styleCache, offsetCache;
  const style = (n) => {
    if (!styleCache.has(n)) styleCache.set(n, getComputedStyle(n));
    return styleCache.get(n);
  };
  function layout(n) {
    if (!n) return {
      x: 0,
      y: 0
    };
    if (offsetCache.has(n)) return offsetCache.get(n);
    if (n instanceof SVGElement) {
      // SVG roots have no offsetLeft/offsetParent; treating them as zero moves
      // icons to the panel origin. Resolve their containing block explicitly.
      const s = style(n);
      let parent = n.parentElement;
      if (s.position === "absolute") while (parent?.parentElement && style(parent).position === "static" && style(parent).transform === "none") parent = parent.parentElement;
      const origin = layout(parent);
      const r = n.getBoundingClientRect(), p = parent.getBoundingClientRect();
      const v = {
        x: origin.x + (s.position === "absolute" && s.left !== "auto" ? number(s.left) : (r.left - p.left) * parent.clientWidth / p.width),
        y: origin.y + (s.position === "absolute" && s.top !== "auto" ? number(s.top) : (r.top - p.top) * parent.clientHeight / p.height)
      };
      offsetCache.set(n, v);
      return v;
    }
    const parent = layout(n.offsetParent);
    const v = {
      x: parent.x + (n.offsetLeft || 0),
      y: parent.y + (n.offsetTop || 0)
    };
    offsetCache.set(n, v);
    return v;
  }
  function matrix(n, parent) {
    const s = style(n), pos = layout(n), origin = layout(parent);
    const [ox, oy] = s.transformOrigin.split(" ").map(number);
    const t = new DOMMatrix(s.transform === "none" ? undefined : s.transform);
    return new DOMMatrix().translate(pos.x - origin.x, pos.y - origin.y).translate(ox, oy).multiply(t).translate(-ox, -oy);
  }
  function image(url) {
    if (!images.has(url)) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      const entry = {
        img,
        ready: false
      };
      entry.promise = img.decode().then(() => {
        entry.ready = true;
      }).catch((error) => {
        if (!disposed) fatal = error;
      });
      images.set(url, entry);
    }
    return images.get(url);
  }
  function bg(n, s, w, h) {
    const url = urlFrom(s.backgroundImage);
    if (!url) return false;
    const entry = image(url);
    if (!entry.ready) return true;
    const img = entry.img;
    let bw, bh;
    const sizes = s.backgroundSize.split(" ");
    if (["cover", "contain"].includes(sizes[0])) {
      const ratio = Math[sizes[0] === "cover" ? "max" : "min"](w / img.naturalWidth, h / img.naturalHeight);
      bw = img.naturalWidth * ratio;
      bh = img.naturalHeight * ratio;
    } else {
      bw = sizes[0]?.endsWith("%") ? w * number(sizes[0]) / 100 : number(sizes[0]) || img.naturalWidth;
      bh = sizes[1]?.endsWith("%") ? h * number(sizes[1]) / 100 : number(sizes[1]) || bw * img.naturalHeight / img.naturalWidth;
    }
    const positions = s.backgroundPosition.split(" ");
    const px = positions[0]?.endsWith("%") ? (w - bw) * number(positions[0]) / 100 : number(positions[0]);
    const py = positions[1]?.endsWith("%") ? (h - bh) * number(positions[1]) / 100 : number(positions[1]);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    const dx = Math.max(0, px), dy = Math.max(0, py), dw = Math.min(w, px + bw) - dx, dh = Math.min(h, py + bh) - dy;
    if (dw > 0 && dh > 0) {
      const sx = (dx - px) * img.naturalWidth / bw, sy = (dy - py) * img.naturalHeight / bh;
      const sw = dw * img.naturalWidth / bw, sh = dh * img.naturalHeight / bh;
      // Upload only the current sprite cell. Reusing a giant sheet on every
      // frame can thrash the browser's decoded-image/GPU cache on mobile.
      const resolution = RECORDING_WIDTH / panel.clientWidth;
      const tw = Math.ceil(dw * resolution), th = Math.ceil(dh * resolution);
      const key = [
        url,
        Math.round(sx),
        Math.round(sy),
        Math.round(sw),
        Math.round(sh),
        tw,
        th
      ].join("|");
      let tile = spriteFrames.get(key);
      if (tile) { spriteFrames.delete(key); spriteFrames.set(key, tile); }
      if (!tile) {
        tile = document.createElement("canvas");
        tile.width = tw;
        tile.height = th;
        tile.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
        spriteFrames.set(key, tile);
        spriteBytes += tw * th * 4;
        while (spriteBytes > 32 * 1024 * 1024 && spriteFrames.size > 1) {
          const oldest = spriteFrames.keys().next().value;
          const removed = spriteFrames.get(oldest);
          spriteBytes -= removed.width * removed.height * 4;
          spriteFrames.delete(oldest);
        }
      }
      ctx.drawImage(tile, dx, dy, dw, dh);
    }
    ctx.restore();
    return true;
  }
  function texture(n, s, w, h, whole = false, pseudo = null) {
    // Geometry is applied from the live scene every frame, outside the cached paint.
    const text = whole ? n.innerHTML : [...n.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join("");
    const key = [
      pseudo,
      n.tagName,
      n.getAttribute("class"),
      w,
      h,
      text,
      s.backgroundImage,
      s.backgroundColor,
      s.color,
      s.font,
      s.border,
      s.borderRadius
    ].join("|");
    let entry = textures.get(key);
    if (!entry) {
      entry = { ready: false };
      textures.set(key, entry);
      stats.pending++;
      stats.textureBuilds++;
      const padding = whole ? 40 : 4;
      const renderer = createPaintTexture(n, {
        width: w,
        height: h,
        resolution: RECORDING_WIDTH / panel.clientWidth,
        padding,
        leaf: !whole,
        pseudo
      });
      renderers.add(renderer);
      entry.padding = padding;
      entry.width = w;
      entry.height = h;
      entry.promise = renderer.capture().then((img) => {
        if (!disposed) {
          entry.image = img;
          entry.ready = true;
          entry.bytes = img.width * img.height * 4;
          textureBytes += entry.bytes;
        }
      }).catch((error) => {
        if (!disposed) fatal = error;
      }).finally(() => {
        renderer.dispose();
        renderers.delete(renderer);
        stats.pending--;
      });
    }
    entry.lastFrame = stats.frames;
    // Retain the previous text/menu for the few milliseconds needed to paint a new one.
    const previous = previousTextures.get(n);
    const draw = entry.ready ? entry : !pseudo && previous?.width === w && previous?.height === h ? previous : null;
    if (draw?.ready) ctx.drawImage(draw.image, -draw.padding, -draw.padding, w + draw.padding * 2, h + draw.padding * 2);
    if (entry.ready && !pseudo) previousTextures.set(n, entry);
    if (textureBytes > 48 * 1024 * 1024 || textures.size > 128) {
      for (const [cachedKey, cached] of textures) {
        if (cached.ready && cached.lastFrame < stats.frames - 2) {
          textureBytes -= cached.bytes || 0;
          textures.delete(cachedKey);
        }
        if (textureBytes <= 48 * 1024 * 1024 && textures.size <= 128) break;
      }
    }
  }
  function paint(n, parent, root = false) {
    if (!(n instanceof HTMLElement || n instanceof SVGElement)) return;
    if (n.matches('[data-recording-ui],.shooterRecordingReview,.shooterRecordingCamera')) return;
    const s = style(n);
    if (s.display === "none" || s.visibility === "hidden" || number(s.opacity) === 0) return;
    const w = boxSize(n, s, "width"), h = boxSize(n, s, "height");
    if (!w || !h) return;
    ctx.save();
    if (!root) {
      const m = matrix(n, parent);
      ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    }
    ctx.globalAlpha *= number(s.opacity);
    if (s.filter !== "none") ctx.filter = s.filter;
    if (s.mixBlendMode !== "normal" && s.mixBlendMode !== "plus-lighter") ctx.globalCompositeOperation = s.mixBlendMode;
    const whole = n.matches(UI) || n instanceof SVGElement;
    if (whole) {
      texture(n, s, w, h, true);
      ctx.restore();
      return;
    }
    if (n instanceof HTMLImageElement) {
      if (n.complete && n.naturalWidth) {
        const fit = s.objectFit;
        let dw = w, dh = h;
        if (["contain", "cover"].includes(fit)) {
          const ratio = Math[fit === "contain" ? "min" : "max"](w / n.naturalWidth, h / n.naturalHeight);
          dw = n.naturalWidth * ratio;
          dh = n.naturalHeight * ratio;
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.clip();
        // Static source images are resized once for the recording output, so
        // large instrument/monster originals are not uploaded on every frame.
        const source = n.currentSrc || n.src;
        let drawable = n;
        if (/\.(png|jpe?g)(\?|$)/i.test(source)) {
          const resolution = RECORDING_WIDTH / panel.clientWidth;
          const iw = Math.max(1, Math.ceil(dw * resolution)), ih = Math.max(1, Math.ceil(dh * resolution));
          const key = `image|${source}|${iw}|${ih}`;
          let cached = spriteFrames.get(key);
          if (!cached) {
            cached = document.createElement('canvas'); cached.width = iw; cached.height = ih;
            const paint = cached.getContext('2d'); paint.imageSmoothingQuality = 'high';
            paint.drawImage(n, 0, 0, iw, ih);
            spriteBytes += iw * ih * 4;
          } else spriteFrames.delete(key);
          spriteFrames.set(key, cached);
          drawable = cached;
          while (spriteBytes > 32 * 1024 * 1024 && spriteFrames.size > 1) {
            const oldest = spriteFrames.keys().next().value, removed = spriteFrames.get(oldest);
            spriteBytes -= removed.width * removed.height * 4; spriteFrames.delete(oldest);
          }
        }
        ctx.drawImage(drawable, (w - dw) / 2, (h - dh) / 2, dw, dh);
        ctx.restore();
      }
    } else if (n instanceof HTMLCanvasElement) ctx.drawImage(n, 0, 0, w, h);
    else {
      const backgroundDrawn = bg(n, s, w, h);
      const ownText = [...n.childNodes].some((t) => t.nodeType === Node.TEXT_NODE && t.textContent.trim());
      if (!backgroundDrawn && (ownText || s.backgroundImage !== "none" || !["rgba(0, 0, 0, 0)", "transparent"].includes(s.backgroundColor) || number(s.borderTopWidth) > 0)) texture(n, s, w, h);
      if (s.overflow === "hidden" || s.overflow === "clip" || s.contain.includes("paint")) {
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.clip();
      }
      const entries = [
        { pseudo: "::before" },
        ...[...n.children].filter((c) => c instanceof HTMLElement || c instanceof SVGElement).map((node) => ({ node })),
        { pseudo: "::after" }
      ];
      for (const entry of entries) entry.style = entry.node ? style(entry.node) : getComputedStyle(n, entry.pseudo);
      entries.sort((a, b) => (a.node?.matches(".mobileShooterTopHud") ? 1e4 : number(a.style.zIndex)) - (b.node?.matches(".mobileShooterTopHud") ? 1e4 : number(b.style.zIndex)));
      for (const entry of entries) {
        if (entry.node) {
          paint(entry.node, n);
          continue;
        }
        const ps = entry.style;
        if ([
          "none",
          "normal",
          ""
        ].includes(ps.content) || ps.display === "none" || ps.visibility === "hidden") continue;
        const pw = number(ps.width) || w, ph = number(ps.height) || h;
        const left = ps.left === "auto" ? ps.right === "auto" ? 0 : w - number(ps.right) - pw : number(ps.left);
        const top = ps.top === "auto" ? ps.bottom === "auto" ? 0 : h - number(ps.bottom) - ph : number(ps.top);
        ctx.save();
        ctx.translate(left, top);
        ctx.globalAlpha *= number(ps.opacity);
        const [ox, oy] = ps.transformOrigin.split(" ").map(number);
        const pm = new DOMMatrix(ps.transform === "none" ? undefined : ps.transform);
        ctx.translate(ox, oy);
        ctx.transform(pm.a, pm.b, pm.c, pm.d, pm.e, pm.f);
        ctx.translate(-ox, -oy);
        if (!bg(n, ps, pw, ph) && (ps.backgroundImage !== "none" || !["rgba(0, 0, 0, 0)", "transparent"].includes(ps.backgroundColor) || number(ps.borderTopWidth) > 0)) texture(n, ps, pw, ph, false, entry.pseudo);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function frame() {
    if (disposed) throw new Error("촬영이 종료되었습니다.");
    if (fatal) throw fatal;
    const start = performance.now();
    styleCache = new WeakMap();
    offsetCache = new WeakMap();
    const width = RECORDING_WIDTH, height = Math.round(panel.clientHeight * width / panel.clientWidth);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#020503";
    ctx.fillRect(0, 0, width, height);
    ctx.scale(width / panel.clientWidth, height / panel.clientHeight);
    paint(panel, null, true);
    // Pitch monitor is a body portal, but belongs in the recorded game view.
    const monitor = document.querySelector(".shooterPitchMonitorMobile,.shooterPitchMonitorDesktop");
    if (monitor) {
      const r = monitor.getBoundingClientRect(), p = panel.getBoundingClientRect(), s = style(monitor);
      ctx.save();
      ctx.translate((r.left - p.left) * panel.clientWidth / p.width, (r.top - p.top) * panel.clientHeight / p.height);
      ctx.scale(panel.clientWidth / p.width, panel.clientHeight / p.height);
      texture(monitor, s, r.width, r.height, true);
      ctx.restore();
    }
    const ms = performance.now() - start;
    stats.frames++;
    stats.totalMs += ms;
    stats.maxMs = Math.max(stats.maxMs, ms);
    return canvas;
  }
  return {
    stats,
    async capture() {
      frame();
      if (stats.frames === 1) {
        for (let i = 0; i < 3; i++) {
          await Promise.all([...images.values(), ...textures.values()].map((e) => e.promise));
          frame();
        }
        ctx.getImageData(0, 0, 1, 1);
      }
      return canvas;
    },
    dispose() {
      disposed = true;
      for (const renderer of renderers) renderer.dispose();
      renderers.clear();
      textures.clear();
      spriteFrames.clear();
      for (const entry of images.values()) entry.img.src = "";
      images.clear();
      canvas.width = canvas.height = 0;
    }
  };
}
