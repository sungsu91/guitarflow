import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Mic, MicOff, X } from "lucide-react";
import { acquireMicInput } from "../audio/micInputEngine.js";
import { MIC_INPUT_PRESETS } from "../audio/micInputPresets.js";
import {
  TUNER_MAX_FREQUENCY,
  TUNER_MIN_FREQUENCY,
  centsBetween,
  detectPitchAutocorrelation,
  detectPitchYinDetailed,
  frequencyToChromaticPitch,
  getTunerTrackingState,
  getHorizontalTuningState,
  getMedian,
  getTunerGuidance,
  getTunerDisplayCents,
  getTunerOrbPosition,
  isTrustedTunerPitch,
  midiToFrequency,
} from "./tunerMath.js";
import {
  TUNER_SWIMMER_SPRITE_COLUMNS,
  TUNER_SWIMMER_SPRITE_ROWS,
  getTunerSwimmerFrame,
  getTunerSwimmerTarget,
} from "./tunerSwimmerMotion.js";
import {
  TUNER_BACKGROUND_SWIPE_EDGE_PX,
  getTunerBackgroundSwipeOffset,
} from "./tunerBackground.js";

const TUNER_BACKGROUNDS = Object.freeze([
  Object.freeze({
    id: "deep-sea",
    label: "심해",
    src: "/assets/tuner/just-play-sea-background-deep.webp",
    tone: "dark",
  }),
  Object.freeze({
    id: "sunny-sky",
    label: "맑은 하늘",
    src: "/assets/tuner/just-play-sea-background-sky.webp",
    tone: "light",
  }),
  Object.freeze({
    id: "starry-night",
    label: "별빛 밤",
    src: "/assets/tuner/just-play-sea-background-starry-night.webp",
    tone: "dark",
  }),
  Object.freeze({
    id: "moon-clouds",
    label: "달빛 운해",
    src: "/assets/tuner/just-play-sea-background-moon-clouds.webp",
    tone: "dark",
  }),
  Object.freeze({
    id: "rose-twilight",
    label: "장미빛 황혼",
    src: "/assets/tuner/just-play-sea-background-rose-twilight.webp",
    tone: "dark",
  }),
]);
export const TUNER_BACKGROUND_COUNT = TUNER_BACKGROUNDS.length;
const TUNER_SWIMMER_SPRITE_SRC = "/assets/tuner/just-play-swimmer-sprite.png";
const TUNER_HEADSTOCK_SRC = "/assets/tuner/just-play-headstock.png";
const TUNER_GUIDANCE_BADGES = Object.freeze({
  waiting: "/assets/tuner/just-play-tuner-guidance-waiting.png",
  exact: "/assets/tuner/just-play-tuner-guidance-exact.png",
  almost: "/assets/tuner/just-play-tuner-guidance-almost.png",
  low: "/assets/tuner/just-play-tuner-guidance-low.png",
  "very-low": "/assets/tuner/just-play-tuner-guidance-very-low.png",
  high: "/assets/tuner/just-play-tuner-guidance-high.png",
  "very-high": "/assets/tuner/just-play-tuner-guidance-very-high.png",
  danger: "/assets/tuner/just-play-tuner-guidance-danger.png",
});
const TUNER_VISUAL_OPTIONS = Object.freeze({
  showWaveTrace: false,
  showSwimmer: false,
});
const TUNER_ANALYSIS_INTERVAL_MS = 52;
const TUNER_SUSTAIN_TRACK_WINDOW_MS = 1_400;
const TUNER_LAST_PITCH_HOLD_MS = 950;
const TUNER_EXACT_HOLD_MS = 420;
const TUNER_BACKGROUND_ROTATION_MS = 20_000;

const GUITAR_HEADSTOCK_HOTSPOTS = Object.freeze({
  6: { left: 21.9, top: 48.3 },
  5: { left: 22.0, top: 35.1 },
  4: { left: 21.9, top: 21.5 },
  3: { left: 77.9, top: 21.5 },
  2: { left: 77.6, top: 35.0 },
  1: { left: 77.9, top: 48.0 },
});

const BASS_HEADSTOCK_HOTSPOTS = Object.freeze({
  4: { left: 15.8, top: 56.8 },
  3: { left: 20.3, top: 40.8 },
  2: { left: 25.8, top: 24.5 },
  1: { left: 30.5, top: 8.2 },
});

const UKULELE_HEADSTOCK_HOTSPOTS = Object.freeze({
  4: { left: 19.6, top: 20.3 },
  3: { left: 19.5, top: 40.8 },
  2: { left: 82.8, top: 41.8 },
  1: { left: 82.8, top: 21.2 },
});

const INSTRUMENT_DEFINITIONS = Object.freeze({
  guitar: Object.freeze({
    headstockHotspots: GUITAR_HEADSTOCK_HOTSPOTS,
    headstockSrc: TUNER_HEADSTOCK_SRC,
    id: "guitar",
    label: "기타",
    presets: Object.freeze([
      { id: "standard", label: "STANDARD", description: "기본 튜닝", midis: [40, 45, 50, 55, 59, 64] },
      { id: "drop-d", label: "DROP D", description: "6번 줄만 D로", midis: [38, 45, 50, 55, 59, 64] },
      {
        id: "half-step",
        label: "½ STEP DOWN",
        description: "모든 줄 반음 낮게",
        midis: [39, 44, 49, 54, 58, 63],
        noteNames: ["Eb", "Ab", "Db", "Gb", "Bb", "Eb"],
      },
    ]),
  }),
  bass: Object.freeze({
    headstockHotspots: BASS_HEADSTOCK_HOTSPOTS,
    headstockSrc: "/assets/tuner/just-play-bass-headstock.png",
    id: "bass",
    label: "베이스",
    presets: Object.freeze([
      { id: "standard", label: "STANDARD", description: "4현 기본 튜닝", midis: [28, 33, 38, 43] },
      { id: "drop-d", label: "DROP D", description: "4번 줄만 D로", midis: [26, 33, 38, 43] },
    ]),
  }),
  ukulele: Object.freeze({
    headstockHotspots: UKULELE_HEADSTOCK_HOTSPOTS,
    headstockSrc: "/assets/tuner/just-play-ukulele-headstock.png",
    id: "ukulele",
    label: "우쿨렐레",
    presets: Object.freeze([
      { id: "high-g", label: "HIGH-G", description: "높은 4번 줄 G", midis: [67, 60, 64, 69] },
      { id: "low-g", label: "LOW-G", description: "낮은 4번 줄 G", midis: [55, 60, 64, 69] },
    ]),
  }),
});

function createTuningPreset(instrumentId, definition) {
  const midis = definition.midis;
  const strings = midis.map((midi, index) => {
    const chromaticPitch = frequencyToChromaticPitch(midiToFrequency(midi));
    const noteName = definition.noteNames?.[index] ?? chromaticPitch.noteName;
    const pitch = {
      ...chromaticPitch,
      noteName,
      pitch: `${noteName}${chromaticPitch.octave}`,
    };
    return {
      ...pitch,
      frequency: midiToFrequency(midi),
      stringNumber: midis.length - index,
    };
  });
  return {
    description: definition.description,
    id: definition.id,
    instrumentId,
    label: definition.label,
    noteSummary: strings.map((string) => string.pitch).join(" "),
    strings,
  };
}

const TUNER_INSTRUMENTS = Object.freeze(Object.fromEntries(
  Object.values(INSTRUMENT_DEFINITIONS).map((definition) => [
    definition.id,
    Object.freeze({
      ...definition,
      presets: Object.freeze(definition.presets.map((preset) => createTuningPreset(definition.id, preset))),
    }),
  ]),
));

const TUNER_INSTRUMENT_OPTIONS = Object.freeze(Object.values(TUNER_INSTRUMENTS));

function getInstrument(id) {
  return TUNER_INSTRUMENTS[id] ?? TUNER_INSTRUMENTS.guitar;
}

function getPreset(instrumentId, presetId) {
  const instrument = getInstrument(instrumentId);
  return instrument.presets.find((preset) => preset.id === presetId) ?? instrument.presets[0];
}

function getAdaptiveSmoothedFrequency(rawFrequency, smoothingState) {
  const state = smoothingState;
  const previous = state.frequency;
  const jumpCents = previous ? Math.abs(centsBetween(rawFrequency, previous)) : Infinity;
  if (!previous || jumpCents > 190) state.history = [rawFrequency];
  else state.history = [...state.history.slice(-3), rawFrequency];

  const medianFrequency = getMedian(state.history) ?? rawFrequency;
  const medianJumpCents = previous ? Math.abs(centsBetween(medianFrequency, previous)) : Infinity;
  const smoothing = !previous ? 1 : medianJumpCents > 70 ? 0.62 : medianJumpCents > 20 ? 0.42 : 0.28;
  state.frequency = previous == null
    ? medianFrequency
    : previous + (medianFrequency - previous) * smoothing;
  return state.frequency;
}

function getMicrophoneErrorState(error) {
  if (["NotAllowedError", "PermissionDeniedError"].includes(error?.name)) return "denied";
  if (error?.message === "Microphone capture is not supported.") return "unsupported";
  if (error?.name === "AbortError") return "idle";
  return "error";
}

function useTunerController(active) {
  const [instrumentId, setInstrumentId] = useState("guitar");
  const [presetId, setPresetId] = useState("standard");
  const [selectedString, setSelectedString] = useState(null);
  const [micState, setMicState] = useState("idle");
  const [reading, setReading] = useState({
    cents: null,
    completed: false,
    confidence: 0,
    currentPitch: null,
    displayCents: null,
    frequency: null,
    hasSignal: false,
    level: 0,
    target: null,
    trackingPhase: "waiting",
  });
  const sessionRef = useRef(null);
  const requestVersionRef = useRef(0);
  const analysisFrameRef = useRef(null);
  const lastAnalysisAtRef = useRef(0);
  const lastValidSignalAtRef = useRef(0);
  const validFrameCountRef = useRef(0);
  const exactStartedAtRef = useRef(null);
  const exactPitchKeyRef = useRef(null);
  const lastTrustedFrequencyRef = useRef(null);
  const instrumentIdRef = useRef(instrumentId);
  const presetIdRef = useRef(presetId);
  const selectedStringRef = useRef(selectedString);
  const smoothingRef = useRef({ frequency: null, history: [] });
  const visualCentsRef = useRef({ cents: null, pitchKey: null, updatedAt: null });

  useEffect(() => {
    instrumentIdRef.current = instrumentId;
    exactStartedAtRef.current = null;
    exactPitchKeyRef.current = null;
    visualCentsRef.current = { cents: null, pitchKey: null, updatedAt: null };
    setReading((current) => ({ ...current, completed: false, target: null }));
  }, [instrumentId]);

  useEffect(() => {
    presetIdRef.current = presetId;
    exactStartedAtRef.current = null;
    exactPitchKeyRef.current = null;
    visualCentsRef.current = { cents: null, pitchKey: null, updatedAt: null };
    setReading((current) => ({ ...current, completed: false }));
  }, [presetId]);

  useEffect(() => {
    selectedStringRef.current = selectedString;
    exactStartedAtRef.current = null;
    exactPitchKeyRef.current = null;
    visualCentsRef.current = { cents: null, pitchKey: null, updatedAt: null };
    setReading((current) => ({
      ...current,
      completed: false,
      target: selectedString == null ? null : current.target,
    }));
  }, [selectedString]);

  const releaseMicrophone = useCallback(async () => {
    requestVersionRef.current += 1;
    if (analysisFrameRef.current != null) cancelAnimationFrame(analysisFrameRef.current);
    analysisFrameRef.current = null;
    const session = sessionRef.current;
    sessionRef.current = null;
    await session?.release?.();
  }, []);

  const startMicrophone = useCallback(async () => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    if (analysisFrameRef.current != null) cancelAnimationFrame(analysisFrameRef.current);
    analysisFrameRef.current = null;
    await sessionRef.current?.release?.();
    sessionRef.current = null;
    smoothingRef.current = { frequency: null, history: [] };
    validFrameCountRef.current = 0;
    exactStartedAtRef.current = null;
    exactPitchKeyRef.current = null;
    visualCentsRef.current = { cents: null, pitchKey: null, updatedAt: null };
    lastTrustedFrequencyRef.current = null;
    setMicState("requesting");
    setReading((current) => ({ ...current, completed: false, hasSignal: false, trackingPhase: "waiting" }));

    try {
      const session = await acquireMicInput({
        consumerId: "just-play-tuner",
        preset: MIC_INPUT_PRESETS.GUITAR_DETECTION,
      });
      if (requestVersion !== requestVersionRef.current) {
        await session.release();
        return false;
      }
      if (!session.audioContext || !session.analyser) {
        await session.release();
        throw new Error("Web Audio API is not supported.");
      }

      sessionRef.current = session;
      const buffer = new Float32Array(session.analyser.fftSize);
      setMicState("listening");
      lastAnalysisAtRef.current = 0;
      lastValidSignalAtRef.current = performance.now();

      const holdOrReleaseLastPitch = (now, confidence, level) => {
        const sinceLastValid = now - lastValidSignalAtRef.current;
        if (lastTrustedFrequencyRef.current != null && sinceLastValid < TUNER_LAST_PITCH_HOLD_MS) {
          setReading((current) => (
            current.trackingPhase === "holding"
              ? current
              : { ...current, confidence, level, trackingPhase: "holding" }
          ));
          return;
        }

        validFrameCountRef.current = 0;
        exactStartedAtRef.current = null;
        exactPitchKeyRef.current = null;
        lastTrustedFrequencyRef.current = null;
        smoothingRef.current = { frequency: null, history: [] };
        visualCentsRef.current = { cents: null, pitchKey: null, updatedAt: null };
        setReading((current) => (
          !current.hasSignal && current.trackingPhase === "waiting"
            ? current
            : {
                ...current,
                completed: false,
                confidence,
                hasSignal: false,
                level,
                trackingPhase: "waiting",
              }
        ));
      };

      const analyse = (now) => {
        if (requestVersion !== requestVersionRef.current || sessionRef.current !== session) return;
        analysisFrameRef.current = requestAnimationFrame(analyse);
        if (now - lastAnalysisAtRef.current < TUNER_ANALYSIS_INTERVAL_MS) return;
        lastAnalysisAtRef.current = now;

        session.analyser.getFloatTimeDomainData(buffer);
        const detectionFrame = session.readDetectionFrame(now);
        const level = detectionFrame.normalized;
        const recentPitch = lastTrustedFrequencyRef.current != null
          && now - lastValidSignalAtRef.current <= TUNER_SUSTAIN_TRACK_WINDOW_MS;
        if (!detectionFrame.isSignalPresent && !recentPitch) {
          holdOrReleaseLastPitch(now, 0, level);
          return;
        }

        const yinResult = detectPitchYinDetailed(
          buffer,
          session.audioContext.sampleRate,
          TUNER_MIN_FREQUENCY,
          TUNER_MAX_FREQUENCY,
          0.16,
        );
        const fallbackFrequency = yinResult?.frequency ?? detectPitchAutocorrelation(
          buffer,
          session.audioContext.sampleRate,
          TUNER_MIN_FREQUENCY,
          TUNER_MAX_FREQUENCY,
          0.006,
        );
        const confidence = yinResult?.confidence ?? (fallbackFrequency ? 0.72 : 0);
        const trustedPitch = isTrustedTunerPitch({
          candidateFrequency: fallbackFrequency,
          confidence,
          inputPresent: detectionFrame.isSignalPresent,
          lastFrequency: lastTrustedFrequencyRef.current,
          recentPitch,
        });
        if (!trustedPitch) {
          holdOrReleaseLastPitch(now, confidence, level);
          return;
        }

        validFrameCountRef.current += 1;
        if (validFrameCountRef.current < 2) return;
        lastValidSignalAtRef.current = now;
        lastTrustedFrequencyRef.current = fallbackFrequency;
        const frequency = getAdaptiveSmoothedFrequency(fallbackFrequency, smoothingRef.current);
        const preset = getPreset(instrumentIdRef.current, presetIdRef.current);
        const tracking = getTunerTrackingState(frequency, preset.strings, selectedStringRef.current);
        const { cents, currentPitch, target } = tracking;
        const pitchKey = tracking.manual ? `manual-${target?.pitch}` : `auto-${currentPitch?.pitch}`;
        if (exactPitchKeyRef.current !== pitchKey) {
          exactPitchKeyRef.current = pitchKey;
          exactStartedAtRef.current = null;
        }
        const previousVisual = visualCentsRef.current;
        const pitchChanged = previousVisual.pitchKey !== pitchKey;
        const displayCents = getTunerDisplayCents(cents, previousVisual.cents, {
          elapsedMs: previousVisual.updatedAt == null ? TUNER_ANALYSIS_INTERVAL_MS : now - previousVisual.updatedAt,
          pitchChanged,
        });
        visualCentsRef.current = { cents: displayCents, pitchKey, updatedAt: now };
        const isExact = Number.isFinite(cents) && Math.abs(cents) <= 3;
        if (isExact) exactStartedAtRef.current ??= now;
        else exactStartedAtRef.current = null;
        const completed = isExact && exactStartedAtRef.current != null && now - exactStartedAtRef.current >= TUNER_EXACT_HOLD_MS;

        setReading({
          cents,
          completed,
          confidence,
          currentPitch,
          displayCents,
          frequency,
          hasSignal: true,
          level,
          target,
          trackingPhase: "tracking",
        });
      };

      analysisFrameRef.current = requestAnimationFrame(analyse);
      return true;
    } catch (error) {
      if (requestVersion !== requestVersionRef.current) return false;
      setMicState(getMicrophoneErrorState(error));
      return false;
    }
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    startMicrophone();
    return () => {
      releaseMicrophone();
    };
  }, [active, releaseMicrophone, startMicrophone]);

  const selectString = useCallback((stringNumber) => {
    setSelectedString((current) => (current === stringNumber ? null : stringNumber));
  }, []);

  const selectInstrument = useCallback((nextInstrumentId) => {
    const nextInstrument = getInstrument(nextInstrumentId);
    setInstrumentId(nextInstrument.id);
    setPresetId(nextInstrument.presets[0].id);
    setSelectedString(null);
  }, []);

  const stopMicrophone = useCallback(async () => {
    await releaseMicrophone();
    smoothingRef.current = { frequency: null, history: [] };
    validFrameCountRef.current = 0;
    exactStartedAtRef.current = null;
    exactPitchKeyRef.current = null;
    visualCentsRef.current = { cents: null, pitchKey: null, updatedAt: null };
    lastTrustedFrequencyRef.current = null;
    setMicState("idle");
    setReading((current) => ({
      ...current,
      cents: null,
      completed: false,
      confidence: 0,
      currentPitch: null,
      displayCents: null,
      frequency: null,
      hasSignal: false,
      level: 0,
      target: null,
      trackingPhase: "waiting",
    }));
  }, [releaseMicrophone]);

  return {
    instrument: getInstrument(instrumentId),
    micState,
    preset: getPreset(instrumentId, presetId),
    presets: getInstrument(instrumentId).presets,
    reading,
    restartMicrophone: startMicrophone,
    stopMicrophone,
    selectInstrument,
    selectPreset: setPresetId,
    selectedString,
    selectString,
  };
}

function OceanWaveCanvas({ energy, status }) {
  const canvasRef = useRef(null);
  const visualStateRef = useRef({ energy, status });

  useEffect(() => {
    visualStateRef.current = { energy, status };
  }, [energy, status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext?.("2d", { alpha: true });
    if (!canvas || !context) return undefined;
    let frameId = null;
    let lastPaint = 0;
    let phase = 0;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };
    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    resize();

    const paint = (now) => {
      frameId = requestAnimationFrame(paint);
      const frameInterval = reduceMotion ? 100 : 34;
      if (now - lastPaint < frameInterval) return;
      const delta = Math.min(60, now - lastPaint || frameInterval);
      lastPaint = now;
      phase += delta * 0.001;

      const width = canvas.width;
      const height = canvas.height;
      const scale = width / Math.max(1, canvas.getBoundingClientRect().width);
      const { energy: latestEnergy, status: latestStatus } = visualStateRef.current;
      const waveEnergy = latestStatus === "exact" ? 0.12 : Math.max(0.08, Math.min(1, latestEnergy || 0));
      context.clearRect(0, 0, width, height);

      const glow = context.createLinearGradient(0, 0, width, 0);
      glow.addColorStop(0, "rgba(111, 214, 255, 0.02)");
      glow.addColorStop(0.5, latestStatus === "danger" ? "rgba(255, 117, 112, 0.26)" : latestStatus === "exact" ? "rgba(126, 255, 215, 0.28)" : "rgba(129, 224, 255, 0.15)");
      glow.addColorStop(1, "rgba(111, 214, 255, 0.02)");
      context.fillStyle = glow;
      context.fillRect(0, height * 0.15, width, height * 0.72);

      const waveColors = latestStatus === "danger"
        ? ["rgba(255, 191, 151, 0.82)", "rgba(255, 111, 111, 0.5)", "rgba(255, 235, 214, 0.28)"]
        : latestStatus === "exact"
          ? ["rgba(191, 255, 226, 0.9)", "rgba(112, 248, 211, 0.52)", "rgba(219, 255, 244, 0.3)"]
          : ["rgba(189, 235, 255, 0.82)", "rgba(92, 198, 242, 0.48)", "rgba(226, 246, 255, 0.27)"];

      waveColors.forEach((color, layer) => {
        const centerY = height * (0.48 + layer * 0.1);
        const amplitude = scale * (5 + waveEnergy * (10 - layer * 1.5));
        const wavelength = scale * (58 + layer * 24);
        context.beginPath();
        for (let x = 0; x <= width + scale * 4; x += scale * 4) {
          const y = centerY
            + Math.sin(x / wavelength + phase * (1.2 - layer * 0.18) + layer * 1.7) * amplitude
            + Math.sin(x / (wavelength * 0.54) - phase * 0.72) * amplitude * 0.28;
          if (x === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle = color;
        context.lineWidth = scale * (layer === 0 ? 2.2 : 1.35);
        context.stroke();
      });
    };

    frameId = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
    };
  }, []);

  return <canvas aria-hidden="true" className="tunerWaveCanvas" ref={canvasRef} />;
}

function TunerHeadstock({ instrument = TUNER_INSTRUMENTS.guitar, preset, reading, selectedString, onSelectString, showTarget = false }) {
  const [headstockAvailable, setHeadstockAvailable] = useState(instrument.id === "guitar");
  const manualTarget = preset.strings.find((string) => string.stringNumber === selectedString);
  const manual = manualTarget != null;
  const displayedPitch = manualTarget?.pitch ?? "AUTO";
  const targetComplete = manual && reading?.completed;

  useEffect(() => {
    let cancelled = false;
    setHeadstockAvailable(instrument.id === "guitar");
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setHeadstockAvailable(true);
    };
    probe.onerror = () => {
      if (!cancelled) setHeadstockAvailable(false);
    };
    probe.src = instrument.headstockSrc;
    return () => {
      cancelled = true;
    };
  }, [instrument.headstockSrc, instrument.id]);

  return (
    <section
      className="tunerHeadstockPanel"
      data-instrument={instrument.id}
      aria-label={`${instrument.label} 줄 수동 선택`}
    >
      <div className="tunerHeadstockMode">
        <span>{selectedString == null ? "AUTO" : "MANUAL"}</span>
        <strong>
          {selectedString == null
            ? "자동 인식"
            : `${selectedString}번 줄 · ${preset.strings.find((string) => string.stringNumber === selectedString)?.pitch}`}
        </strong>
        <small>{selectedString == null ? "튜닝머신을 누르면 줄 고정" : "같은 튜닝머신을 누르면 자동 복귀"}</small>
      </div>
      <div className={`tunerHeadstockAsset ${headstockAvailable ? "" : "tunerHeadstockAsset--pending"}`}>
        {showTarget ? (
          <div
            aria-label={`목표 음 ${displayedPitch}${targetComplete ? ", 정확" : ""}`}
            className={`tunerHeadstockTarget ${targetComplete ? "complete" : ""}`}
          >
            <small>목표 음</small>
            <strong>
              {targetComplete ? <Check aria-hidden="true" size={18} /> : null}
              {displayedPitch}
            </strong>
          </div>
        ) : null}
        {headstockAvailable ? (
          <img
            alt={`${instrument.label} 튜닝머신 헤드`}
            draggable="false"
            src={instrument.headstockSrc}
          />
        ) : (
          <div className="tunerHeadstockAssetPending" role="status">
            <strong>{instrument.label}</strong>
            <small>전용 헤드 이미지 준비 중</small>
          </div>
        )}
        {preset.strings.map((string) => {
          const hotspot = instrument.headstockHotspots[string.stringNumber];
          if (!headstockAvailable || !hotspot) return null;
          const selected = selectedString === string.stringNumber;
          return (
            <button
              aria-label={`${string.stringNumber}번 줄 ${string.pitch}${selected ? ", 선택 해제" : ", 수동 선택"}`}
              className={`tunerPegHotspot ${selected ? "tunerPegHotspot--chosen" : ""}`}
              data-selected={selected ? "true" : undefined}
              key={string.stringNumber}
              onClick={() => onSelectString(string.stringNumber)}
              style={{ left: `${hotspot.left}%`, top: `${hotspot.top}%` }}
              type="button"
            >
              <span
                aria-hidden="true"
                className="tunerPegMagnifier"
              >
                <img
                  alt=""
                  className="tunerPegMagnifierImage"
                  draggable="false"
                  src={instrument.headstockSrc}
                  style={{
                    left: `calc(50% - ${hotspot.left * 1.12}cqi)`,
                    top: `calc(50% - ${hotspot.top * 1.68}cqi)`,
                  }}
                />
              </span>
              <span className="tunerPegLabel">
                {string.noteName}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TunerReadout({ controller, guidance }) {
  const { preset, reading, selectedString } = controller;
  const currentPitch = reading.hasSignal ? reading.currentPitch?.pitch : "--";
  const manualTarget = preset.strings.find((string) => string.stringNumber === selectedString);
  const targetPitch = manualTarget?.pitch ?? "AUTO";
  const targetFrequency = manualTarget?.frequency;
  const centsText = reading.hasSignal && Number.isFinite(reading.cents)
    ? `${reading.cents > 0 ? "+" : ""}${Number(reading.cents).toFixed(1)}`
    : "--";

  return (
    <section className={`tunerReadoutCard tunerStatus--${guidance.key}`} aria-live="polite">
      <div className="tunerReadoutStats" aria-label={`현재 ${currentPitch}, 목표 ${targetPitch}, 차이 ${centsText} cents`}>
        <div className="tunerReadoutStat tunerReadoutStat--target">
          <small>목표 음</small>
          <strong className={reading.completed ? "tunerReadoutTargetComplete" : ""}>
            {reading.completed ? <Check aria-hidden="true" size={19} /> : null}
            {targetPitch}
          </strong>
          <b>{Number.isFinite(targetFrequency) ? `${targetFrequency.toFixed(2)} Hz` : "-- Hz"}</b>
        </div>
        <div className="tunerReadoutStat">
          <small className={reading.hasSignal ? "tunerSignalActive" : ""}>
            {reading.hasSignal ? "인식 중" : "현재 음"}
          </small>
          <strong>{currentPitch}</strong>
          <b>{reading.hasSignal ? `${reading.frequency.toFixed(2)} Hz` : "-- Hz"}</b>
        </div>
        <div className="tunerReadoutStat">
          <small>차이</small>
          <strong>{centsText}</strong>
          <b>cents</b>
        </div>
      </div>
    </section>
  );
}

function TunerSwimmer({ reading }) {
  const fieldRef = useRef(null);
  const swimmerRef = useRef(null);
  const frameARef = useRef(null);
  const frameBRef = useRef(null);
  const previousInputFrequencyRef = useRef(null);
  const targetRef = useRef(getTunerSwimmerTarget({ hasSignal: false }));
  const motionRef = useRef({ frameStep: 0, x: 50, y: 52 });
  const visualCents = Number.isFinite(reading.displayCents) ? reading.displayCents : reading.cents;
  const centsText = reading.hasSignal && Number.isFinite(visualCents)
    ? `${visualCents > 0 ? "+" : ""}${Math.round(visualCents)}`
    : null;
  const centsTone = reading.completed
    ? "exact"
    : Math.abs(visualCents ?? 0) > 50
      ? "coarse"
      : "active";
  const centsSide = (visualCents ?? 0) > 0 ? "high" : "low";

  useEffect(() => {
    const previousFrequency = reading.hasSignal ? previousInputFrequencyRef.current : null;
    targetRef.current = getTunerSwimmerTarget({
      cents: visualCents,
      completed: reading.completed,
      frequency: reading.frequency,
      hasSignal: reading.hasSignal,
      previousFrequency,
    });
    previousInputFrequencyRef.current = reading.hasSignal ? reading.frequency : null;
  }, [reading.completed, reading.frequency, reading.hasSignal, visualCents]);

  useEffect(() => {
    const field = fieldRef.current;
    const swimmer = swimmerRef.current;
    const frames = [frameARef.current, frameBRef.current];
    if (!field || !swimmer || frames.some((frame) => !frame)) return undefined;

    const fieldSize = { height: field.clientHeight, width: field.clientWidth };
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const resize = () => {
      fieldSize.height = field.clientHeight;
      fieldSize.width = field.clientWidth;
    };
    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(field);
    let animationFrame = null;
    let lastFrameAt = 0;
    let lastPaintAt = performance.now();
    let visibleFrameIndex = 0;

    const paint = (now) => {
      animationFrame = requestAnimationFrame(paint);
      const target = targetRef.current;
      const paintInterval = reduceMotion ? 100 : target.waiting ? 50 : target.settled ? 30 : 16;
      if (now - lastPaintAt < paintInterval) return;
      const elapsed = Math.min(64, Math.max(0, now - lastPaintAt));
      lastPaintAt = now;
      const motion = motionRef.current;
      const followDuration = target.waiting ? 360 : target.settled ? 280 : 210;
      const followAmount = reduceMotion ? 1 : 1 - Math.exp(-elapsed / followDuration);
      motion.x += (target.x - motion.x) * followAmount;
      motion.y += (target.y - motion.y) * followAmount;

      const frameInterval = reduceMotion
        ? 1000
        : target.waiting
          ? 260
          : target.settled
            ? 180
            : 105 - target.intensity * 30;
      if (now - lastFrameAt >= frameInterval) {
        lastFrameAt = now;
        motion.frameStep += 1;
        const frame = getTunerSwimmerFrame(motion.frameStep, target);
        const horizontalPosition = (frame.column / (TUNER_SWIMMER_SPRITE_COLUMNS - 1)) * 100;
        const verticalPosition = (frame.row / (TUNER_SWIMMER_SPRITE_ROWS - 1)) * 100;
        const incomingFrameIndex = visibleFrameIndex === 0 ? 1 : 0;
        const incomingFrame = frames[incomingFrameIndex];
        const outgoingFrame = frames[visibleFrameIndex];
        const blendDuration = target.waiting ? 190 : target.settled ? 130 : 68;
        incomingFrame.style.backgroundPosition = `${horizontalPosition}% ${verticalPosition}%`;
        incomingFrame.style.transitionDuration = `${blendDuration}ms`;
        outgoingFrame.style.transitionDuration = `${blendDuration}ms`;
        incomingFrame.style.opacity = "1";
        outgoingFrame.style.opacity = "0";
        visibleFrameIndex = incomingFrameIndex;
      }

      const x = (motion.x / 100) * fieldSize.width;
      const y = (motion.y / 100) * fieldSize.height;
      const movementScale = target.waiting ? 0.9 : target.settled ? 0.94 : 0.96 + target.intensity * 0.08;
      swimmer.style.opacity = target.waiting ? "0.68" : "1";
      swimmer.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${movementScale})`;
    };

    animationFrame = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <div className="tunerSwimmerField" ref={fieldRef} aria-hidden="true">
      <div
        className={`tunerSwimmerSprite ${reading.hasSignal ? "active" : "waiting"} ${reading.completed ? "completed" : ""} tunerSwimmerSprite--${centsTone}`}
        ref={swimmerRef}
      >
        <i
          className="tunerSwimmerFrame tunerSwimmerFrame--a"
          ref={frameARef}
          style={{ backgroundImage: `url(${TUNER_SWIMMER_SPRITE_SRC})` }}
        />
        <i
          className="tunerSwimmerFrame tunerSwimmerFrame--b"
          ref={frameBRef}
          style={{ backgroundImage: `url(${TUNER_SWIMMER_SPRITE_SRC})` }}
        />
        {centsText != null ? (
          <span className={`tunerSwimmerCents tunerSwimmerCents--${centsSide}`}>{centsText}</span>
        ) : null}
      </div>
    </div>
  );
}

function TunerGauge({ controller, guidance, showDirectionScale = true }) {
  const { micState, reading, restartMicrophone, selectedString } = controller;
  const manual = selectedString != null;
  const needsMicAction = ["denied", "error", "unsupported"].includes(micState);
  const directionState = getHorizontalTuningState(reading);
  const visualCents = Number.isFinite(reading.displayCents) ? reading.displayCents : reading.cents;
  const centsText = reading.hasSignal && Number.isFinite(visualCents)
    ? `${visualCents > 0 ? "+" : ""}${Math.round(visualCents)} cents`
    : null;
  const orbPosition = getTunerOrbPosition(reading.hasSignal ? visualCents : null, manual);
  const orbLeft = 50 + orbPosition * 38;
  const currentPitch = reading.hasSignal ? reading.currentPitch?.pitch ?? "--" : "--";
  const guidanceText = manual
    ? `${directionState} · ${guidance.message}`
    : guidance.message;
  const guidanceBadgeSrc = needsMicAction ? null : TUNER_GUIDANCE_BADGES[guidance.key];
  const showGuidance = needsMicAction || guidance.key !== "tracking";
  return (
    <section className={`tunerOceanGauge tunerStatus--${guidance.key}`} aria-label="바다형 튜닝 게이지">
      {TUNER_VISUAL_OPTIONS.showWaveTrace ? (
        <OceanWaveCanvas energy={reading.hasSignal ? Math.max(reading.level, 0.16) : 0.08} status={guidance.key} />
      ) : null}
      <div className="tunerGaugeCenter" aria-hidden="true"><span /></div>
      <div
        aria-label={`현재 음 ${currentPitch}${centsText ? `, ${centsText}` : ""}`}
        className={`tunerPitchOrb ${reading.trackingPhase ?? (reading.hasSignal ? "tracking" : "waiting")} ${reading.completed ? "exact" : ""}`}
        style={{ "--tuner-orb-left": `${orbLeft}%` }}
      >
        <strong>{currentPitch}</strong>
        {centsText ? <small>{centsText}</small> : null}
      </div>
      {TUNER_VISUAL_OPTIONS.showSwimmer ? <TunerSwimmer reading={reading} /> : null}
      {reading.completed ? (
        <div className="tunerExactConfirmation" role="status">
          <span><Check aria-hidden="true" size={18} /></span>
          <strong>딱 맞아요!</strong>
        </div>
      ) : null}
      {showDirectionScale && manual ? (
        <>
          <div className="tunerGaugeLabels" aria-label={`현재 상태 ${directionState}`}>
            <span>낮음</span>
            <strong>{reading.completed ? <><Check aria-hidden="true" size={14} /> 정확</> : "정확"}</strong>
            <span>높음</span>
          </div>
          <div className="tunerCentScale" aria-hidden="true">
            <i />
            <span>-50</span><span>0</span><span>+50</span>
          </div>
        </>
      ) : null}
      {showGuidance ? (
        <div className={`tunerGaugeGuidance ${guidanceBadgeSrc ? "tunerGaugeGuidance--badge" : ""}`}>
          {guidanceBadgeSrc ? (
            <img
              alt={guidanceText}
              className={`tunerGuidanceBadge tunerGuidanceBadge--${guidance.key}`}
              src={guidanceBadgeSrc}
            />
          ) : (
            <strong className="tunerGuidanceText">{needsMicAction ? "마이크를 켜주세요" : guidanceText}</strong>
          )}
          <small>{micState === "requesting" ? "마이크 권한을 확인하고 있어요" : guidance.detail}</small>
          {needsMicAction && micState !== "unsupported" ? (
            <button className="tunerMicStartButton" onClick={restartMicrophone} type="button">
              <Mic aria-hidden="true" size={15} /> 마이크 시작
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="tunerCoarseHint">
        {manual && reading.hasSignal && Math.abs(reading.cents) > 50
          ? `${reading.currentPitch?.pitch}에서 ${reading.target?.pitch}까지 큰 음정 이동 중`
          : ""}
      </div>
    </section>
  );
}

function TunerDashboard({ controller, guidance, showDirectionScale = true, showReadout = true }) {
  return (
    <section
      className={`tunerTuningPanel ${showReadout ? "" : "tunerTuningPanel--gaugeOnly"} tunerStatus--${guidance.key}`}
      aria-label="실시간 음정과 튜닝 그래프"
    >
      {showReadout ? <TunerReadout controller={controller} guidance={guidance} /> : null}
      <TunerGauge controller={controller} guidance={guidance} showDirectionScale={showDirectionScale} />
    </section>
  );
}

function TunerMicStatus({ controller }) {
  const micOn = controller.micState === "listening";
  const micBusy = controller.micState === "requesting";
  return (
    <button
      aria-label={micOn ? "마이크 끄기" : "마이크 켜기"}
      aria-pressed={micOn}
      className={`tunerMicStatus ${micOn ? "on" : "off"} ${micBusy ? "busy" : ""}`}
      disabled={micBusy}
      onClick={micOn ? controller.stopMicrophone : controller.restartMicrophone}
      type="button"
    >
      {micOn ? <Mic aria-hidden="true" size={13} /> : <MicOff aria-hidden="true" size={13} />}
      <i aria-hidden="true" />
    </button>
  );
}

function TunerSettingsSheet({ instrument, onClose, onSelectPreset, preset, presets }) {
  return (
    <div className="tunerSettingsLayer" role="presentation">
      <button aria-label="튜닝 설정 닫기" className="tunerSettingsDim" onClick={onClose} type="button" />
      <section aria-label="튜닝 설정" aria-modal="true" className="tunerSettingsSheet" role="dialog">
        <div className="tunerSettingsHeader">
          <div><span>TUNING</span><strong>{instrument.label} 튜닝</strong></div>
          <button aria-label="닫기" onClick={onClose} type="button"><X aria-hidden="true" size={20} /></button>
        </div>
        <div className="tunerReferenceRow"><span>기준 주파수</span><strong>A4 = 440 Hz</strong></div>
        <div className="tunerPresetList" role="radiogroup" aria-label="튜닝 프리셋">
          {presets.map((option, index) => (
            <button
              aria-checked={preset.id === option.id}
              className={preset.id === option.id ? "selected" : ""}
              key={option.id}
              onClick={() => onSelectPreset(option.id)}
              role="radio"
              type="button"
            >
              <span>{index === 0 ? "기본" : "고급"}</span>
              <div><strong>{option.label}</strong><small>{option.noteSummary} · {option.description}</small></div>
              {preset.id === option.id ? <Check aria-hidden="true" size={18} /> : <ChevronRight aria-hidden="true" size={18} />}
            </button>
          ))}
        </div>
        <p>프리셋은 여기에서만 변경돼요. 메인 화면에서는 현재 설정만 작게 표시합니다.</p>
      </section>
    </div>
  );
}

function TunerInstrumentSheet({ instrument, onClose, onSelectInstrument }) {
  return (
    <div className="tunerSettingsLayer" role="presentation">
      <button aria-label="악기 선택 닫기" className="tunerSettingsDim" onClick={onClose} type="button" />
      <section aria-label="악기 선택" aria-modal="true" className="tunerSettingsSheet tunerInstrumentSheet" role="dialog">
        <div className="tunerSettingsHeader">
          <div><span>INSTRUMENT</span><strong>악기 선택</strong></div>
          <button aria-label="닫기" onClick={onClose} type="button"><X aria-hidden="true" size={20} /></button>
        </div>
        <div className="tunerPresetList tunerInstrumentList" role="radiogroup" aria-label="튜너 악기">
          {TUNER_INSTRUMENT_OPTIONS.map((option) => (
            <button
              aria-checked={instrument.id === option.id}
              className={instrument.id === option.id ? "selected" : ""}
              key={option.id}
              onClick={() => onSelectInstrument(option.id)}
              role="radio"
              type="button"
            >
              <span>{option.presets[0].strings.length}현</span>
              <div><strong>{option.label}</strong><small>{option.presets[0].noteSummary} · STANDARD</small></div>
              {instrument.id === option.id ? <Check aria-hidden="true" size={18} /> : <ChevronRight aria-hidden="true" size={18} />}
            </button>
          ))}
        </div>
        <p>악기별 헤드 이미지와 튜닝머신 좌표는 서로 독립된 에셋 슬롯을 사용합니다.</p>
      </section>
    </div>
  );
}

function TunerTopbar({ controller, onOpenSettings, presetInteractive = true }) {
  const { micState, preset, reading, selectedString } = controller;
  const micConnected = micState === "listening";
  return (
    <header className="tunerTopbar">
      <div className="tunerTitle"><span>JUST PLAY</span><strong>TUNER</strong></div>
      <div className={`tunerMicBadge ${micConnected ? "connected" : ""} ${reading.hasSignal ? "hearing" : ""}`}>
        <i aria-hidden="true" />
        <span>{selectedString == null ? "AUTO" : "MANUAL"}</span>
      </div>
      {presetInteractive ? (
        <button aria-label="튜닝 설정 열기" className="tunerPresetButton" onClick={onOpenSettings} type="button">
          <span><small>TUNING</small><strong>{preset.label}</strong></span>
          <ChevronDown aria-hidden="true" size={15} />
        </button>
      ) : (
        <div
          aria-label={`현재 튜닝 프리셋 ${preset.label}, ${preset.noteSummary}`}
          className="tunerPresetButton tunerPresetButton--static"
        >
          <span><small>{preset.noteSummary}</small><strong>{preset.label}</strong></span>
        </div>
      )}
    </header>
  );
}

function MobileTunerControls({ activeMenu, controller, onCloseMenu, onOpenInstrument, onOpenSettings }) {
  return (
    <header className="tunerMobileControls" aria-label="튜너 상단 설정">
      {activeMenu ? (
        <button aria-label="선택 목록 닫기" className="tunerMobileDropdownDismiss" onClick={onCloseMenu} type="button" />
      ) : null}
      <div className="tunerMobileControlSlot tunerMobileControlSlot--instrument">
        <button
          aria-label={`악기 선택, 현재 ${controller.instrument.label}`}
          aria-expanded={activeMenu === "instrument"}
          aria-haspopup="listbox"
          className={`tunerMobileSelectButton tunerMobileInstrumentButton ${activeMenu === "instrument" ? "open" : ""}`}
          onClick={onOpenInstrument}
          type="button"
        >
          <strong>{controller.instrument.label}</strong>
          <ChevronDown aria-hidden="true" size={13} />
        </button>
        {activeMenu === "instrument" ? (
          <section aria-label="악기 선택 목록" className="tunerMobileDropdown tunerMobileDropdown--instrument">
            <small>악기 선택</small>
            <div role="radiogroup" aria-label="튜너 악기">
              {TUNER_INSTRUMENT_OPTIONS.map((option) => (
                <button
                  aria-checked={controller.instrument.id === option.id}
                  className={controller.instrument.id === option.id ? "selected" : ""}
                  key={option.id}
                  onClick={() => {
                    controller.selectInstrument(option.id);
                    onCloseMenu();
                  }}
                  role="radio"
                  type="button"
                >
                  <span><strong>{option.label}</strong><small>{option.presets[0].noteSummary}</small></span>
                  {controller.instrument.id === option.id ? <Check aria-hidden="true" size={15} /> : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <div className="tunerMobileControlSlot tunerMobileControlSlot--tuning">
        <button
          aria-label={`튜닝 프리셋 선택, 현재 ${controller.preset.label}`}
          aria-expanded={activeMenu === "tuning"}
          aria-haspopup="listbox"
          className={`tunerMobileSelectButton tunerMobilePresetButton ${activeMenu === "tuning" ? "open" : ""}`}
          onClick={onOpenSettings}
          type="button"
        >
          <strong>{controller.preset.label}</strong>
          <ChevronDown aria-hidden="true" size={13} />
        </button>
        {activeMenu === "tuning" ? (
          <section aria-label="튜닝 프리셋 목록" className="tunerMobileDropdown tunerMobileDropdown--tuning">
            <small>{controller.instrument.label} 튜닝</small>
            <div role="radiogroup" aria-label="튜닝 프리셋">
              {controller.presets.map((option) => (
                <button
                  aria-checked={controller.preset.id === option.id}
                  className={controller.preset.id === option.id ? "selected" : ""}
                  key={option.id}
                  onClick={() => {
                    controller.selectPreset(option.id);
                    onCloseMenu();
                  }}
                  role="radio"
                  type="button"
                >
                  <span><strong>{option.label}</strong><small>{option.noteSummary}</small></span>
                  {controller.preset.id === option.id ? <Check aria-hidden="true" size={15} /> : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <TunerMicStatus controller={controller} />
    </header>
  );
}

function MobileTunerLayout({ activeMenu, controller, guidance, onCloseMenu, onOpenInstrument, onOpenSettings }) {
  return (
    <>
      <MobileTunerControls
        activeMenu={activeMenu}
        controller={controller}
        onCloseMenu={onCloseMenu}
        onOpenInstrument={onOpenInstrument}
        onOpenSettings={onOpenSettings}
      />
      <div className="tunerModeBody tunerModeBody--mobile">
        <TunerDashboard
          controller={controller}
          guidance={guidance}
          showDirectionScale={false}
          showReadout={false}
        />
        <TunerHeadstock
          instrument={controller.instrument}
          onSelectString={controller.selectString}
          preset={controller.preset}
          reading={controller.reading}
          selectedString={controller.selectedString}
          showTarget
        />
      </div>
    </>
  );
}

function DesktopTunerLayout({ controller, guidance, onOpenSettings }) {
  return (
    <>
      <TunerTopbar controller={controller} onOpenSettings={onOpenSettings} />
      <div className="tunerModeBody tunerModeBody--desktop">
        <TunerDashboard controller={controller} guidance={guidance} />
        <TunerHeadstock
          instrument={controller.instrument}
          onSelectString={controller.selectString}
          preset={controller.preset}
          selectedString={controller.selectedString}
        />
      </div>
    </>
  );
}

export default function TunerMode({
  active = true,
  backgroundEntryIndex = 0,
  mobile = false,
  onBackgroundChange,
}) {
  const controller = useTunerController(active);
  const [activeSheet, setActiveSheet] = useState(null);
  const [backgroundIndex, setBackgroundIndex] = useState(
    () => Math.abs(Number(backgroundEntryIndex) || 0) % TUNER_BACKGROUNDS.length,
  );
  const backgroundIndexRef = useRef(backgroundIndex);
  const backgroundSwipeRef = useRef(null);
  const background = TUNER_BACKGROUNDS[backgroundIndex] ?? TUNER_BACKGROUNDS[0];
  const guidance = useMemo(() => getTunerGuidance({
    cents: controller.reading.cents,
    hasSignal: controller.reading.hasSignal,
    manual: controller.selectedString != null,
    stableExact: controller.reading.completed,
  }), [controller.reading.cents, controller.reading.completed, controller.reading.hasSignal, controller.selectedString]);

  const changeBackground = useCallback((offset) => {
    const next = (
      backgroundIndexRef.current
      + offset
      + TUNER_BACKGROUNDS.length
    ) % TUNER_BACKGROUNDS.length;
    backgroundIndexRef.current = next;
    setBackgroundIndex(next);
    onBackgroundChange?.(next);
  }, [onBackgroundChange]);

  useEffect(() => {
    const entryBackgroundIndex = Math.abs(Number(backgroundEntryIndex) || 0) % TUNER_BACKGROUNDS.length;
    backgroundIndexRef.current = entryBackgroundIndex;
    setBackgroundIndex(entryBackgroundIndex);
  }, [backgroundEntryIndex]);

  useEffect(() => {
    if (!active || TUNER_BACKGROUNDS.length < 2) return undefined;
    const intervalId = window.setInterval(() => changeBackground(1), TUNER_BACKGROUND_ROTATION_MS);
    return () => window.clearInterval(intervalId);
  }, [active, changeBackground]);

  const handleBackgroundPointerDown = useCallback((event) => {
    backgroundSwipeRef.current = null;
    if (!mobile || !active || activeSheet || event.isPrimary === false) return;
    if (event.target instanceof Element && event.target.closest("button, a, input, select, textarea, [role='button']")) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - bounds.left;
    const edgeWidth = Math.min(TUNER_BACKGROUND_SWIPE_EDGE_PX, bounds.width * 0.16);
    const edge = relativeX <= edgeWidth
      ? "left"
      : relativeX >= bounds.width - edgeWidth
        ? "right"
        : "center";

    backgroundSwipeRef.current = {
      edge,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  }, [active, activeSheet, mobile]);

  const handleBackgroundPointerMove = useCallback((event) => {
    const swipe = backgroundSwipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - swipe.startX;
    const deltaY = event.clientY - swipe.startY;
    if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) event.preventDefault();
  }, []);

  const handleBackgroundPointerEnd = useCallback((event) => {
    const swipe = backgroundSwipeRef.current;
    backgroundSwipeRef.current = null;
    if (!swipe || swipe.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - swipe.startX;
    const deltaY = event.clientY - swipe.startY;
    const offset = getTunerBackgroundSwipeOffset({ edge: swipe.edge, deltaX, deltaY });
    if (offset) changeBackground(offset);
  }, [changeBackground]);

  useEffect(() => {
    if (!activeSheet) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setActiveSheet(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSheet]);

  const layoutProps = {
    activeMenu: activeSheet,
    controller,
    guidance,
    onCloseMenu: () => setActiveSheet(null),
    onOpenInstrument: () => setActiveSheet((current) => (current === "instrument" ? null : "instrument")),
    onOpenSettings: () => setActiveSheet((current) => (current === "tuning" ? null : "tuning")),
  };

  return (
    <section
      className={`tunerModeShell ${mobile ? "tunerModeShell--mobile" : "tunerModeShell--desktop"} tunerStatus--${guidance.key}`}
      data-background-id={background.id}
      data-background-tone={background.tone}
      onPointerCancel={() => { backgroundSwipeRef.current = null; }}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerEnd}
    >
      <div className="tunerBackgroundLayers" aria-hidden="true">
        {TUNER_BACKGROUNDS.map((option, index) => (
          <div
            className={`tunerBackgroundLayer ${index === backgroundIndex ? "active" : ""}`}
            key={option.id}
            style={{ backgroundImage: `url(${option.src})` }}
          />
        ))}
      </div>
      <div className="tunerBackgroundShade" aria-hidden="true" />
      {mobile ? <MobileTunerLayout {...layoutProps} /> : <DesktopTunerLayout {...layoutProps} />}
      {!mobile && activeSheet === "tuning" ? (
        <TunerSettingsSheet
          instrument={controller.instrument}
          onClose={() => setActiveSheet(null)}
          onSelectPreset={(presetId) => {
            controller.selectPreset(presetId);
            setActiveSheet(null);
          }}
          preset={controller.preset}
          presets={controller.presets}
        />
      ) : null}
      {!mobile && activeSheet === "instrument" ? (
        <TunerInstrumentSheet
          instrument={controller.instrument}
          onClose={() => setActiveSheet(null)}
          onSelectInstrument={(instrumentId) => {
            controller.selectInstrument(instrumentId);
            setActiveSheet(null);
          }}
        />
      ) : null}
    </section>
  );
}
