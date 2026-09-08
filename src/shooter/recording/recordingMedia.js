export const RECORDING_WIDTH = 1080;
export const MOBILE_CAMERA_ZOOM = 1.6;
export const MOBILE_CAMERA_HEIGHT = .35;

export function cameraContainRect(sourceWidth, sourceHeight, width, height, zoom = 1) {
  // Enlarge vertically as requested, but never cut off the guitar at the sides.
  const scale = Math.min(Math.min(width / sourceWidth, height / sourceHeight) * zoom, width / sourceWidth);
  const w = sourceWidth * scale, h = sourceHeight * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}

export function frontCameraConstraints(mobile, supported = {}) {
  return { audio: false, video: {
    facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 },
    ...(mobile ? { aspectRatio: { ideal: 16 / 9 }, ...(supported.resizeMode ? { resizeMode: { ideal: 'none' } } : {}) } : {}),
  } };
}

export function recorderOptions(Recorder = globalThis.MediaRecorder) {
  if (!Recorder) throw new Error("현재 실행 환경에서 영상 녹화 기능을 지원하지 않습니다. Safari에서 같은 주소를 직접 열어 확인해주세요. [RECORDER_API]");
  // Let the MP4 encoder select a level appropriate for tall 1080px recordings.
  const mimeType = ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm"]
    .find((type) => Recorder.isTypeSupported?.(type));
  return { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 10_000_000 };
}

export function coverSourceRect(sourceWidth, sourceHeight, width, height) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const w = width / scale;
  const h = height / scale;
  return [(sourceWidth - w) / 2, (sourceHeight - h) / 2, w, h];
}

export function cameraOverlayRect(width, height, position = { x: 1, y: .24 }, mobile = true, size = 1) {
  const base = Math.min(width * (mobile ? .36 : .22), mobile ? 160 : 240);
  const w = Math.max(Math.min(104, width - 16), Math.min(base * size, width - 16, (height - 64) / 1.12, mobile ? 280 : 420));
  const h = w * 1.12;
  return { x: 8 + Math.max(0, width - w - 16) * position.x, y: 48 + Math.max(0, height - h - 64) * position.y, width: w, height: h };
}

export function drawComposite(context, game, camera, width, height, overlay) {
  context.fillStyle = "#020503";
  context.fillRect(0, 0, width, height);
  if (game?.width && game?.height) {
    const gameHeight = height * (overlay?.gameFraction ?? 1);
    const sourceHeight = game.height * (overlay?.gameSourceFraction ?? 1);
    const scale = Math.min(width / game.width, gameHeight / sourceHeight);
    const w = game.width * scale, h = sourceHeight * scale;
    if (overlay?.gameSourceFraction) context.drawImage(game, 0, 0, game.width, sourceHeight, (width - w) / 2, (gameHeight - h) / 2, w, h);
    else context.drawImage(game, (width - w) / 2, (gameHeight - h) / 2, w, h);
  }
  if (overlay && camera.readyState >= 2 && camera.videoWidth && camera.videoHeight) {
    const x = overlay.x * width, y = overlay.y * height;
    const w = overlay.width * width, h = overlay.height * height;
    context.save();
    context.translate(x + w, y);
    context.scale(-1, 1);
    context.beginPath();
    context.rect(0, 0, w, h);
    context.clip();
    if (overlay.fit === "contain") {
      const zoom = Math.max(1, Math.min(1.6, overlay.zoom ?? 1));
      const rect = cameraContainRect(camera.videoWidth, camera.videoHeight, w, h, zoom);
      context.drawImage(camera, rect.x, rect.y, rect.width, rect.height);
    } else {
      context.drawImage(camera, ...coverSourceRect(camera.videoWidth, camera.videoHeight, w, h), 0, 0, w, h);
    }
    context.restore();
  }
}

export function stopTracks(stream) {
  stream?.getTracks().forEach((track) => {
    try { track.stop(); } catch { /* A device may already be disconnected. */ }
  });
}

export function recordingError(error) {
  if (["NotAllowedError", "PermissionDeniedError"].includes(error?.name)) return "카메라와 마이크 권한을 허용한 뒤 다시 시도해주세요.";
  if (["NotFoundError", "NotReadableError", "OverconstrainedError"].includes(error?.name)) return "카메라를 사용할 수 없습니다. 다른 앱에서 사용 중인지 확인해주세요.";
  return error?.message || "촬영을 완료하지 못했습니다. 다시 시도해주세요.";
}

export function recordingFile(blob) {
  const extension = blob.type.includes("mp4") ? "mp4" : "webm";
  return new File([blob], `FRETIVA-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`, { type: blob.type });
}

export async function saveRecording(blob, url, nav = navigator, doc = document) {
  const file = recordingFile(blob);
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "FRETIVA LAB 기타 연주" });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      // Some browsers expose file sharing but cannot open a share target.
      // Keep the same user-initiated action and offer the normal download path.
    }
  }
  const link = doc.createElement("a");
  link.href = url;
  link.download = file.name;
  doc.body.appendChild(link);
  link.click();
  link.remove();
  return "download";
}
