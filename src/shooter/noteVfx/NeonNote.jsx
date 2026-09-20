import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NOTE_VFX_DURATION_MS, noteVfxColor } from './noteVfx.js';
import './note-vfx.css';

const arcs = Array.from({ length: 6 }, (_, i) => {
  const a = (i * 60 + 8) * Math.PI / 180;
  const b = (i * 60 + 52) * Math.PI / 180;
  const point = (r, angle) => `${50 + r * Math.cos(angle)} ${50 + r * Math.sin(angle)}`;
  return { path: `M ${point(28, a)} A 28 28 0 0 1 ${point(28, b)} L ${point(23, b - .1)} L ${point(24, a + .12)} Z`, x: Math.cos((a + b) / 2) * 18, y: Math.sin((a + b) / 2) * 18 };
});

// Fixed trajectories keep the effect repeatable and avoid per-frame JS work.
const sparks = Array.from({ length: 18 }, (_, i) => {
  const angle = (i * 20 + (i % 3) * 4) * Math.PI / 180;
  const radius = 35 + (i % 4) * 5;
  return { x: Math.cos(angle), y: Math.sin(angle), radius, delay: (i % 3) * 12 };
});

// One transparent vector design; the pitch is always live text, never baked into art.
export function NeonNote({ pitch, label = pitch, breaking = false, impact = { x: 50, y: 70 } }) {
  return <svg aria-hidden="true" className={`noteVfxArt${breaking ? ' noteVfxArt--break' : ''}`} viewBox="0 0 100 100" style={{ '--vfx-color': noteVfxColor(pitch) }}>
    <g className="noteVfxBody" transform="translate(25 25) scale(.5)">
    <circle className="noteVfxCore" cx="50" cy="50" r="27" />
    <circle className="noteVfxHalo" cx="50" cy="50" r="28" />
    <g className="noteVfxRing">
      {breaking ? arcs.map((arc, i) => <path key={i} d={arc.path} className="noteVfxShard" style={{ '--dx': `${arc.x}px`, '--dy': `${arc.y}px` }} />) : <circle cx="50" cy="50" r="28" />}
    </g>
    <path className="noteVfxSymbol noteVfxShard" style={{ '--dx': '5px', '--dy': '-10px' }} d="M 53 23 L 53 7 Q 64 10 60 17 Q 60 12 55 12 L 55 23 C 55 29 46 29 47 25 C 48 22 51 22 53 23 Z" />
    <text className="noteVfxPitch" x="50" y="51" textAnchor="middle" dominantBaseline="middle" fontSize={label.length >= 3 ? 21 : 26}>{label}</text>
    </g>
    {breaking ? <>
      <path className="noteVfxFlash" d={`M ${impact.x - 9} ${impact.y} h 18 M ${impact.x} ${impact.y - 9} v 18`} />
      <g className="noteVfxFireworks" transform="translate(50 50)">{sparks.map((spark, i) => <g key={i} style={{
        '--sx': `${spark.x * 12}px`, '--sy': `${spark.y * 12}px`,
        '--mx': `${spark.x * spark.radius * .78}px`, '--my': `${spark.y * spark.radius * .78}px`,
        '--ex': `${spark.x * spark.radius}px`, '--ey': `${spark.y * spark.radius + 5}px`,
        animationDelay: `${spark.delay}ms`, animationDuration: `${NOTE_VFX_DURATION_MS - spark.delay}ms`,
      }}>
        <path className="noteVfxRay" d={`M ${-spark.x * (i % 2 ? 5 : 9)} ${-spark.y * (i % 2 ? 5 : 9)} L 0 0`} />
        {i % 3 === 0
          ? <path className="noteVfxSpark" d="M 0 -1.8 L .5 -.5 L 1.8 0 L .5 .5 L 0 1.8 L -.5 .5 L -1.8 0 L -.5 -.5 Z" />
          : <circle className="noteVfxSpark" r={i % 2 ? .8 : 1.1} />}
      </g>)}</g>
      <g className="noteVfxAfterglow">{arcs.map((arc, i) => <circle key={i} cx={50 + arc.x * 2.5} cy={50 + arc.y * 2.5} r=".8" />)}</g>
    </> : null}
  </svg>;
}

// Read-only snapshots survive the engine's existing 260 ms removal. No callbacks
// into scoring, collision, spawning, audio, or the gameplay clock.
export function NeonNoteBursts({ targets, nodes, arena, formatPitch, solfegeOn }) {
  const seen = useRef(new Set());
  const timers = useRef(new Set());
  const [bursts, setBursts] = useState([]);
  useLayoutEffect(() => {
    const additions = [];
    seen.current = new Set([...seen.current].filter(id => targets.some(t => t.id === id)));
    for (const target of targets) {
      if (!target.defeated || seen.current.has(target.id)) continue;
      const node = nodes.current.get(target.id);
      if (!node || !arena.current) continue;
      seen.current.add(target.id);
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      const field = arena.current.getBoundingClientRect();
      additions.push({ id: target.id, pitch: target.note ?? target.detail?.pitch ?? 'C4',
        style: { width: style.width, height: style.height, transform: style.transform, transformOrigin: style.transformOrigin, left: style.left, top: style.top },
        impact: { x: Math.max(15, Math.min(85, ((target.impactX / 100 * field.width + field.left - box.left) / box.width) * 100)), y: Math.max(15, Math.min(85, ((target.impactY / 100 * field.height + field.top - box.top) / box.height) * 100)) },
      });
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        setBursts(current => current.filter(burst => burst.id !== target.id));
      }, NOTE_VFX_DURATION_MS);
      timers.current.add(timer);
    }
    if (additions.length) setBursts(current => [...current, ...additions]);
  }, [targets, nodes, arena]);
  useEffect(() => () => { for (const timer of timers.current) clearTimeout(timer); timers.current.clear(); }, []);
  return bursts.map(burst => <div key={burst.id} className="noteVfxBurst" style={burst.style}><NeonNote pitch={burst.pitch} label={formatPitch?.(burst.pitch, solfegeOn) ?? burst.pitch} breaking impact={burst.impact} /></div>);
}
