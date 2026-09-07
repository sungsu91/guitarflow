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
  return { rms, signalPresent };
}
