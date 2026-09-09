import { useEffect, useRef } from 'react';
import { beautyFrame, releaseBeauty } from './cameraBeauty.js';

export default function CameraBeautyPreview({ videoRef, level, frame, onUnavailable }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) { onUnavailable(); return; }
    let timer, cancelled = false, last = -1;
    const paint = () => {
      if (cancelled) return;
      if (video.readyState >= 2 && video.videoWidth && video.currentTime !== last) {
        const source = beautyFrame(video, level);
        if (source === video) { onUnavailable(); return; }
        if (canvas.width !== source.width || canvas.height !== source.height) { canvas.width = source.width; canvas.height = source.height; }
        context.drawImage(source, 0, 0);
        last = video.currentTime;
      }
      timer = setTimeout(paint, 1000 / 30);
    };
    paint();
    return () => { cancelled = true; clearTimeout(timer); releaseBeauty(video); };
  }, [videoRef, level, onUnavailable]);
  return <canvas ref={canvasRef} className="shooterRecordingLive shooterRecordingBeautyPreview" aria-hidden="true"
    style={frame ? { left: frame.x, top: frame.y, width: frame.width, height: frame.height } : undefined} />;
}
