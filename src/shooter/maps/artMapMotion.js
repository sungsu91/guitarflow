// The scenery clock is independent of rhythm timing. Only the backdrop is warped;
// the stage base and the middle note lane remain anchored.
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
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), f.x), f.y);
}
void main() {
  vec2 p=uv*cropScale+cropOffset;
  vec2 q=p;
  float edge=smoothstep(.10,.42,abs(uv.x-.5));
  float upper=1.-smoothstep(.68,.82,p.y);
  float border=smoothstep(0.,.045,p.x)*smoothstep(0.,.045,1.-p.x)*smoothstep(0.,.04,p.y);
  vec3 light=vec3(0.);
  if(scene<.5) {
    float sway=sin(time*.85+p.y*7.)*.012+sin(time*1.3+p.y*15.)*.004;
    q.x+=sway*edge*upper*border;
    q.y+=cos(time*.65+p.x*11.)*.005*edge*upper*border;
    float water=smoothstep(.66,.73,p.y)*(1.-smoothstep(.765,.80,p.y))*(1.-edge*.75);
    q.x+=sin(p.y*170.-time*3.+sin(p.x*19.+time))*.004*water;
    q.y+=sin(p.x*54.+time*1.4)*.0009*water;
    float caustic=pow(max(0.,sin(p.y*135.-time*2.3+sin(p.x*17.+time*.7))),12.);
    light=vec3(.21,.42,.5)*caustic*water*.18;
    light+=vec3(.13,.18,.25)*pow(max(0.,sin(p.x*19.+p.y*11.-time*1.5)),14.)*edge*upper;
  } else if(scene<1.5) {
    float fabric=(edge*.85+(1.-smoothstep(.10,.28,p.y))*.45)*upper*border;
    q.x+=(sin(p.y*10.-time*1.1)*.020+sin(p.y*23.+time*.7)*.006)*fabric;
    q.y+=sin(p.x*13.+p.y*8.-time*.95)*.015*fabric;
    float sheen=pow(max(0.,sin(p.x*8.+p.y*12.-time*1.15)),7.);
    light=vec3(.24,.13,.055)*sheen*fabric;
  } else {
    float valley=smoothstep(.40,.61,p.y)*(1.-smoothstep(.77,.87,p.y));
    q.x+=(sin(p.y*22.+time*.65)*.009+sin(p.y*51.-time*.6)*.003)*valley;
    q.y+=sin(p.x*12.+time*.7)*.004*valley;
    float mist=noise(vec2(p.x*8.-time*.22,p.y*17.+time*.12));
    mist=mix(mist,noise(vec2(p.x*17.+time*.1,p.y*30.-time*.1)),.28);
    light=vec3(.4,.46,.46)*smoothstep(.35,.85,mist)*valley*.30;
    float waterfall=pow(max(0.,sin(p.y*65.-time*3.+p.x*22.)),9.)*edge*upper;
    light+=vec3(.23,.16,.055)*waterfall*.35;
  }
  vec3 color=texture2D(painting,clamp(q,vec2(.001),vec2(.999))).rgb;
  // Bright paint catches the light; dark negative space stays quiet for notes.
  light*=.25+smoothstep(.10,.65,max(color.r,max(color.g,color.b)));
  gl_FragColor=vec4(color+light,1.);
}
`;

export function createArtMapMotion(canvas, image, id, { onReady = () => {}, onFailure = () => {} } = {}) {
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
    uniforms = Object.fromEntries(['time', 'scene', 'cropScale', 'cropOffset'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.uniform1f(uniforms.scene, ART_MAP_MOTION[id] ?? 0);
    resize(); draw(); onReady();
    observer = new view.ResizeObserver(() => { resize(); draw(); }); observer.observe(canvas);
    if (view.IntersectionObserver) { visibilityObserver = new view.IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; sync(); }); visibilityObserver.observe(canvas); }
    owner.addEventListener('visibilitychange', sync); canvas.addEventListener('webglcontextlost', lost);
  } catch (error) { dispose(); onFailure(error); return null; }
  return { setActive(value) { active = value; sync(); }, dispose };
}
