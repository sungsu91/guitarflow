// Bridge legacy phone-only media rules to the same surface decision React uses.
// Keep declarations in their original cascade position; do not maintain a second
// copy of each control's design for tablets and foldables.
const SOURCES = /\/(?:style|polish|tuner\/tuner-mode|audio-studio\/audio-studio|components\/backing-loop|shooter\/mobile-skin-configurator)\.css$/;
const PHONE_WIDTH = /\(max-width:\s*(680|719|720|767)px\)/;
const DESKTOP_WIDTH = /\(min-width:\s*(681|720|768|769|900|1024)px\)/;

function scopeRules(node, surface) {
  const scope = `:where(html[data-rifflab-layout="${surface}"], html[data-rifflab-layout="${surface}"] *)`;
  node.walkRules(rule => {
    if (rule.parent.type === "atrule" && /keyframes$/.test(rule.parent.name)) return;
    rule.selectors = rule.selectors.map(selector => {
      const pseudo = selector.match(/(::[\w-]+(?:\([^)]*\))?)$/);
      return pseudo
        ? `${selector.slice(0, -pseudo[0].length)}${scope}${pseudo[0]}`
        : `${selector}${scope}`;
    });
  });
}

export default function mobileSurfaceCss() {
  return {
    postcssPlugin: "rifflab-mobile-surface",
    Once(root) {
      if (!SOURCES.test((root.source?.input.file ?? "").replaceAll("\\", "/"))) return;
      const media = [];
      root.walkAtRules("media", node => media.push(node));
      for (const node of media) {
        const branches = node.params.split(",").map(value => value.trim());
        const mobile = branches.filter(value => PHONE_WIDTH.test(value));
        if (mobile.length) {
          const copy = node.clone();
          // Below this breakpoint the original rule already applies. Activating
          // its tablet copy too doubles selector work on every phone navigation.
          copy.params = mobile.map(value => value.replace(PHONE_WIDTH,
            (_, width) => `(min-width: ${Number(width) + 0.01}px)`)).join(", ");
          scopeRules(copy, "mobile");
          node.after(copy);
        } else if (branches.every(value => DESKTOP_WIDTH.test(value))) {
          scopeRules(node, "desktop");
        }
      }
    },
  };
}
