import {performedMeasures} from './scoreMeters.js';
import {scoreBarOrder} from './scoreRepeats.js';
import {ticksOf} from './scoreModel.js';
// All times use sounding MIDI (the guitar staff is engraved one octave higher).
export function scoreTimeline(score, bpm = score.bpm, includeNotes = true, {playEmptyScore=false} = {}) {
  const events = [], pending = new Map();
  let offset = 0, writtenEnd = 0;
  const order=scoreBarOrder(score);
  for (const {visit,bar,meter} of performedMeasures(score,order)) {
    const measure=score.measures[bar];
    if(visit&&bar!==order[visit-1]+1)pending.clear();
    let sequential = 0;
    for (const e of measure) {
      const onset = e.onset ?? sequential, beats = ticksOf(e) / 480;
      const start = (offset + onset / 480) * 60 / bpm, duration = beats * 60 / bpm;
      // Unentered trailing slots reserve editing space, not extra playback.
      // Explicit rests (including legacy rests without a blank flag) do count.
      if (!(e.rest && e.blank === true)) writtenEnd = Math.max(writtenEnd, start + duration);
      if (!includeNotes) { sequential = onset + beats * 480; continue; }
      const tones=[...(e.tones??[e])];if(e.arpeggio)tones.sort((a,b)=>e.arpeggio==='up'?b.string-a.string:a.string-b.string);
      if (!e.rest) for (const [toneIndex,tone] of tones.entries()) {
        const delay=e.arpeggio?Math.min(.025,duration/(tones.length*3))*toneIndex:0;
        const toneStart=start+delay,toneDuration=duration-delay;
        const key = `${e.id}:${tone.string}:${tone.midi}`, candidate = pending.get(key);
        pending.delete(key);
        // A tie may not bridge a gap, change string/pitch, or sustain a dead note.
        const prior = candidate && !(tone.dead??e.dead) && !candidate.dead && Math.abs(candidate.start + candidate.duration - start) < 1e-6 ? candidate : null;
        const note = prior ?? {id:e.id, bar, visit, pickStroke:e.pickStroke??null, vibrato:Boolean(e.vibrato),palmMute:Boolean(e.palmMute), harmonic:Boolean(tone.harmonic), dead:Boolean(tone.dead??e.dead), midi:tone.midi, fret:tone.fret, string:tone.string, voice:e.voice, start:toneStart, duration:0, technique:null,letRing:Boolean(e.letRing),expressions:[]};
        note.expressions.push({start:toneStart,duration:toneDuration,bendEffect:tone.bendEffect??null,vibrato:Boolean(e.vibrato)});
        note.letRing||=Boolean(e.letRing);
        if(e.palmMute&&note.palmMuteStart==null)note.palmMuteStart=start;
        note.duration += prior?duration:toneDuration;
        note.technique = e.technique ?? null;
        if (!prior) events.push(note);
        if (e.tieTo) pending.set(`${e.tieTo}:${tone.string}:${tone.midi}`, note);
      }
      sequential = onset + beats * 480;
    }
    offset += meter[0] * 4 / meter[1];
  }
  // The editor can run the metronome/playhead across an entirely blank score.
  // Entered music still ends at its written end; blanks never create sounds.
  const duration=writtenEnd||(playEmptyScore?offset*60/bpm:0);
  return {events:events.sort((a,b)=>a.start-b.start), duration,order};
}

// Connect only adjacent notes on the same physical string. Other strings keep
// independent voices; an unrelated chord tone never inherits a pitch ramp.
export function guitarVoiceTimeline(score, bpm = score.bpm) {
  const timeline = scoreTimeline(score, bpm), voices = [], last = new Map();
  const rests=performedMeasures(score,timeline.order).flatMap(({bar,barStart})=>{
    let next=0;
    return score.measures[bar].flatMap(e=>{
      const onset=e.onset??next;next=onset+ticksOf(e);
      return e.rest&&!e.blank?[{start:(barStart+onset)/480*60/bpm,voice:e.voice}]:[];
    });
  });
  for (const note of timeline.events) {
    const previous = last.get(note.string), tail = previous?.tail;
    const forward = tail && (tail.visit===note.visit || (tail.visit+1===note.visit && tail.bar+1===note.bar));
    const connected = forward && !tail.dead && !note.dead && Math.abs(tail.start + tail.duration - note.start) < 1e-6 &&
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
  // Entered rests damp ringing strings; empty drafting slots do not invent a pick.
  for(const voice of voices){if(voice.letRing){const next=voices.find(v=>v.string===voice.string&&v.start>voice.start);voice.duration=Math.max(voice.duration,(next?.start??timeline.duration)-voice.start);continue;}const rest=rests.find(r=>(!voice.voice||r.voice===voice.voice)&&r.start>voice.start+1e-6);if(rest!==undefined)voice.silenceAt=rest.start;}
  return {voices, duration:timeline.duration,order:timeline.order};
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
