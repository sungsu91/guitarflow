// One small GPU pass shared by preview and recording. No CPU pixel readback,
// per-frame canvas allocation, face tracking, masks, or geometry changes.
const processors = new WeakMap();
export const BEAUTY_LEVELS = ['끔', '자연', '뽀샤시'];
const vertex = `attribute vec2 position; varying vec2 uv;
void main(){ uv=(position+1.0)*0.5; gl_Position=vec4(position,0.0,1.0); }`;
const fragment = `precision mediump float;
uniform sampler2D frame; uniform vec2 pixel; uniform float strength;
varying vec2 uv;
void main(){
  vec3 original=texture2D(frame,uv).rgb;
  vec3 blurred=vec3(0.0);
  // A uniform soft-focus kernel. No face-shaped masks can linger as the person moves.
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) {
    float weight=(x==0?2.0:1.0)*(y==0?2.0:1.0);
    blurred+=texture2D(frame,uv+vec2(float(x),float(y))*pixel*2.5).rgb*weight;
  }
  vec3 soft=mix(original,blurred/16.0,strength*0.48);
  // Gentle global midtone lift; black and white endpoints remain intact.
  soft+=strength*0.18*soft*(1.0-soft);
  float light=dot(soft,vec3(.299,.587,.114));
  soft=mix(soft,vec3(light),strength*0.025);
  gl_FragColor=vec4(clamp(soft,0.0,1.0),1.0);
}`;

function createProcessor() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const shaders = [];
  let program, buffer, texture;
  const dispose = () => {
    gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  try {
    program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type); shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Beauty shader unavailable');
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Beauty shader unavailable');
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    for (const param of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, param, gl.CLAMP_TO_EDGE);
    for (const param of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, param, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.uniform1i(gl.getUniformLocation(program, 'frame'), 0);
    const pixel = gl.getUniformLocation(program, 'pixel');
    const amount = gl.getUniformLocation(program, 'strength');
    let lastTime = -1, lastLevel = -1, lastWidth = 0, lastHeight = 0;
    return { dispose, render(video, level) {
      if (gl.isContextLost()) return null;
      if (lastTime === video.currentTime && lastLevel === level && lastWidth === video.videoWidth && lastHeight === video.videoHeight) return canvas;
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      gl.viewport(0, 0, width, height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.uniform2f(pixel, 1 / width, 1 / height);
      gl.uniform1f(amount, level === 2 ? 1.0 : 0.55);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      lastTime = video.currentTime; lastLevel = level; lastWidth = video.videoWidth; lastHeight = video.videoHeight;
      return canvas;
    } };
  } catch { dispose(); return null; }
}

export function beautyFrame(video, level) {
  if (!level || video.readyState < 2 || !video.videoWidth) return video;
  if (!processors.has(video)) processors.set(video, createProcessor());
  const processor = processors.get(video);
  try { return processor?.render(video, level) || video; }
  catch { processor?.dispose(); processors.set(video, null); return video; }
}

export function releaseBeauty(video) {
  processors.get(video)?.dispose();
  processors.delete(video);
}
