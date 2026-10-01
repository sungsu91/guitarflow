// Continuous version of the approved Beat Burst motion.
export const BEAT_BURST_CYCLE_SECONDS = 4;
export const BEAT_BURST_COLORS = Object.freeze({ ink: '#f4e8d8', accent: '#f08062' });
const clamp = n => Math.min(1, Math.max(0, n));
function smooth(a, b, n) {
  const x = clamp((n - a) / (b - a));
  return x * x * (3 - 2 * x);
}

export function createBeatBurstParticles(mobile) {
  let seed = 319;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: mobile ? 38 : 56 }, (_, index) => ({
    index, angle: index * 2.399963229728653 + random() * 0.22,
    phase: random(),
    size: (mobile ? 1.25 : 1.65) + random() * (mobile ? 1.5 : 1.75),
    opacity: 0.35 + random() * 0.57, rotation: -40 + random() * 80,
    accent: index % 3 === 0, far: index % 5 === 0, type: index % 4,
    outer: 0.92 + random() * 0.24,
  }));
}

export function getBeatBurstPose(particle, seconds, width, height, mobile) {
  const phase = ((seconds / BEAT_BURST_CYCLE_SECONDS + particle.phase) % 1 + 1) % 1;
  const radius = Math.pow(1 - phase, 0.79) * particle.outer;
  const angle = particle.angle + Math.pow(phase, 1.18) * 1.24;
  const x = Math.cos(angle) * width * (mobile ? 0.74 : 0.64) * radius;
  const y = Math.sin(angle) * height * (mobile ? 0.63 : 0.81) * radius;
  const screenY = y + height * (mobile ? 0.49 : 0.48);
  const edgeFade = smooth(height * 0.055, height * 0.17, screenY)
    * (1 - smooth(height * 0.7, height * 0.84, screenY));
  const brandQuiet = 1 - 0.94 * Math.exp(
    -Math.pow(x / (width * 0.3), 6) - Math.pow((y - height * 0.045) / (height * 0.14), 6),
  );
  return {
    x, y, radius,
    scale: particle.size * (0.055 + 0.945 * radius) * (particle.far ? 0.58 : 1),
    rotation: (particle.rotation + phase * 82) * Math.PI / 180,
    opacity: smooth(0, 0.085, phase) * (1 - smooth(0.78, 0.985, phase))
      * particle.opacity * (particle.far ? 0.5 : 1) * edgeFade * brandQuiet,
  };
}
