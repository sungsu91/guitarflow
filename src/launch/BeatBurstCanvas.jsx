import { useEffect, useRef } from 'react';
import { BEAT_BURST_COLORS, createBeatBurstParticles, getBeatBurstPose } from './beatBurstMotion.js';

function createNotePath(count) {
  const path = new Path2D();
  const start = (128 - (count - 1) * 27) / 2 - 10;
  for (let i = 0; i < count; i += 1) {
    const x = start + i * 27;
    path.moveTo(x - 9, 62);
    path.bezierCurveTo(x - 13, 52, x + 12, 46, x + 13, 56);
    path.bezierCurveTo(x + 15, 66, x - 6, 71, x - 9, 62);
    path.closePath();
    path.rect(x + 10, 11, 2.3, 46);
  }
  if (count > 1) path.rect(start + 10, 11, (count - 1) * 27 + 2.3, 6);
  if (count === 4) path.rect(start + 10, 23, 83.3, 5);
  return path;
}

export default function BeatBurstCanvas({ mobile }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    const particles = createBeatBurstParticles(mobile).sort((a, b) => Number(b.far) - Number(a.far));
    const paths = [1, 2, 4, 3].map(createNotePath);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, pixelRatio = 1;
    let frameId = null, elapsed = 0, previousTime = null;

    function draw() {
      if (!width || !height) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      const centerY = height * (mobile ? 0.49 : 0.48);
      const unit = Math.min(width / (mobile ? 1080 : 1920), height / (mobile ? 1920 : 1080));
      context.strokeStyle = BEAT_BURST_COLORS.accent;
      context.lineWidth = Math.max(0.5, unit);
      [0.49, 0.66, 0.88].forEach((scale, index) => {
        context.globalAlpha = 0.095 - index * 0.018;
        context.beginPath();
        context.ellipse(width / 2, centerY, width * scale, height * (mobile ? 0.26 : 0.3) * scale / 0.66, -24 * Math.PI / 180, 0, Math.PI * 2);
        context.stroke();
      });
      for (const particle of particles) {
        const pose = getBeatBurstPose(particle, elapsed, width, height, mobile);
        // No temporal blur: it caused isolated flashes on invisible particles.
        if (pose.opacity < 0.002) continue;
        context.save();
        context.globalAlpha = pose.opacity;
        context.translate(width / 2 + pose.x, centerY + pose.y);
        context.rotate(pose.rotation);
        context.scale(pose.scale * unit, pose.scale * unit);
        context.translate(-64, -40);
        context.fillStyle = particle.accent ? BEAT_BURST_COLORS.accent : BEAT_BURST_COLORS.ink;
        context.fill(paths[particle.type]);
        if (particle.type === 3) {
          context.font = '15px Arial, sans-serif';
          context.textAlign = 'center';
          context.fillText('3', 62, 6);
        }
        context.restore();
      }
      context.globalAlpha = 1;
    }
    function tick(time) {
      if (previousTime !== null) elapsed += (time - previousTime) / 1000;
      previousTime = time;
      draw();
      frameId = window.requestAnimationFrame(tick);
    }
    function syncPlayback() {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = null;
      previousTime = null;
      draw();
      if (!reducedMotion.matches && !document.hidden) frameId = window.requestAnimationFrame(tick);
    }
    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      draw();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    syncPlayback();
    reducedMotion.addEventListener('change', syncPlayback);
    document.addEventListener('visibilitychange', syncPlayback);
    window.addEventListener('resize', resize);
    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      observer.disconnect();
      reducedMotion.removeEventListener('change', syncPlayback);
      document.removeEventListener('visibilitychange', syncPlayback);
      window.removeEventListener('resize', resize);
    };
  }, [mobile]);
  return <canvas aria-hidden="true" className="launchSplash__patterns" ref={canvasRef} />;
}
