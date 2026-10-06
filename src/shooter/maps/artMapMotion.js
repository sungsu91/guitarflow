import { getArtMapMaterials } from './artMapMaterials.js';

// The painting stays fixed. Only hand-selected material interiors receive motion.
// Never deform the viewport or infer fabric/water from a screen-edge gradient.
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
const fragmentSource = `
precision highp float;
varying vec2 uv;
uniform sampler2D painting;
uniform vec2 cropScale;
uniform vec2 cropOffset;
uniform float time;
uniform float scene;
uniform vec4 materialPaths[6];
uniform vec3 materialRadiiA;
uniform vec3 materialRadiiB;
uniform vec2 imageSize;
vec3 material(vec2 p, vec4 path, float radius, float phase) {
  if(radius<=0.) return vec3(0.);
  vec2 aspect=vec2(imageSize.x/imageSize.y,1.);
  vec2 a=path.xy*aspect, b=path.zw*aspect, point=p*aspect;
  vec2 direction=b-a;
  float along=clamp(dot(point-a,direction)/max(dot(direction,direction),.000001),0.,1.);
  float distance=length(point-mix(a,b,along));
  float mask=1.-smoothstep(radius*.35,radius,distance);
  float wave=along*8.-time*.65+phase;
  if(scene>1.5) wave=p.y*190.-time*2.1+phase;
  float fold=sin(wave)*mask;
  float sheen=pow(.5+.5*sin(wave+.8),4.)*mask;
  return vec3(mask,fold,sheen);
}
void main() {
  vec2 p=uv*cropScale+cropOffset;
  vec3 effect=material(p,materialPaths[0],materialRadiiA.x,0.)
    +material(p,materialPaths[1],materialRadiiA.y,1.7)
    +material(p,materialPaths[2],materialRadiiA.z,3.4)
    +material(p,materialPaths[3],materialRadiiB.x,5.1)
    +material(p,materialPaths[4],materialRadiiB.y,6.8)
    +material(p,materialPaths[5],materialRadiiB.z,8.5);
  vec3 color=texture2D(painting,p).rgb;
  // Outside the material paths the pixel is identical at every point in time.
  // Silk surface detail moves less than one source pixel; its outline stays fixed.
  if(scene>.5 && scene<1.5 && effect.x>0.) {
    vec2 detail=vec2(.65,.35)*clamp(effect.y,-1.,1.)/imageSize;
    color=texture2D(painting,p+detail).rgb;
    color*=1.+effect.y*.035;
  }
  vec3 tint=scene<.5?vec3(.12,.15,.19):vec3(.19,.14,.075);
  float paint=smoothstep(.12,.65,max(color.r,max(color.g,color.b)));
  gl_FragColor=vec4(color+tint*effect.z*paint,1.);
}
`;

export function createArtMapMotion(canvas, image, id, { presentation = 'desktop', onReady = () => {}, onFailure = () => {} } = {}) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
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
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer(); resources.push(['deleteBuffer', buffer]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture(); resources.push(['deleteTexture', texture]); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    uniforms = Object.fromEntries(['time', 'scene', 'cropScale', 'cropOffset', 'imageSize', 'materialPaths[0]', 'materialRadiiA', 'materialRadiiB'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.uniform1f(uniforms.scene, ART_MAP_MOTION[id] ?? 0);
    gl.uniform2fv(uniforms.imageSize, [image.naturalWidth, image.naturalHeight]);
    const materials = getArtMapMaterials(id, presentation);
    const paths = new Float32Array(24), radii = new Float32Array(6);
    materials.forEach((path, index) => { paths.set(path.slice(0, 4), index * 4); radii[index] = path[4]; });
    gl.uniform4fv(uniforms['materialPaths[0]'], paths);
    gl.uniform3fv(uniforms.materialRadiiA, radii.slice(0, 3));
    gl.uniform3fv(uniforms.materialRadiiB, radii.slice(3));
    canvas.dataset.motionMode = 'material-only';
    canvas.dataset.presentation = presentation;
    resize(); draw(); onReady();
    observer = new view.ResizeObserver(() => { resize(); draw(); }); observer.observe(canvas);
    if (view.IntersectionObserver) { visibilityObserver = new view.IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; sync(); }); visibilityObserver.observe(canvas); }
    owner.addEventListener('visibilitychange', sync); canvas.addEventListener('webglcontextlost', lost);
  } catch (error) { dispose(); onFailure(error); return null; }
  return { setActive(value) { active = value; sync(); }, dispose };
}
