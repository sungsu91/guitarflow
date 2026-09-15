// All times use sounding MIDI (the guitar staff is engraved one octave higher).
export function scoreTimeline(score, bpm = score.bpm) {
  const events = [], pending = new Map();
  let offset = 0;
  for (const [bar, measure] of score.measures.entries()) {
    let sequential = 0;
    for (const e of measure) {
      const onset = e.onset ?? sequential, beats = 4 / Number(e.duration);
      const start = (offset + onset / 480) * 60 / bpm, duration = beats * 60 / bpm;
      if (!e.rest) for (const tone of e.tones ?? [e]) {
        const key = `${e.id}:${tone.string}:${tone.midi}`, candidate = pending.get(key);
        pending.delete(key);
        // A tie may not bridge a gap, change string/pitch, or sustain a dead note.
        const prior = candidate && !e.dead && !candidate.dead && Math.abs(candidate.start + candidate.duration - start) < 1e-6 ? candidate : null;
        const note = prior ?? {id:e.id, bar, dead:Boolean(e.dead), midi:tone.midi, fret:tone.fret, string:tone.string, start, duration:0, technique:null};
        note.duration += duration;
        note.technique = e.technique ?? null;
        if (!prior) events.push(note);
        if (e.tieTo) pending.set(`${e.tieTo}:${tone.string}:${tone.midi}`, note);
      }
      sequential = onset + beats * 480;
    }
    offset += (score.meter ?? [4,4])[0] * 4 / (score.meter ?? [4,4])[1];
  }
  return {events:events.sort((a,b)=>a.start-b.start), duration:offset * 60 / bpm};
}

// Connect only adjacent notes on the same physical string. Other strings keep
// independent voices; an unrelated chord tone never inherits a pitch ramp.
export function guitarVoiceTimeline(score, bpm = score.bpm) {
  const timeline = scoreTimeline(score, bpm), voices = [], last = new Map();
  for (const note of timeline.events) {
    const previous = last.get(note.string), tail = previous?.tail;
    const connected = tail && !tail.dead && !note.dead && Math.abs(tail.start + tail.duration - note.start) < 1e-6 &&
      ((tail.technique === 'H' && note.midi > tail.midi) || (tail.technique === 'P' && note.midi < tail.midi) || (tail.technique === 'S' && note.midi !== tail.midi));
    if (connected) {
      previous.segments.push({...note, connection:tail.technique});
      previous.duration = note.start + note.duration - previous.start;
      previous.tail = note;
    } else {
      const voice = {...note, segments:[{...note, connection:null}], tail:note};
      voices.push(voice);
      last.set(note.string, voice);
    }
  }
  return {voices, duration:timeline.duration};
}

// Seeking starts a fresh picked voice at the chosen position; subsequent
// connections still apply. Never drop a sustained tie spanning that position.
export function voicesFrom(timeline, offset) {
  return timeline.voices.filter(v=>v.start+v.duration>offset+1e-6).map(v=> {
    if (v.start >= offset) return v;
    const active = v.segments.findLast(s=>s.start<=offset) ?? v.segments[0];
    const segments = [{...active, start:offset, duration:active.start+active.duration-offset, connection:null}, ...v.segments.filter(s=>s.start>offset)];
    return {...v, ...active, start:offset, duration:v.start+v.duration-offset, segments};
  });
}
