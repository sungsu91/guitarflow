// Native browser paint preserves CSS text clipping, SVGs and sprite sheets.
// This renderer never writes to the live game DOM.
import { RECORDING_WIDTH } from "./recordingMedia.js";
const PROPERTIES = `display position top right bottom left width height min-width min-height max-width max-height
box-sizing margin padding border border-radius border-top-left-radius border-top-right-radius border-bottom-left-radius border-bottom-right-radius
border-top border-right border-bottom border-left background-color background-image background-position background-size background-repeat background-origin background-clip
opacity overflow overflow-x overflow-y visibility z-index transform transform-origin translate rotate scale color font-family font-size font-weight font-style font-variant
line-height letter-spacing text-align text-transform text-decoration text-shadow white-space word-break overflow-wrap vertical-align
flex-direction flex-wrap flex-grow flex-shrink flex-basis align-items align-self align-content justify-content justify-items justify-self gap row-gap column-gap
grid-template-columns grid-template-rows grid-column grid-row grid-auto-flow grid-auto-columns grid-auto-rows order
object-fit object-position float clear box-shadow filter backdrop-filter isolation mix-blend-mode clip-path appearance
mask-image mask-size mask-position mask-repeat -webkit-mask-image -webkit-mask-size -webkit-mask-position -webkit-mask-repeat
fill fill-opacity stroke stroke-width stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset stroke-opacity
-webkit-text-fill-color -webkit-text-stroke-color -webkit-text-stroke-width -webkit-background-clip`.trim().split(/\s+/);
export function createPaintTexture(panel, options = {}) {
  const assets = new Map();
  const abort = new AbortController();
  let disposed = false;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const asset = (url) => {
    if (!url || url.startsWith("data:") || url.startsWith("#")) return Promise.resolve(url);
    const absolute = new URL(url, document.baseURI).href;
    if (!assets.has(absolute)) assets.set(absolute, fetch(absolute, { signal: abort.signal }).then((r) => {
      if (!r.ok) throw new Error(`촬영 이미지 로드 실패 (${r.status})`);
      return r.blob();
    }).then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    })));
    return assets.get(absolute);
  };
  async function cssUrls(value) {
    const matches = [...value.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
    for (const match of matches) value = value.replace(match[0], `url("${await asset(match[1])}")`);
    return value;
  }
  async function styleCopy(style, clone) {
    for (const key of PROPERTIES) {
      const value = style.getPropertyValue(key);
      if (value) clone.style.setProperty(key, value.includes("url(") ? await cssUrls(value) : value);
    }
    clone.style.setProperty("animation", "none", "important");
    clone.style.setProperty("transition", "none", "important");
  }
  async function pseudo(source, clone, type) {
    const style = getComputedStyle(source, type);
    if ([
      "none",
      "normal",
      ""
    ].includes(style.content) || style.display === "none") return;
    const span = document.createElement("span");
    await styleCopy(style, span);
    try {
      span.textContent = JSON.parse(style.content);
    } catch {
      span.textContent = "";
    }
    if (type === "::before") clone.prepend(span);
    else clone.append(span);
  }
  async function snapshot(source, root = false) {
    if (source.nodeType === Node.TEXT_NODE) return document.createTextNode(source.textContent);
    if (source.nodeType !== Node.ELEMENT_NODE || [
      "SCRIPT",
      "STYLE",
      "IFRAME"
    ].includes(source.tagName)) return null;
    const computed = getComputedStyle(source);
    if (computed.display === "none") return null;
    const clone = source.cloneNode(false);
    clone.removeAttribute("style");
    await styleCopy(computed, clone);
    if (source instanceof HTMLImageElement) {
      clone.removeAttribute("srcset");
      clone.src = await asset(source.currentSrc || source.src);
    }
    if (source instanceof HTMLCanvasElement) {
      const img = document.createElement("img");
      img.src = source.toDataURL();
      img.style.cssText = clone.style.cssText;
      return img;
    }
    const leaf = root && options.leaf;
    const children = await Promise.all([...source.childNodes].filter((node) => !leaf || node.nodeType === Node.TEXT_NODE).map((node) => snapshot(node)));
    clone.replaceChildren(...children.filter(Boolean));
    if (!leaf && source instanceof HTMLElement && ![
      "IMG",
      "CANVAS",
      "VIDEO",
      "INPUT"
    ].includes(source.tagName)) await Promise.all([pseudo(source, clone, "::before"), pseudo(source, clone, "::after")]);
    return clone;
  }
  return {
    dispose() {
      disposed = true;
      abort.abort();
      assets.clear();
    },
    async capture() {
      if (disposed) throw new Error("촬영이 종료되었습니다.");
      const width = options.width || panel.offsetWidth || panel.clientWidth, height = options.height || panel.offsetHeight || panel.clientHeight;
      const clone = options.pseudo ? document.createElement("div") : await snapshot(panel, true);
      if (options.pseudo) await styleCopy(getComputedStyle(panel, options.pseudo), clone);
      if (options.leaf) clone.replaceChildren(...[...clone.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE));
      if (options.style) for (const [key, value] of Object.entries(options.style)) clone.style.setProperty(key, value, "important");
      clone.style.position = "relative";
      clone.style.inset = "auto";
      clone.style.margin = "0";
      clone.style.transform = "none";
      clone.style.opacity = "1";
      clone.style.filter = "none";
      clone.style.width = `${width}px`;
      clone.style.height = `${height}px`;
      const resolution = options.resolution || RECORDING_WIDTH / width;
      const padding = options.padding || 0;
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `position:relative;width:${width + padding * 2}px;height:${height + padding * 2}px;background:transparent;`;
      clone.style.left = `${padding}px`;
      clone.style.top = `${padding}px`;
      wrapper.append(clone);
      // Detect browsers that decode SVG but silently omit foreignObject HTML.
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;left:0;top:0;width:4px;height:4px;background:rgb(1,2,3);z-index:2147483647;";
      wrapper.append(probe);
      const markup = new XMLSerializer().serializeToString(wrapper);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil((width + padding * 2) * resolution)}" height="${Math.ceil((height + padding * 2) * resolution)}" viewBox="0 0 ${width + padding * 2} ${height + padding * 2}"><foreignObject width="${width + padding * 2}" height="${height + padding * 2}">${markup}</foreignObject></svg>`;
      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      await img.decode();
      if (disposed) throw new Error("촬영이 종료되었습니다.");
      canvas.width = Math.ceil((width + padding * 2) * resolution);
      canvas.height = Math.ceil((height + padding * 2) * resolution);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0);
      const pixel = context.getImageData(Math.floor(resolution * 2), Math.floor(resolution * 2), 1, 1).data;
      if (pixel[3] !== 255 || pixel[0] > 4 || pixel[1] > 5 || pixel[2] > 6) throw new Error("이 브라우저에서는 게임 화면을 정확히 녹화할 수 없습니다. 최신 브라우저에서 다시 시도해주세요.");
      context.clearRect(0, 0, Math.ceil(resolution * 4), Math.ceil(resolution * 4));
      return canvas;
    }
  };
}
