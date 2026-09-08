// Inspect Chromium MediaRecorder's fragmented MP4 timing, without a decoder.
// Measures encoded frame intervals, not just a requested captureStream rate.
import { readFile } from 'node:fs/promises';
for (const path of process.argv.slice(2)) {
  const data = await readFile(path);
  function boxes(start, end) {
    const result = [];
    for (let offset = start; offset + 8 <= end;) {
      let size = data.readUInt32BE(offset), header = 8;
      if (size === 1) { size = Number(data.readBigUInt64BE(offset + 8)); header = 16; }
      if (size === 0) size = end - offset;
      if (size < header || offset + size > end) throw new Error('Invalid MP4 box');
      result.push({ type: data.toString('ascii', offset + 4, offset + 8), start: offset + header, end: offset + size });
      offset += size;
    }
    return result;
  }
  const children = box => boxes(box.start, box.end);
  const child = (box, type) => children(box).find(item => item.type === type);
  const root = { start: 0, end: data.length };
  const moov = child(root, 'moov');
  const tracks = new Map();
  for (const trak of children(moov).filter(box => box.type === 'trak')) {
    const tkhd = child(trak, 'tkhd'), mdia = child(trak, 'mdia');
    const mdhd = child(mdia, 'mdhd'), hdlr = child(mdia, 'hdlr');
    const id = data.readUInt32BE(tkhd.start + (data[tkhd.start] === 1 ? 20 : 12));
    tracks.set(id, {
      type: data.toString('ascii', hdlr.start + 8, hdlr.start + 12),
      timescale: data.readUInt32BE(mdhd.start + (data[mdhd.start] === 1 ? 20 : 12)),
      durations: [],
    });
  }
  for (const moof of children(root).filter(box => box.type === 'moof')) {
    for (const traf of children(moof).filter(box => box.type === 'traf')) {
      const tfhd = child(traf, 'tfhd');
      const track = tracks.get(data.readUInt32BE(tfhd.start + 4));
      const flags = data.readUInt32BE(tfhd.start) & 0xffffff;
      let cursor = tfhd.start + 8;
      if (flags & 1) cursor += 8;
      if (flags & 2) cursor += 4;
      const defaultDuration = flags & 8 ? data.readUInt32BE(cursor) : 0;
      for (const run of children(traf).filter(box => box.type === 'trun')) {
        const flags = data.readUInt32BE(run.start) & 0xffffff;
        const count = data.readUInt32BE(run.start + 4);
        let cursor = run.start + 8 + ((flags & 1) ? 4 : 0) + ((flags & 4) ? 4 : 0);
        for (let index = 0; index < count; index++) {
          const duration = flags & 0x100 ? data.readUInt32BE(cursor) : defaultDuration;
          if (!duration) throw new Error('Missing sample duration');
          track.durations.push(duration * 1000 / track.timescale);
          for (const flag of [0x100, 0x200, 0x400, 0x800]) if (flags & flag) cursor += 4;
        }
      }
    }
  }
  const video = [...tracks.values()].find(track => track.type === 'vide');
  const sorted = [...video.durations].sort((a,b) => a-b);
  if (!sorted.length) throw new Error('No fragmented video samples');
  console.log(JSON.stringify({ path, frames: sorted.length, fps: sorted.length * 1000 / sorted.reduce((a,b) => a+b, 0), p95IntervalMs: sorted[Math.floor((sorted.length-1)*.95)], maxIntervalMs: sorted.at(-1) }, null, 2));
}
