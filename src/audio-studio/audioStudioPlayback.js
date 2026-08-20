import { getAudioStudioProjectDurationMs } from "./audioStudioModel.js";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const reverbImpulseCache = new WeakMap();

export function getAudioStudioPlaybackRange(project, fromMs = 0) {
  const projectEndMs = getAudioStudioProjectDurationMs(project);
  const loop = project?.practice?.loop;
  const hasLoop = Boolean(loop?.enabled && loop.endMs > loop.startMs);
  const startMs = hasLoop ? clamp(fromMs, loop.startMs, loop.endMs) : clamp(fromMs, 0, projectEndMs);
  return {
    endMs: hasLoop ? Math.min(projectEndMs || loop.endMs, loop.endMs) : projectEndMs,
    loopEnabled: hasLoop,
    startMs,
  };
}

export function createAudioStudioPlaybackPlan(project, { fromMs = 0 } = {}) {
  const range = getAudioStudioPlaybackRange(project, fromMs);
  const speed = clamp(project?.practice?.speed?.current || 1, 0.25, 2);
  const master = project?.mixer?.master || {};
  const sourceById = new Map((project?.audioSources || []).map((source) => [source.id, source]));
  const soloTrackIds = new Set((project?.tracks || []).filter((track) => track.solo).map((track) => track.id));
  if (master.mute || range.endMs <= range.startMs) return { clips: [], range, speed };
  const clips = [];
  (project?.tracks || []).forEach((track) => {
    if (track.mute || (soloTrackIds.size && !soloTrackIds.has(track.id))) return;
    (track.clips || []).forEach((clip) => {
      if (clip.mute) return;
      const clipEndMs = clip.timelineStartMs + clip.durationMs;
      const audibleStartMs = Math.max(range.startMs, clip.timelineStartMs);
      const audibleEndMs = Math.min(range.endMs, clipEndMs);
      if (audibleEndMs <= audibleStartMs) return;
      const elapsedClipMs = audibleStartMs - clip.timelineStartMs;
      const source = sourceById.get(clip.sourceId);
      const fadeInMs = Math.max(0, Number(clip.fadeInMs) || 0);
      const fadeOutMs = Math.max(0, Number(clip.fadeOutMs) || 0);
      const fadeInRemainingMs = Math.max(0, fadeInMs - elapsedClipMs);
      const fadeOutTimelineMs = clipEndMs - fadeOutMs;
      clips.push({
        clipId: clip.id,
        detuneCents: (Number(clip.pitchSemitones) + Number(project.practice?.pitchSemitones || 0)) * 100,
        durationMs: audibleEndMs - audibleStartMs,
        fadeInInitialRatio: fadeInMs > 0 ? clamp(elapsedClipMs / fadeInMs, 0.0001, 1) : 1,
        fadeInRemainingMs,
        fadeOutStartMs: fadeOutMs > 0 && audibleEndMs > fadeOutTimelineMs
          ? Math.max(0, fadeOutTimelineMs - audibleStartMs)
          : null,
        gain: clamp(track.volume, 0, 2)
          * clamp(clip.volume, 0, 2)
          * clamp(master.volume ?? 1, 0, 2)
          * (10 ** (clamp(clip.gainDb, -60, 24) / 20)),
        pan: clamp((Number(track.pan) || 0) + (Number(clip.pan) || 0), -1, 1),
        peakAmplitude: clamp(source?.peakAmplitude, 0, 1),
        playbackRate: clamp(clip.playbackRate || 1, 0.25, 4) * speed,
        processingChain: [
          ...Array.from(clip.processingChain || []),
          ...Array.from(track.effectsChain || []),
        ].filter((processor) => processor?.enabled !== false),
        sourceDurationMs: (audibleEndMs - audibleStartMs) * clamp(clip.playbackRate || 1, 0.25, 4),
        sourceId: clip.sourceId,
        sourceOffsetMs: clip.sourceStartMs + elapsedClipMs * clamp(clip.playbackRate || 1, 0.25, 4),
        timelineOffsetMs: audibleStartMs - range.startMs,
        timelineStartMs: audibleStartMs,
        trackId: track.id,
      });
    });
  });
  return { clips, range, speed };
}

function createEffectNode(context, processor, item, when) {
  if (processor.type === "noise-reduction" && typeof context.createBiquadFilter === "function") {
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    setAudioParam(filter.frequency, clamp(processor.frequency || 65, 20, 800), when);
    setAudioParam(filter.Q, clamp(processor.q || 0.7, 0.1, 12), when);
    return filter;
  }
  if (processor.type === "eq" && typeof context.createBiquadFilter === "function") {
    const filter = context.createBiquadFilter();
    filter.type = "peaking";
    setAudioParam(filter.frequency, clamp(processor.frequency || 1_000, 40, 18_000), when);
    setAudioParam(filter.Q, clamp(processor.q || 1, 0.1, 18), when);
    setAudioParam(filter.gain, clamp(processor.gainDb || 0, -18, 18), when);
    return filter;
  }
  if (processor.type === "compressor" && typeof context.createDynamicsCompressor === "function") {
    const compressor = context.createDynamicsCompressor();
    setAudioParam(compressor.threshold, clamp(processor.thresholdDb ?? -18, -60, 0), when);
    setAudioParam(compressor.knee, clamp(processor.knee ?? 12, 0, 40), when);
    setAudioParam(compressor.ratio, clamp(processor.ratio || 4, 1, 20), when);
    setAudioParam(compressor.attack, clamp(processor.attack ?? 0.008, 0, 1), when);
    setAudioParam(compressor.release, clamp(processor.release ?? 0.15, 0, 1), when);
    return compressor;
  }
  if (processor.type === "normalize" && typeof context.createGain === "function") {
    const gain = context.createGain();
    const normalizationGain = item.peakAmplitude > 0 ? Math.min(4, 0.92 / item.peakAmplitude) : 1;
    setAudioParam(gain.gain, normalizationGain, when);
    return gain;
  }
  if (processor.type === "reverb" && typeof context.createConvolver === "function" && typeof context.createBuffer === "function") {
    const convolver = context.createConvolver();
    const duration = clamp(processor.duration || 0.65, 0.1, 2.5);
    const cacheKey = `${context.sampleRate}:${duration.toFixed(2)}`;
    let contextCache = reverbImpulseCache.get(context);
    if (!contextCache) {
      contextCache = new Map();
      reverbImpulseCache.set(context, contextCache);
    }
    let impulse = contextCache.get(cacheKey);
    if (!impulse) {
      const length = Math.max(1, Math.floor(context.sampleRate * duration));
      impulse = context.createBuffer(2, length, context.sampleRate);
      for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const samples = impulse.getChannelData(channel);
        for (let index = 0; index < length; index += 1) {
          samples[index] = (Math.random() * 2 - 1) * ((1 - index / length) ** 2.4) * 0.35;
        }
      }
      contextCache.set(cacheKey, impulse);
    }
    convolver.buffer = impulse;
    return convolver;
  }
  return null;
}

function setAudioParam(param, value, time) {
  if (!param) return;
  if (typeof param.setValueAtTime === "function") param.setValueAtTime(value, time);
  else param.value = value;
}

export function scheduleAudioStudioPlayback({ audioBuffers, audioContext, fromMs = 0, leadTimeSeconds = 0.035, outputNode = null, project }) {
  const plan = createAudioStudioPlaybackPlan(project, { fromMs });
  const nodes = [];
  const startAt = audioContext.currentTime + Math.max(0, Number(leadTimeSeconds) || 0);
  let output = outputNode || audioContext.destination;
  let analyser = null;
  if (typeof audioContext.createAnalyser === "function") {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    analyser.connect(output);
    nodes.push(analyser);
    output = analyser;
  }
  if (project.mixer?.master?.limiterEnabled && typeof audioContext.createDynamicsCompressor === "function") {
    const limiter = audioContext.createDynamicsCompressor();
    setAudioParam(limiter.threshold, -1, startAt);
    setAudioParam(limiter.knee, 0, startAt);
    setAudioParam(limiter.ratio, 20, startAt);
    setAudioParam(limiter.attack, 0.003, startAt);
    setAudioParam(limiter.release, 0.08, startAt);
    limiter.connect(output);
    nodes.push(limiter);
    output = limiter;
  }
  plan.clips.forEach((item) => {
    const buffer = audioBuffers.get(item.sourceId);
    if (!buffer) return;
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    const panner = typeof audioContext.createStereoPanner === "function" ? audioContext.createStereoPanner() : null;
    const when = startAt + (item.timelineOffsetMs / 1000 / plan.speed);
    const scheduledDuration = item.durationMs / 1000 / plan.speed;
    source.buffer = buffer;
    setAudioParam(source.playbackRate, item.playbackRate, when);
    setAudioParam(source.detune, item.detuneCents, when);
    setAudioParam(gain.gain, item.gain * item.fadeInInitialRatio, when);
    if (item.fadeInRemainingMs > 0) {
      gain.gain?.linearRampToValueAtTime?.(item.gain, when + Math.min(scheduledDuration, item.fadeInRemainingMs / 1000 / plan.speed));
    }
    if (item.fadeOutStartMs !== null) {
      const fadeStart = when + item.fadeOutStartMs / 1000 / plan.speed;
      setAudioParam(gain.gain, item.gain, fadeStart);
      gain.gain?.linearRampToValueAtTime?.(0.0001, when + scheduledDuration);
    }
    if (panner) setAudioParam(panner.pan, item.pan, when);
    source.connect(gain);
    const effectNodes = item.processingChain
      .map((processor) => createEffectNode(audioContext, processor, item, when))
      .filter(Boolean);
    let tail = gain;
    effectNodes.forEach((effectNode) => {
      tail.connect(effectNode);
      tail = effectNode;
    });
    if (panner) {
      tail.connect(panner);
      panner.connect(output);
    } else {
      tail.connect(output);
    }
    source.start(when, item.sourceOffsetMs / 1000, item.sourceDurationMs / 1000);
    nodes.push(source, gain, ...effectNodes, ...(panner ? [panner] : []));
  });
  return { ...plan, analyser, nodes, startAt };
}

export function stopAudioStudioPlayback(nodes) {
  Array.from(nodes || []).forEach((node) => {
    try { node.stop?.(); } catch { /* Node may already be stopped. */ }
    try { node.disconnect?.(); } catch { /* Safari may throw for detached nodes. */ }
  });
}
