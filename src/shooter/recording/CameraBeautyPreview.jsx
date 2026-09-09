import { useEffect, useRef } from 'react';
import { beautyFrame, releaseBeauty } from './cameraBeauty.js';

export default function CameraBeautyPreview({ videoRef, level, frame, onUnavailable, onReady }) {
  const canvasRef = useRef(null);
  const levelRef = useRef(level);
  levelRef.current = level;
  useEffect(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) { onUnavailable(); return; }
    let timer, cancelled = false;
    const paint = () => {
      if (cancelled) return;
      if (video.readyState >= 2 && video.videoWidth ) {
        const source = beautyFrame(video, levelRef.current);
        if (!source) { canvas.style.visibility="hidden"; timer=setTimeout(paint,33); return; }
        if (source === video) { onUnavailable(); return; }
        if (canvas.width !== source.width || canvas.height !== source.height) { canvas.width = source.width; canvas.height = source.height; }
        context.drawImage(source, 0, 0);
        canvas.style.visibility="visible";
        canvas.dataset.ready="true";
        onReady(true);
      }
      timer = setTimeout(paint, 1000 / 30);
    };
    onReady(false);
    paint();
    return () => { cancelled = true; clearTimeout(timer); releaseBeauty(video); };
  }, [videoRef, onUnavailable, onReady]);
  return <canvas ref={canvasRef} className="shooterRecordingLive shooterRecordingBeautyPreview" aria-hidden="true"
    style={frame ? { visibility: "hidden", left: frame.x, top: frame.y, width: frame.width, height: frame.height } : { visibility: "hidden" }} />;
}
