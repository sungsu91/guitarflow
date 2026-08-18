import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const STYLE_FILES = [
  new URL("../src/style.css", import.meta.url),
  new URL("../src/polish.css", import.meta.url),
  new URL("../src/components/backing-loop.css", import.meta.url),
];

const PRESS_COLOR_PROPERTIES = /^(?:background(?:-[\w-]+)?|border(?:-[\w-]+)?|color|fill|filter|opacity|stroke|text-shadow)$/;

function splitSelectorList(selector) {
  const selectors = [];
  let depth = 0;
  let current = "";

  for (const character of selector) {
    if (character === "(" || character === "[") depth += 1;
    if (character === ")" || character === "]") depth -= 1;

    if (character === "," && depth === 0) {
      selectors.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  if (current.trim()) selectors.push(current.trim());
  return selectors;
}

function selectorRequiresActive(selector) {
  const functionalRanges = [];
  const functionalPattern = /:(?:is|where)\(/g;

  for (const match of selector.matchAll(functionalPattern)) {
    const openIndex = match.index + match[0].length - 1;
    let depth = 1;
    let closeIndex = openIndex + 1;

    while (closeIndex < selector.length && depth > 0) {
      if (selector[closeIndex] === "(") depth += 1;
      if (selector[closeIndex] === ")") depth -= 1;
      closeIndex += 1;
    }

    if (depth === 0) functionalRanges.push([openIndex + 1, closeIndex - 1]);
  }

  let outerSelector = selector;
  for (const [start, end] of functionalRanges.toReversed()) {
    outerSelector = `${outerSelector.slice(0, start)}${" ".repeat(end - start)}${outerSelector.slice(end)}`;
  }
  if (outerSelector.includes(":active")) return true;

  return functionalRanges.some(([start, end]) =>
    splitSelectorList(selector.slice(start, end)).every(selectorRequiresActive),
  );
}

function findStandalonePressColorRules(css) {
  const violations = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;

  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(rulePattern)) {
    const selector = match[1].trim();
    if (!selector.includes(":active")) continue;

    const selectors = splitSelectorList(selector);
    if (!selectors.length || selectors.some((item) => !selectorRequiresActive(item))) continue;

    const colorProperties = match[2]
      .split(";")
      .map((declaration) => declaration.split(":", 1)[0].trim())
      .filter((property) => PRESS_COLOR_PROPERTIES.test(property));

    if (colorProperties.length) {
      violations.push({ selector, colorProperties: [...new Set(colorProperties)] });
    }
  }

  return violations;
}

test("standalone button press rules keep feedback physical and color-neutral", async () => {
  for (const file of STYLE_FILES) {
    const css = await readFile(file, "utf8");
    const violations = findStandalonePressColorRules(css);

    assert.deepEqual(
      violations,
      [],
      `${file.pathname} has color-changing :active rules: ${JSON.stringify(violations)}`,
    );
  }
});
