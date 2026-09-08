// Shared iOS/Android/desktop UI painter. Never embeds HTML in SVG foreignObject.
// Layout comes from the live DOM; pixels come from Canvas text, paths and images.
import { RECORDING_WIDTH } from "./recordingMedia.js";
const number = (value) => Number.parseFloat(value) || 0;
const transparent = (value) => !value || value === "transparent" || value === "rgba(0, 0, 0, 0)";
function split(value) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")") depth--;
    if (value[i] === "," && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}
function gradient(ctx, value, r) {
  const match = /^(linear|radial)-gradient\((.*)\)$/.exec(value);
  if (!match) return null;
  const parts = split(match[2]);
  let direction = "", paint;
  if (!CSS.supports("color", parts[0].replace(/\s+[-\d.]+(?:%|px)(?:\s+[-\d.]+(?:%|px))?$/, ""))) direction = parts.shift();
  if (match[1] === "linear") {
    const angle = direction.endsWith("deg") ? number(direction) : {
      "to right": 90,
      "to left": 270,
      "to top": 0,
      "to bottom": 180
    }[direction] ?? 180;
    const a = angle * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
    const length = Math.abs(r.w * dx) + Math.abs(r.h * dy);
    paint = ctx.createLinearGradient(r.x + r.w / 2 - dx * length / 2, r.y + r.h / 2 - dy * length / 2, r.x + r.w / 2 + dx * length / 2, r.y + r.h / 2 + dy * length / 2);
  } else {
    paint = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, 0, r.x + r.w / 2, r.y + r.h / 2, Math.max(1, Math.hypot(r.w, r.h) / 2));
  }
  let added = 0;
  parts.forEach((part, index) => {
    const stop = /^(.*?)(?:\s+([-\d.]+)%)(?:\s+([-\d.]+)%)?$/.exec(part);
    const color = stop ? stop[1] : part;
    if (!CSS.supports("color", color)) return;
    const positions = stop ? [number(stop[2]) / 100, ...stop[3] ? [number(stop[3]) / 100] : []] : [index / Math.max(1, parts.length - 1)];
    for (const position of positions) {
      paint.addColorStop(Math.max(0, Math.min(1, position)), color);
      added++;
    }
  });
  return added ? paint : null;
}
function rounded(ctx, r, radius) {
  const a = Math.max(0, Math.min(radius, r.w / 2, r.h / 2));
  ctx.beginPath();
  ctx.moveTo(r.x + a, r.y);
  ctx.lineTo(r.x + r.w - a, r.y);
  ctx.quadraticCurveTo(r.x + r.w, r.y, r.x + r.w, r.y + a);
  ctx.lineTo(r.x + r.w, r.y + r.h - a);
  ctx.quadraticCurveTo(r.x + r.w, r.y + r.h, r.x + r.w - a, r.y + r.h);
  ctx.lineTo(r.x + a, r.y + r.h);
  ctx.quadraticCurveTo(r.x, r.y + r.h, r.x, r.y + r.h - a);
  ctx.lineTo(r.x, r.y + a);
  ctx.quadraticCurveTo(r.x, r.y, r.x + a, r.y);
  ctx.closePath();
}
const svgProperties = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-opacity",
  "opacity",
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "visibility",
  "display"
];
export function createPaintTexture(root, options = {}) {
  let disposed = false;
  const images = new Map();
  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("게임 화면을 그릴 수 없습니다. [CANVAS_CONTEXT]");
  const check = () => {
    if (disposed) throw new Error("촬영이 종료되었습니다.");
  };
  async function load(src) {
    if (!images.has(src)) {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = src;
      images.set(src, image);
    }
    const image = images.get(src);
    await image.decode();
    check();
    return image;
  }
  return {
    dispose() {
      disposed = true;
      images.clear();
    },
    async capture() {
      check();
      const bounds = root.getBoundingClientRect();
      const width = options.width || root.offsetWidth || bounds.width;
      const height = options.height || root.offsetHeight || bounds.height;
      const resolution = options.resolution || RECORDING_WIDTH / width, padding = options.padding || 0;
      const sx = width / Math.max(.01, bounds.width), sy = height / Math.max(.01, bounds.height);
      const rect = (node) => {
        const r = node.getBoundingClientRect();
        return {
          x: (r.left - bounds.left) * sx,
          y: (r.top - bounds.top) * sy,
          w: r.width * sx,
          h: r.height * sy
        };
      };
      const local = (r) => ({
        x: (r.left - bounds.left) * sx,
        y: (r.top - bounds.top) * sy,
        w: r.width * sx,
        h: r.height * sy
      });
      canvas.width = Math.ceil((width + padding * 2) * resolution);
      canvas.height = Math.ceil((height + padding * 2) * resolution);
      ctx.scale(resolution, resolution);
      ctx.translate(padding, padding);
      function box(s, r) {
        const radius = number(s.borderTopLeftRadius);
        const clipText = (s.backgroundClip + " " + s.webkitBackgroundClip).includes("text");
        rounded(ctx, r, radius);
        if (!transparent(s.backgroundColor)) {
          ctx.fillStyle = s.backgroundColor;
          ctx.fill();
        }
        if (!clipText) for (const layer of split(s.backgroundImage).reverse()) {
          const paint = gradient(ctx, layer, r);
          if (paint) {
            ctx.fillStyle = paint;
            ctx.fill();
          }
        }
        const border = number(s.borderTopWidth);
        const uniformBorder = [
          "Right",
          "Bottom",
          "Left"
        ].every((side) => s[`border${side}Width`] === s.borderTopWidth && s[`border${side}Color`] === s.borderTopColor);
        if (uniformBorder && border && !transparent(s.borderTopColor)) {
          rounded(ctx, {
            x: r.x + border / 2,
            y: r.y + border / 2,
            w: Math.max(0, r.w - border),
            h: Math.max(0, r.h - border)
          }, radius);
          ctx.strokeStyle = s.borderTopColor;
          ctx.lineWidth = border;
          ctx.stroke();
        } else if (!uniformBorder) {
          for (const [side, x, y, w, h] of [
            [
              "Top",
              r.x,
              r.y,
              r.w,
              number(s.borderTopWidth)
            ],
            [
              "Bottom",
              r.x,
              r.y + r.h - number(s.borderBottomWidth),
              r.w,
              number(s.borderBottomWidth)
            ],
            [
              "Left",
              r.x,
              r.y,
              number(s.borderLeftWidth),
              r.h
            ],
            [
              "Right",
              r.x + r.w - number(s.borderRightWidth),
              r.y,
              number(s.borderRightWidth),
              r.h
            ]
          ]) if (w && h && !transparent(s[`border${side}Color`])) {
            ctx.fillStyle = s[`border${side}Color`];
            ctx.fillRect(x, y, w, h);
          }
        }
      }
      function text(node, s, r) {
        if (!node.textContent.trim()) return;
        const fontSize = number(s.fontSize) || 14;
        ctx.font = `${s.fontStyle} ${s.fontWeight} ${fontSize}px ${s.fontFamily}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        const metrics = ctx.measureText("Mg");
        const ascent = metrics.fontBoundingBoxAscent ?? fontSize * .8, descent = metrics.fontBoundingBoxDescent ?? fontSize * .2;
        const clipped = (s.backgroundClip + " " + s.webkitBackgroundClip).includes("text");
        ctx.fillStyle = clipped && gradient(ctx, split(s.backgroundImage)[0], r) || (!transparent(s.webkitTextFillColor) ? s.webkitTextFillColor : s.color);
        const stroke = number(s.webkitTextStrokeWidth);
        ctx.strokeStyle = s.webkitTextStrokeColor || s.color;
        ctx.lineWidth = stroke;
        const range = document.createRange();
        let offset = 0;
        // Range positions preserve wrapping, spacing and CSS alignment without
        // relaying out HTML in a second browser-specific document.
        const segments = typeof Intl.Segmenter === "function" ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(node.textContent)].map((item) => item.segment) : Array.from(node.textContent);
        for (const raw of segments) {
          range.setStart(node, offset);
          offset += raw.length;
          range.setEnd(node, offset);
          if (!raw.trim()) continue;
          const q = local(range.getBoundingClientRect());
          if (!q.w || !q.h) continue;
          const value = s.textTransform === "uppercase" ? raw.toUpperCase() : s.textTransform === "lowercase" ? raw.toLowerCase() : raw;
          const baseline = q.y + q.h / 2 + (ascent - descent) / 2;
          if (stroke) ctx.strokeText(value, q.x, baseline);
          ctx.fillText(value, q.x, baseline);
        }
        range.detach();
      }
      async function svg(node, r) {
        const clone = node.cloneNode(true);
        if (clone.querySelector("foreignObject")) throw new Error("지원하지 않는 SVG 화면 요소입니다. [SVG_CONTENT]");
        const sources = [node, ...node.querySelectorAll("*")], targets = [clone, ...clone.querySelectorAll("*")];
        sources.forEach((source, index) => {
          const s = getComputedStyle(source), target = targets[index];
          target.removeAttribute("style");
          for (const key of svgProperties) target.style.setProperty(key, s.getPropertyValue(key));
        });
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("width", String(r.w));
        clone.setAttribute("height", String(r.h));
        const image = await load("data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone)));
        ctx.drawImage(image, r.x, r.y, r.w, r.h);
      }
      async function visit(node, isRoot = false) {
        check();
        const s = getComputedStyle(node);
        if (s.display === "none" || s.visibility === "hidden" || s.contentVisibility === "hidden" || number(s.opacity) === 0 || node.matches("[data-recording-ui],.shooterRecordingReview")) return;
        const r = isRoot ? {
          x: 0,
          y: 0,
          w: width,
          h: height
        } : rect(node);
        if (!r.w || !r.h) return;
        ctx.save();
        if (!isRoot) ctx.globalAlpha *= number(s.opacity);
        if (node instanceof SVGElement) {
          await svg(node, r);
          ctx.restore();
          return;
        }
        box(s, r);
        if (s.overflow === "hidden" || s.overflow === "clip") {
          rounded(ctx, r, number(s.borderTopLeftRadius));
          ctx.clip();
        }
        if (node instanceof HTMLImageElement && node.complete && node.naturalWidth) {
          const ratio = (s.objectFit === "cover" ? Math.max : Math.min)(r.w / node.naturalWidth, r.h / node.naturalHeight);
          ctx.save();
          ctx.beginPath();
          ctx.rect(r.x, r.y, r.w, r.h);
          ctx.clip();
          if (["contain", "cover"].includes(s.objectFit)) ctx.drawImage(node, r.x + (r.w - node.naturalWidth * ratio) / 2, r.y + (r.h - node.naturalHeight * ratio) / 2, node.naturalWidth * ratio, node.naturalHeight * ratio);
          else ctx.drawImage(node, r.x, r.y, r.w, r.h);
          ctx.restore();
        } else if (node instanceof HTMLCanvasElement) ctx.drawImage(node, r.x, r.y, r.w, r.h);
        else {
          const entries = [];
          if (!(isRoot && options.leaf)) for (const kind of ["::before", "::after"]) {
            const ps = getComputedStyle(node, kind);
            if (![
              "none",
              "normal",
              ""
            ].includes(ps.content) && ps.display !== "none") entries.push({
              pseudo: ps,
              z: number(ps.zIndex),
              order: kind === "::before" ? -1 : 1e6
            });
          }
          for (const child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) entries.push({
              text: child,
              z: 0,
              order: entries.length
            });
            else if (!(isRoot && options.leaf) && child instanceof Element) entries.push({
              node: child,
              z: number(getComputedStyle(child).zIndex),
              order: entries.length
            });
          }
          entries.sort((a, b) => a.z - b.z || a.order - b.order);
          for (const entry of entries) {
            if (entry.text) text(entry.text, s, r);
            else if (entry.node) await visit(entry.node);
            else {
              const ps = entry.pseudo, pw = number(ps.width) || r.w, ph = number(ps.height) || r.h;
              const pr = {
                x: r.x + (ps.left === "auto" ? ps.right === "auto" ? 0 : r.w - number(ps.right) - pw : number(ps.left)),
                y: r.y + (ps.top === "auto" ? ps.bottom === "auto" ? 0 : r.h - number(ps.bottom) - ph : number(ps.top)),
                w: pw,
                h: ph
              };
              ctx.save();
              ctx.globalAlpha *= number(ps.opacity);
              box(ps, pr);
              ctx.restore();
            }
          }
        }
        ctx.restore();
      }
      if (options.pseudo) box(getComputedStyle(root, options.pseudo), {
        x: 0,
        y: 0,
        w: width,
        h: height
      });
      else await visit(root, true);
      check();
      return canvas;
    }
  };
}
