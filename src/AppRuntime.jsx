import { Profiler, useEffect } from "react";
import App from "./App.jsx";
import DesktopLayout from "./layouts/DesktopLayout.jsx";
import "./style.css";
import "./components/brand-header.css";
import "./components/backing-loop.css";
import "./polish.css";
import "./shooter/maps/map-skins.css";
import "./shooter/maps/editor/map-editor.css";
import "./layouts/desktop-layout.css";
import "./audio-studio/audio-studio.css";
import "./tuner/tuner-mode.css";

const NAVIGATION_PROBE_KEY = "__RIFFLAB_NAVIGATION_PROBE__";
const NAVIGATION_PROBE_META_NAME = "rifflab-navigation-performance";
const NAVIGATION_PROBE_SELECTORS = Object.freeze({
  "#fretboard": ".fretboardViewerPanel",
  "#metronome": ".standaloneMetronomePanel",
  "#tuner": ".tunerModeShell",
  "#mini-chord": ".miniChordMakerPanelCompact",
  "#shooter": ".shooterPanel",
  "#stage1": ".referenceTrainingPanel",
  "#stage2": ".referenceTrainingPanel",
  "#stage3": ".chordTransitionPanel",
  "#stage4": ".referenceTrainingPanel",
});
const NAVIGATION_CONTROL_LABELS = new Set(["미니반주", "지판 보기", "지판보기", "메트로놈", "튜너", "슈팅게임", "훈련장"]);

function getElementCount(nodes) {
  return nodes.reduce((count, node) => (
    count + (node.nodeType === Node.ELEMENT_NODE ? 1 + node.querySelectorAll("*").length : 0)
  ), 0);
}

function recordAppRender(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  const probe = window[NAVIGATION_PROBE_KEY];
  if (!probe?.active) return;
  probe.active.commits.push({
    actualDuration,
    baseDuration,
    commitTime,
    id,
    phase,
    startTime,
  });
}

function NavigationPerformanceProbe() {
  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") return undefined;
    let active = null;
    let finishTimerId = null;
    const samples = [];
    const observer = new MutationObserver((records) => {
      if (!active) return;
      const addedNodes = records.flatMap((record) => [...record.addedNodes]);
      const removedNodes = records.flatMap((record) => [...record.removedNodes]);
      active.addedElements += getElementCount(addedNodes);
      active.attributeMutations += records.filter((record) => record.type === "attributes").length;
      active.removedElements += getElementCount(removedNodes);
      active.mutationCallbacks += 1;
      active.lastMutationTime = performance.now();
    });
    observer.observe(document.querySelector("main") ?? document.body, {
      attributeFilter: ["aria-hidden", "class", "style"],
      attributes: true,
      childList: true,
      subtree: true,
    });

    let outputMeta = document.querySelector(`meta[name="${NAVIGATION_PROBE_META_NAME}"]`);
    if (!outputMeta) {
      outputMeta = document.createElement("meta");
      outputMeta.name = NAVIGATION_PROBE_META_NAME;
      document.head.append(outputMeta);
    }

    const probe = {
      active,
      begin(label) {
        active = {
          addedElements: 0,
          attributeMutations: 0,
          commits: [],
          fromHash: window.location.hash,
          label,
          lastMutationTime: null,
          mutationCallbacks: 0,
          removedElements: 0,
          startDomCount: document.querySelector("main")?.querySelectorAll("*").length ?? 0,
          startTime: performance.now(),
        };
        this.active = active;
      },
      finish(selector = NAVIGATION_PROBE_SELECTORS[window.location.hash]) {
        if (!active) return null;
        const node = document.querySelector(selector);
        const previousNode = this.nodes.get(selector);
        const sample = {
          ...active,
          elapsedMs: performance.now() - active.startTime,
          endDomCount: document.querySelector("main")?.querySelectorAll("*").length ?? 0,
          lastMutationMs: active.lastMutationTime == null ? null : active.lastMutationTime - active.startTime,
          nodeFound: Boolean(node),
          reusedNode: previousNode ? previousNode === node : null,
          toHash: window.location.hash,
        };
        if (node) this.nodes.set(selector, node);
        samples.push(sample);
        outputMeta.content = JSON.stringify(sample);
        active = null;
        this.active = null;
        return sample;
      },
      nodes: new Map(),
      samples,
    };
    const scheduleFinish = () => {
      if (finishTimerId != null) window.clearTimeout(finishTimerId);
      finishTimerId = window.setTimeout(() => probe.finish(), 800);
    };
    const beginFromNavigationControl = (event) => {
      const control = event.target instanceof Element
        ? event.target.closest("button, a[href^='#']")
        : null;
      if (!control) return;
      const label = (control.textContent || control.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ");
      const matchedLabel = [...NAVIGATION_CONTROL_LABELS].find((item) => label === item || label.includes(item));
      if (!matchedLabel) return;
      probe.begin(matchedLabel);
      scheduleFinish();
    };
    const beginFromHashChange = () => {
      if (probe.active) return;
      probe.begin(window.location.hash);
      scheduleFinish();
    };
    window[NAVIGATION_PROBE_KEY] = probe;
    document.addEventListener("pointerdown", beginFromNavigationControl, true);
    window.addEventListener("hashchange", beginFromHashChange);
    return () => {
      if (finishTimerId != null) window.clearTimeout(finishTimerId);
      document.removeEventListener("pointerdown", beginFromNavigationControl, true);
      window.removeEventListener("hashchange", beginFromHashChange);
      observer.disconnect();
      if (window[NAVIGATION_PROBE_KEY] === probe) delete window[NAVIGATION_PROBE_KEY];
    };
  }, []);

  return null;
}

export default function AppRuntime({ onReady }) {
  return (
    <DesktopLayout>
      <NavigationPerformanceProbe />
      <Profiler id="JUST PLAY App" onRender={recordAppRender}>
        <App onReady={onReady} />
      </Profiler>
    </DesktopLayout>
  );
}
