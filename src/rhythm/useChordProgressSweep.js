import { useLayoutEffect, useRef } from "react";
import { chordSweepProgress } from "./chordProgressSweep.js";

export default function useChordProgressSweep({
  enabled, playing, paused, cycleBeats, readBeat, selectionKey, layoutKey,
}) {
  const ref = useRef(null);
  const clock = useRef(readBeat);
  clock.current = readBeat;

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    const measures = [...root.querySelectorAll("[data-measure-start]")].map((element) => ({
      element,
      start: Number(element.dataset.measureStart),
      length: Number(element.dataset.measureLength),
    }));
    let frame = 0;
    let previous = null;

    // Follow the playback clock without re-rendering the app for each animation frame.
    const draw = () => {
      const beat = clock.current();
      const state = beat === null ? "count-in" : playing ? "playing" : paused ? "paused" : "idle";
      if (root.dataset.sweepState !== state) root.dataset.sweepState = state;
      let current = null;
      for (const measure of measures) {
        const progress = chordSweepProgress(beat, cycleBeats, measure.start, measure.length);
        if (progress === null) continue;
        current = measure.element;
        current.style.setProperty("--chord-sweep-progress", String(progress));
        if (current.dataset.sweepActive !== "true") current.dataset.sweepActive = "true";
        break;
      }
      if (previous !== current) {
        if (previous) {
          delete previous.dataset.sweepActive;
          previous.style.removeProperty("--chord-sweep-progress");
        }
        if (current && root.scrollHeight > root.clientHeight) {
          // Follow wrapped rows inside the readout without moving the page.
          const grid = root.getBoundingClientRect();
          const measure = current.getBoundingClientRect();
          const style = getComputedStyle(root);
          const top = grid.top + root.clientTop + (parseFloat(style.paddingTop) || 0);
          const bottom = grid.top + root.clientTop + root.clientHeight - (parseFloat(style.paddingBottom) || 0);
          const distance = measure.top < top
            ? measure.top - top
            : measure.bottom > bottom ? measure.bottom - bottom : 0;
          if (distance) root.scrollBy({ top: distance, behavior: "instant" });
        }
        previous = current;
      }
      if (playing) frame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(frame);
      measures.forEach(({ element }) => {
        delete element.dataset.sweepActive;
        element.style.removeProperty("--chord-sweep-progress");
      });
      delete root.dataset.sweepState;
    };
  }, [enabled, playing, paused, cycleBeats, selectionKey, layoutKey]);
  return ref;
}
