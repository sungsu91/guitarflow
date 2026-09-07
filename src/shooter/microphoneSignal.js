export const SHOOTER_QUIET_PITCH_MIN_CONFIDENCE = 0.94;

export function isShooterPitchSignalPresent(signal, confidence = 0) {
  return Boolean(signal.signalPresent || (
    signal.canAnalyzePitch && Number.isFinite(confidence) && confidence >= SHOOTER_QUIET_PITCH_MIN_CONFIDENCE
  ));
}

export function readShooterSignalFrame(session, now, trackingActive, fallbackRms, fallbackThreshold) {
  // Do not learn the ringing guitar as room noise. Once acquired, keep the
  // lower release gate until the string actually falls below it.
  const frame = session?.readDetectionFrame?.(now, { sustainActive: trackingActive });
  const rms = frame?.rms ?? fallbackRms;
  const signalPresent = frame
    ? !frame.isCalibrating && !frame.abruptImpact && Boolean(
        (frame.isAttackPresent ?? frame.isSignalPresent)
      || (trackingActive && frame.isReleasePresent))
    : rms >= fallbackThreshold;
  // A quiet first pluck must reach the detector before we can decide whether
  // it is a clear note. The adaptive noise/release floor still excludes noise;
  // acquisition below the attack gate additionally requires high confidence.
  const canAnalyzePitch = signalPresent || Boolean(frame
    && !frame.isCalibrating && !frame.abruptImpact && frame.isReleasePresent);
  return { rms, signalPresent, canAnalyzePitch };
}
