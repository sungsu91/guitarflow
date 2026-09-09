import { createFaceTracker } from "./faceTracker.js";

// One small GPU pass shared by preview and recording. No CPU pixel readback,
// per-frame canvas allocation. Face landmarks arrive from a separate worker.
const processors = new WeakMap();
export const BEAUTY_LEVELS = ['끔', '자연', '뽀샤시'];
const vertex = `attribute vec2 position; varying vec2 uv;
void main(){ uv=(position+1.0)*0.5; gl_Position=vec4(position,0.0,1.0); }`;
const fragment = `precision mediump float;
uniform sampler2D frame; uniform vec2 pixel; uniform float strength;
uniform vec4 eyes[2]; uniform vec2 eyeRadii;
float eyeMask(vec2 p,vec4 eye,float radius){
  if(radius<0.001)return 0.0;
  vec2 d=(p-eye.xy)*vec2(pixel.y/pixel.x,1.0);
  vec2 local=vec2(dot(d,eye.zw),dot(d,vec2(-eye.w,eye.z)));
  return 1.0-smoothstep(0.3,1.0,length(local/vec2(max(radius,0.0001),max(radius*.48,0.0001))));
}
varying vec2 uv;
void main(){
  // Geometry is deliberately unchanged: stale landmarks must never warp a moving face.
  vec2 coord=uv;
  vec3 c=texture2D(frame,coord).rgb;
  vec3 sum=c; float total=1.0;
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) {
    vec3 n=texture2D(frame,coord+vec2(float(x),float(y))*pixel*2.5).rgb;
    vec3 delta=n-c;
    float weight=exp(-dot(delta,delta)*65.0);
    sum+=n*weight; total+=weight;
  }
  float light=dot(c,vec3(0.299,0.587,0.114));
  float cb=0.5+(c.b-light)*0.564;
  float cr=0.5+(c.r-light)*0.713;
  float skin=smoothstep(0.29,0.34,cb)*(1.0-smoothstep(0.52,0.56,cb))
    *smoothstep(0.51,0.55,cr)*(1.0-smoothstep(0.69,0.75,cr))
    *smoothstep(0.06,0.16,light)*(1.0-smoothstep(0.90,1.0,light));
  vec3 soft=mix(c,sum/total,skin*strength*0.78);
  // Lift under-eye shadows without painting over eyes or bleaching highlights.
  float underEye=max(eyeMask(coord,eyes[0],eyeRadii.x),eyeMask(coord,eyes[1],eyeRadii.y));
  float shadow=(1.0-smoothstep(0.45,0.8,light))*smoothstep(0.04,0.16,light);
  soft+=underEye*strength*shadow*0.065*vec3(1.0,0.85,0.72);
  soft+=skin*strength*0.20*soft*(1.0-soft);
  soft=mix(soft,vec3(dot(soft,vec3(.299,.587,.114))),skin*strength*.035);
  gl_FragColor=vec4(clamp(soft,0.0,1.0),1.0);
}`;

function createProcessor() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const shaders = [];
  let program, buffer, texture, tracker;
  const eyeValues = new Float32Array(8), eyeRadiusValues = new Float32Array(2);
  const dispose = () => {
    tracker?.dispose();
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
    const eyes = gl.getUniformLocation(program, 'eyes[0]'), eyeRadii = gl.getUniformLocation(program, 'eyeRadii');
    const pixel = gl.getUniformLocation(program, 'pixel');
    const amount = gl.getUniformLocation(program, 'strength');
    let lastTime = -1, lastLevel = -1, lastWidth = 0, lastHeight = 0;
    return { dispose, render(video, level) {
      if (gl.isContextLost()) return null;
      if (lastTime === video.currentTime && lastLevel === level && lastWidth === video.videoWidth && lastHeight === video.videoHeight) return canvas;
      tracker ??= createFaceTracker(video);
      const shape = tracker?.sample();
      eyeValues.fill(0); eyeRadiusValues.fill(0);
      shape?.slice(4,6).forEach((p,i)=>{eyeValues.set([p.x,p.y,p.dx,p.dy],i*4);eyeRadiusValues[i]=p.radius;});
      gl.uniform4fv(eyes,eyeValues);gl.uniform2fv(eyeRadii,eyeRadiusValues);
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
