import { getMicInputPreset, MIC_INPUT_PRESETS } from "./micInputPresets.js";

let activeSession = null;
let acquisitionVersion = 0;

const linearToDb = (value) => (value > 0 ? 20 * Math.log10(value) : -100);
const dbToGain = (value) => 10 ** (Number(value || 0) / 20);

function safelyDisconnect(node) {
  try {
    node?.disconnect?.();
  } catch {
    // A browser can throw when a node was already disconnected.
  }
}

function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => {
    try {
      track.stop();
    } catch {
      // A device may already have ended independently.
    }
  });
}

function getAudioContextConstructor() {
  if (typeof window === "undefined") return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

function createAudioContext(AudioContextApi, presetName) {
  try {
    return new AudioContextApi({
      latencyHint: presetName === MIC_INPUT_PRESETS.GUITAR_DETECTION ? "interactive" : "playback",
    });
  } catch {
    return new AudioContextApi();
  }
}

export function buildMicrophoneConstraints(mediaDevices = globalThis.navigator?.mediaDevices) {
  const supported = mediaDevices?.getSupportedConstraints?.() ?? null;
  const canUse = (name) => !supported || supported[name] === true;
  const audio = {};

  if (canUse("echoCancellation")) audio.echoCancellation = false;
  if (canUse("noiseSuppression")) audio.noiseSuppression = false;
  if (canUse("autoGainControl")) audio.autoGainControl = false;
  if (canUse("channelCount")) audio.channelCount = { ideal: 1 };
  if (canUse("sampleRate")) audio.sampleRate = { ideal: 48_000 };
  if (canUse("sampleSize")) audio.sampleSize = { ideal: 16 };

  return { audio };
}

async function requestMicrophone(mediaDevices) {
  const constraints = buildMicrophoneConstraints(mediaDevices);
  try {
    return await mediaDevices.getUserMedia(constraints);
  } catch (error) {
    const canRetry = ["OverconstrainedError", "NotSupportedError", "TypeError"].includes(error?.name);
    if (!canRetry) throw error;
    return mediaDevices.getUserMedia({ audio: true });
  }
}

function configureAnalyser(context, config) {
  const analyser = context.createAnalyser();
  analyser.fftSize = config.analyserFftSize;
  analyser.smoothingTimeConstant = config.analyserSmoothing;
  return analyser;
}

function createRecordingGraph(context, source, config) {
  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = config.highpassFrequency;
  highpass.Q.value = config.highpassQ;

  const inputGain = context.createGain();
  inputGain.gain.value = dbToGain(config.gainDb);

  const compressor = context.createDynamicsCompressor();
  Object.assign(compressor.threshold, { value: config.compressor.threshold });
  Object.assign(compressor.knee, { value: config.compressor.knee });
  Object.assign(compressor.ratio, { value: config.compressor.ratio });
  Object.assign(compressor.attack, { value: config.compressor.attack });
  Object.assign(compressor.release, { value: config.compressor.release });

  const limiter = context.createDynamicsCompressor();
  Object.assign(limiter.threshold, { value: config.limiter.threshold });
  Object.assign(limiter.knee, { value: config.limiter.knee });
  Object.assign(limiter.ratio, { value: config.limiter.ratio });
  Object.assign(limiter.attack, { value: config.limiter.attack });
  Object.assign(limiter.release, { value: config.limiter.release });

  const analyser = configureAnalyser(context, config);
  const destination = context.createMediaStreamDestination();
  source.connect(highpass);
  highpass.connect(inputGain);
  inputGain.connect(compressor);
  compressor.connect(limiter);
  limiter.connect(analyser);
  limiter.connect(destination);

  return {
    analyser,
    nodes: [source, highpass, inputGain, compressor, limiter, analyser, destination],
    recordingStream: destination.stream,
  };
}

function createDetectionGraph(context, source, config) {
  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = config.highpassFrequency;
  highpass.Q.value = config.highpassQ;

  const detectionGain = context.createGain();
  detectionGain.gain.value = dbToGain(config.detectionGainDb);
  const analyser = configureAnalyser(context, config);
  const silentSink = context.createGain();
  silentSink.gain.value = 0;

  source.connect(highpass);
  highpass.connect(detectionGain);
  detectionGain.connect(analyser);
  analyser.connect(silentSink);
  silentSink.connect(context.destination);

  return {
    analyser,
    nodes: [source, highpass, detectionGain, analyser, silentSink],
    recordingStream: null,
  };
}

function readTimeDomain(analyser, floatBuffer, byteBuffer) {
  if (typeof analyser?.getFloatTimeDomainData === "function") {
    analyser.getFloatTimeDomainData(floatBuffer);
    return floatBuffer;
  }
  analyser?.getByteTimeDomainData?.(byteBuffer);
  for (let index = 0; index < byteBuffer.length; index += 1) {
    floatBuffer[index] = (byteBuffer[index] - 128) / 128;
  }
  return floatBuffer;
}

function calculateSignalLevel(buffer) {
  let sumSquares = 0;
  let peak = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    const absolute = Math.abs(buffer[index]);
    sumSquares += buffer[index] * buffer[index];
    if (absolute > peak) peak = absolute;
  }
  const rms = Math.sqrt(sumSquares / Math.max(1, buffer.length));
  const rmsDb = linearToDb(rms);
  const peakDb = linearToDb(peak);
  const clipping = peak >= 0.965;
  return {
    clipping,
    normalized: Math.min(1, Math.max(0, (rmsDb + 60) / 54)),
    peak,
    peakDb,
    rms,
    rmsDb,
    state: clipping || peakDb > -1.2 ? "peak" : rmsDb < -38 ? "low" : "ok",
  };
}

function getLowFrequencyRatio(analyser, frequencyBuffer, sampleRate) {
  if (!analyser?.getFloatFrequencyData || !frequencyBuffer?.length || !sampleRate) return 0;
  analyser.getFloatFrequencyData(frequencyBuffer);
  const nyquist = sampleRate / 2;
  let lowEnergy = 0;
  let totalEnergy = 0;
  for (let index = 1; index < frequencyBuffer.length; index += 1) {
    const db = frequencyBuffer[index];
    if (!Number.isFinite(db)) continue;
    const energy = 10 ** (db / 10);
    const frequency = (index / frequencyBuffer.length) * nyquist;
    totalEnergy += energy;
    if (frequency <= 105) lowEnergy += energy;
  }
  return totalEnergy > 0 ? lowEnergy / totalEnergy : 0;
}

function createSession({ consumerId, context, graph, preset, presetName, rawStream, trackSettings }) {
  const floatBuffer = graph?.analyser ? new Float32Array(graph.analyser.fftSize) : null;
  const byteBuffer = graph?.analyser ? new Uint8Array(graph.analyser.fftSize) : null;
  const frequencyBuffer = graph?.analyser ? new Float32Array(graph.analyser.frequencyBinCount) : null;
  const monitorStops = new Set();
  let peakHoldUntil = 0;
  const detectionState = {
    lastRms: 0,
    noiseFloorRms: 0.0025,
    startedAt: performance.now(),
  };
  let released = false;
  const resumeWhenVisible = () => {
    if (released || typeof document === "undefined" || document.visibilityState !== "visible") return;
    if (context?.state === "suspended" || context?.state === "interrupted") context.resume?.().catch?.(() => {});
  };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", resumeWhenVisible);

  const session = {
    analyser: graph?.analyser ?? null,
    audioContext: context,
    consumerId,
    preset: presetName,
    rawStream,
    recordingStream: graph?.recordingStream ?? rawStream,
    trackSettings,
    readLevelFrame() {
      if (released || !graph?.analyser || !floatBuffer) {
        return { clipping: false, normalized: 0, peak: 0, peakDb: -100, rms: 0, rmsDb: -100, state: "low" };
      }
      const frame = calculateSignalLevel(readTimeDomain(graph.analyser, floatBuffer, byteBuffer));
      return {
        ...frame,
        lowFrequencyRatio: getLowFrequencyRatio(graph.analyser, frequencyBuffer, context?.sampleRate),
      };
    },
    readDetectionFrame(now = performance.now()) {
      const frame = session.readLevelFrame();
      const elapsed = now - detectionState.startedAt;
      const margin = 10 ** (preset.noiseMarginDb / 20);
      const calibration = elapsed < preset.calibrationMs;
      const followsFloor = calibration || frame.rms < detectionState.noiseFloorRms * 1.55;
      const smoothing = calibration ? 0.16 : followsFloor ? 0.035 : 0.003;
      detectionState.noiseFloorRms += (frame.rms - detectionState.noiseFloorRms) * smoothing;
      detectionState.noiseFloorRms = Math.min(0.045, Math.max(0.0006, detectionState.noiseFloorRms));
      const thresholdRms = Math.max(preset.minimumSignalRms, detectionState.noiseFloorRms * margin);
      const crestFactor = frame.rms > 0 ? frame.peak / frame.rms : 0;
      const abruptImpact = frame.rms > thresholdRms
        && crestFactor > 9
        && frame.lowFrequencyRatio > 0.74
        && frame.rms > detectionState.lastRms * 4;
      const isSignalPresent = !calibration && frame.rms >= thresholdRms && !abruptImpact;
      detectionState.lastRms = frame.rms;
      return {
        ...frame,
        abruptImpact,
        isCalibrating: calibration,
        isSignalPresent,
        noiseFloorRms: detectionState.noiseFloorRms,
        thresholdRms,
      };
    },
    startLevelMonitoring(callback, intervalMs = preset.meterIntervalMs ?? 60) {
      if (typeof callback !== "function" || released) return () => {};
      let active = true;
      let frameId = null;
      let timeoutId = null;
      let lastUpdate = 0;
      const run = (now = performance.now()) => {
        if (!active || released) return;
        if (now - lastUpdate >= intervalMs) {
          const level = session.readLevelFrame();
          if (level.clipping) peakHoldUntil = now + 800;
          callback({ ...level, clipping: level.clipping || now < peakHoldUntil });
          lastUpdate = now;
        }
        if (typeof requestAnimationFrame === "function") frameId = requestAnimationFrame(run);
        else timeoutId = setTimeout(() => run(performance.now()), intervalMs);
      };
      run();
      const stop = () => {
        active = false;
        if (frameId != null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frameId);
        if (timeoutId != null) clearTimeout(timeoutId);
        monitorStops.delete(stop);
      };
      monitorStops.add(stop);
      return stop;
    },
    async release() {
      if (released) return;
      released = true;
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", resumeWhenVisible);
      monitorStops.forEach((stop) => stop());
      monitorStops.clear();
      graph?.nodes?.forEach(safelyDisconnect);
      if (graph?.recordingStream && graph.recordingStream !== rawStream) stopStream(graph.recordingStream);
      stopStream(rawStream);
      if (context && context.state !== "closed") {
        try {
          await context.close();
        } catch {
          // iOS can close an interrupted AudioContext independently.
        }
      }
      if (activeSession === session) activeSession = null;
    },
  };

  return session;
}

export async function acquireMicInput({
  consumerId = "anonymous",
  mediaDevices = globalThis.navigator?.mediaDevices,
  preset: presetName = MIC_INPUT_PRESETS.GUITAR_DETECTION,
} = {}) {
  if (!mediaDevices?.getUserMedia) throw new Error("Microphone capture is not supported.");
  const requestVersion = ++acquisitionVersion;
  await activeSession?.release?.();
  const rawStream = await requestMicrophone(mediaDevices);
  if (requestVersion !== acquisitionVersion) {
    stopStream(rawStream);
    throw new DOMException("Microphone request was superseded.", "AbortError");
  }

  const trackSettings = rawStream.getAudioTracks?.()[0]?.getSettings?.()
    ?? rawStream.getTracks?.()[0]?.getSettings?.()
    ?? {};
  const preset = getMicInputPreset(presetName);
  const AudioContextApi = getAudioContextConstructor();
  let context = null;
  let graph = null;

  if (AudioContextApi) {
    try {
      context = createAudioContext(AudioContextApi, presetName);
      if (context.state === "suspended") await context.resume();
      const source = context.createMediaStreamSource(rawStream);
      graph = presetName === MIC_INPUT_PRESETS.GUITAR_RECORDING
        ? createRecordingGraph(context, source, preset)
        : createDetectionGraph(context, source, preset);
    } catch {
      graph?.nodes?.forEach(safelyDisconnect);
      try {
        await context?.close?.();
      } catch {
        // Raw MediaStream is still a valid recorder fallback.
      }
      context = null;
      graph = null;
    }
  }

  const session = createSession({ consumerId, context, graph, preset, presetName, rawStream, trackSettings });
  activeSession = session;
  return session;
}

export async function releaseActiveMicInput(consumerId = "") {
  if (!activeSession || (consumerId && activeSession.consumerId !== consumerId)) return;
  await activeSession.release();
}

export function getActiveMicInputSession() {
  return activeSession;
}
