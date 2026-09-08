import html2canvas from "html2canvas";

// Isolate the game from the application's large stylesheets and inactive screens.
// Read presentation only: never write to live game nodes or animation state.
const PROPERTIES = (`display position top right bottom left width height min-width min-height max-width max-height
  box-sizing margin padding border border-radius border-top-left-radius border-top-right-radius border-bottom-left-radius border-bottom-right-radius
  border-top border-right border-bottom border-left background-color background-image background-position background-size background-repeat background-origin background-clip
  opacity overflow overflow-x overflow-y visibility z-index transform transform-origin color font-family font-size font-weight font-style font-variant
  line-height letter-spacing text-align text-transform text-decoration text-shadow white-space word-break overflow-wrap vertical-align
  flex-direction flex-wrap flex-grow flex-shrink flex-basis align-items align-self align-content justify-content justify-items justify-self gap row-gap column-gap
  grid-template-columns grid-template-rows grid-column grid-row grid-auto-flow grid-auto-columns grid-auto-rows order
  object-fit object-position float clear box-shadow filter isolation mix-blend-mode clip-path
  fill fill-opacity stroke stroke-width stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset stroke-opacity
  -webkit-text-stroke-color -webkit-text-stroke-width`).trim().split(/\s+/);

function copyStyle(style, target) {
  for (const property of PROPERTIES) target.style.setProperty(property, style.getPropertyValue(property));
  target.style.setProperty("animation", "none", "important");
  target.style.setProperty("transition", "none", "important");
}

function copyPseudo(source, target, pseudo, doc) {
  const style = getComputedStyle(source, pseudo);
  if (["none", "normal", ""].includes(style.content) || style.display === "none") return;
  const node = doc.createElement("span");
  copyStyle(style, node);
  try { node.textContent = JSON.parse(style.content); } catch { node.textContent = ""; }
  if (pseudo === "::before") target.prepend(node);
  else target.append(node);
}

function snapshotNode(source, doc) {
  if (source.nodeType === Node.TEXT_NODE) return doc.createTextNode(source.textContent);
  if (source.nodeType !== Node.ELEMENT_NODE || ["SCRIPT", "STYLE", "IFRAME"].includes(source.tagName)) return null;
  const style = getComputedStyle(source);
  if (style.display === "none") return null;
  const clone = doc.importNode(source, false);
  clone.removeAttribute("style");
  copyStyle(style, clone);
  if (source instanceof HTMLImageElement) clone.src = source.currentSrc || source.src;
  if (source instanceof HTMLCanvasElement) {
    clone.width = source.width;
    clone.height = source.height;
    clone.getContext("2d")?.drawImage(source, 0, 0);
  }
  for (const child of source.childNodes) {
    const childClone = snapshotNode(child, doc);
    if (childClone) clone.append(childClone);
  }
  if (source instanceof HTMLElement && !["IMG", "CANVAS", "VIDEO", "INPUT"].includes(source.tagName)) {
    copyPseudo(source, clone, "::before", doc);
    copyPseudo(source, clone, "::after", doc);
  }
  return clone;
}

export function createGameCapture(panel) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("data-recording-ui", "true");
  iframe.tabIndex = -1;
  iframe.style.cssText = `position:fixed;left:-100000px;top:0;width:${panel.clientWidth}px;height:${panel.clientHeight}px;border:0;pointer-events:none;`;
  document.body.append(iframe);
  const doc = iframe.contentDocument;
  doc.documentElement.style.cssText = "margin:0;padding:0;background:#020503";
  doc.body.style.cssText = "margin:0;padding:0;background:#020503";
  let disposed = false;
  return {
    dispose() { disposed = true; iframe.remove(); },
    async capture() {
      if (disposed) throw new Error("촬영이 종료되었습니다.");
      iframe.style.width = `${panel.clientWidth}px`;
      iframe.style.height = `${panel.clientHeight}px`;
      const clone = snapshotNode(panel, doc);
      clone.style.position = "relative";
      clone.style.inset = "auto";
      clone.style.margin = "0";
      clone.style.transform = "none";
      clone.style.width = `${panel.clientWidth}px`;
      clone.style.height = `${panel.clientHeight}px`;
      doc.body.replaceChildren(clone);
      try {
        return await html2canvas(clone, {
          backgroundColor: "#020503", scale: Math.min(1, 640 / panel.clientWidth),
          width: panel.clientWidth, height: panel.clientHeight,
          logging: false, useCORS: true, imageTimeout: 5000,
        });
      } finally {
        // Also clean up when the library rejects an image or CSS value.
        doc.querySelectorAll("iframe.html2canvas-container").forEach((node) => node.remove());
      }
    },
  };
}

