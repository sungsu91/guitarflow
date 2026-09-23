// The same mastering chain is used by live grooves and rendered backing packs.
// Keep note velocities intact; control transients before adding output gain.
const graphs = new WeakMap();
export function getGrooveMasteringInput(audio, output) {
  if (!audio.createDynamicsCompressor) return output;
  let outputs = graphs.get(audio);
  if (!outputs) { outputs = new WeakMap(); graphs.set(audio, outputs); }
  if (outputs.has(output)) return outputs.get(output);
  const compressor = audio.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = .003;
  compressor.release.value = .12;
  const makeup = audio.createGain();
  makeup.gain.value = 4;
  compressor.connect(makeup);
  makeup.connect(output);
  outputs.set(output, compressor);
  return compressor;
}
