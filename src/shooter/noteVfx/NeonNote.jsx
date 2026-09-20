import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NOTE_VFX_DURATION_MS, noteVfxColor } from './noteVfx.js';
import './note-vfx.css';

const arcs = Array.from({ length: 6 }, (_, i) => {
  const a = (i * 60 + 8) * Math.PI / 180;
  const b = (i * 60 + 52) * Math.PI / 180;
  return { path: `M ${50 + 28 * Math.cos(a)} ${50 + 28 * Math.sin(a)} A 28 28 0 0 1 ${50 + 28 * Math.cos(b)} ${50 + 28 * Math.sin(b)}`, x: Math.cos((a + b) / 2) * 12, y: Math.sin((a + b) / 2) * 12 };
});

// One transparent vector design; the pitch is always live text, never baked into art.
export function NeonNote({ pitch, breaking = false, impact = { x: 50, y: 70 } }) {
  return <svg aria-hidden="true" className={`noteVfxArt${breaking ? ' noteVfxArt--break' : ''}`} viewBox="0 0 100 100" style={{ '--vfx-color': noteVfxColor(pitch) }}>
    <circle className="noteVfxCore" cx="50" cy="50" r="27" />
    <g className="noteVfxRing">
      {breaking ? arcs.map((arc, i) => <path key={i} d={arc.path} className="noteVfxShard" style={{ '--dx': `${arc.x}px`, '--dy': `${arc.y}px` }} />) : <circle cx="50" cy="50" r="28" />}
    </g>
    <path className="noteVfxSymbol noteVfxShard" style={{ '--dx': '5px', '--dy': '-10px' }} d="M 53 23 L 53 7 Q 64 10 60 17 Q 60 12 55 12 L 55 23 C 55 29 46 29 47 25 C 48 22 51 22 53 23 Z" />
    <text className="noteVfxPitch" x="50" y="51" textAnchor="middle" dominantBaseline="middle" fontSize={pitch.length > 3 ? 22 : 26}>{pitch}</text>
    {breaking ? <>
      <path className="noteVfxFlash" d={`M ${impact.x - 9} ${impact.y} h 18 M ${impact.x} ${impact.y - 9} v 18`} />
      <g className="noteVfxAfterglow">{arcs.map((arc, i) => <circle key={i} cx={50 + arc.x * 3.25} cy={50 + arc.y * 3.25} r="1.1" />)}</g>
    </> : null}
  </svg>;
}

// Read-only snapshots survive the engine's existing 260 ms removal. No callbacks
// into scoring, collision, spawning, audio, or the gameplay clock.
export function NeonNoteBursts({ targets, nodes, arena }) {
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
  return bursts.map(burst => <div key={burst.id} className="noteVfxBurst" style={burst.style}><NeonNote pitch={burst.pitch} breaking impact={burst.impact} /></div>);
}
