import { getArtMapSceneMotion } from './artMapSceneMotion.js';
import { artMapObjectFragment } from './artMapObjectShader.js';

// Scene objects have their own transparent surface. The poster stays in the DOM.
export const ART_MAP_MOTION = Object.freeze({ 'glass-garden': 0, 'silk-theatre': 1, 'gilded-ink': 2 });
export function getArtMapCover(imageWidth, imageHeight, width, height) {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const x = width / (imageWidth * scale), y = height / (imageHeight * scale);
  return { scale: [x, y], offset: [(1 - x) / 2, 1 - y] };
}

const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = vec2((position.x + 1.) * .5, (1. - position.y) * .5); gl_Position = vec4(position, 0., 1.); }
`;

export function createArtMapMotion(canvas, image, id, { presentation = 'desktop', sprite = null, onReady = () => {}, onFailure = () => {} } = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) { onFailure(new Error('WebGL unavailable')); return null; }
  const shaders = [], resources = [];
  let disposed = false, failed = false, active = false, frame = 0, last = 0, elapsed = 0, drawnAt = 0;
  let width = 0, height = 0;
  const owner = canvas.ownerDocument, view = owner.defaultView;
  let intersecting = true;
  let program, uniforms;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // At most one million shaded pixels and 30 fps, including high-DPI phones.
    const ratio = Math.min(view.devicePixelRatio || 1, 1.25, Math.sqrt(1_000_000 / (rect.width * rect.height)));
    width = Math.max(1, Math.round(rect.width * ratio)); height = Math.max(1, Math.round(rect.height * ratio));
    canvas.width = width; canvas.height = height;
    gl.viewport(0, 0, width, height);
    const crop = getArtMapCover(image.naturalWidth, image.naturalHeight, rect.width, rect.height);
    gl.uniform2fv(uniforms.cropScale, crop.scale); gl.uniform2fv(uniforms.cropOffset, crop.offset);
  };
  const draw = () => {
    if (disposed || gl.isContextLost() || !width || !height) return;
    gl.uniform1f(uniforms.time, elapsed / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    canvas.dataset.motionTime = String(Math.round(elapsed));
  };
  const allowed = () => !disposed && !failed && active && intersecting && !owner.hidden;
  const tick = now => {
    frame = 0;
    if (!allowed()) { last = 0; return; }
    if (last) elapsed += Math.min(now - last, 80);
    last = now;
    if (now - drawnAt >= 1000 / 30) { draw(); drawnAt = now; }
    frame = view.requestAnimationFrame(tick);
  };
  const sync = () => {
    if (!allowed()) { view.cancelAnimationFrame(frame); frame = 0; last = 0; }
    else if (!frame) frame = view.requestAnimationFrame(tick);
  };
  const lost = event => { event.preventDefault(); failed = true; active = false; sync(); onFailure(); };
  let observer, visibilityObserver;
  const dispose = () => {
    if (disposed) return;
    disposed = true; view.cancelAnimationFrame(frame);
    observer?.disconnect(); visibilityObserver?.disconnect();
    owner.removeEventListener('visibilitychange', sync);
    canvas.removeEventListener('webglcontextlost', lost);
    for (const [type, resource] of resources) gl[type](resource);
    for (const shader of shaders) gl.deleteShader(shader);
  };
  try {
    const compile = (type, source) => {
      const shader = gl.createShader(type); shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    program = gl.createProgram(); resources.push(['deleteProgram', program]);
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, artMapObjectFragment)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer(); resources.push(['deleteBuffer', buffer]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture(); resources.push(['deleteTexture', texture]); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (sprite) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sprite);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    uniforms = Object.fromEntries(['time', 'scene', 'cropScale', 'cropOffset', 'sourceSize', 'regions[0]', 'moon'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.uniform1f(uniforms.scene, ART_MAP_MOTION[id] ?? 0);
    const layout = getArtMapSceneMotion(id, presentation), empty = [0,0,0,0];
    const regions = new Float32Array(32);
    if (id === 'glass-garden') {
      regions.set(layout.beacon ?? empty,0);
      layout.falls?.forEach((fall,i) => regions.set(fall,(i+1)*4));
      regions.set(layout.pool ?? empty,28);
    } else layout.fog?.forEach((fog,i) => regions.set(fog,i*4));
    gl.uniform2fv(uniforms.sourceSize,[image.naturalWidth,image.naturalHeight]);
    gl.uniform4fv(uniforms['regions[0]'],regions);
    gl.uniform4fv(uniforms.moon,layout.moon ?? empty);
    canvas.dataset.motionMode = 'integrated-materials';
    canvas.dataset.presentation = presentation;
    resize(); draw(); onReady();
    observer = new view.ResizeObserver(() => { resize(); draw(); }); observer.observe(canvas);
    if (view.IntersectionObserver) { visibilityObserver = new view.IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; sync(); }); visibilityObserver.observe(canvas); }
    owner.addEventListener('visibilitychange', sync); canvas.addEventListener('webglcontextlost', lost);
  } catch (error) { dispose(); onFailure(error); return null; }
  return { setActive(value) { active = value; sync(); }, dispose };
}
