export function isBackingPlaybackSourceReady(audioSource, recording) {
  return Boolean(
    audioSource?.url
    && audioSource?.blob
    && recording?.blob
    && audioSource.blob === recording.blob
  );
}
