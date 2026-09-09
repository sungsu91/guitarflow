import { createSkinPipeline } from "./skinPipeline.js";
// Frame-matched face-skin processing shared by preview and recording.
const processors = new WeakMap();
export const BEAUTY_LEVELS = ['끔', '자연', '매끈'];
const vertex = `attribute vec2 position; varying vec2 uv;
void main(){ uv=(position+1.0)*0.5; gl_Position=vec4(position,0.0,1.0); }`;
const fragment = `precision mediump float;
uniform sampler2D frame; uniform sampler2D skinMask;
uniform vec2 pixel; uniform float strength;
uniform vec4 pulls[2]; uniform float radius; uniform float aspect;
varying vec2 uv;
void main(){
  // Image and mask use the same inverse coordinates so skin boundaries stay aligned.
  vec2 p=vec2(uv.x,1.0-uv.y);
  vec2 offset=vec2(0.0);
  if(radius>0.0 && strength>0.0){
    for(int i=0;i<2;i++){
      float d=length((p-pulls[i].xy)*vec2(aspect,1.0))/radius;
      float weight=1.0-smoothstep(0.0,1.0,d);
      offset+=pulls[i].zw*weight*weight*strength;
    }
  }
  p+=offset;
  vec3 c=texture2D(frame,p).rgb;
  float mask=texture2D(skinMask,p).r;
  // Erode/feather mask boundaries instead of smearing into eyes/lips/hair.
  mask=min(mask,texture2D(skinMask,p+vec2(1.0/256.0,0.0)).r);
  mask=min(mask,texture2D(skinMask,p-vec2(1.0/256.0,0.0)).r);
  mask=min(mask,texture2D(skinMask,p+vec2(0.0,1.0/256.0)).r);
  mask=min(mask,texture2D(skinMask,p-vec2(0.0,1.0/256.0)).r);
  // Most camera pixels are outside the skin ROI; skip 25 texture taps there.
  if(mask<.01 || strength<=0.0){gl_FragColor=vec4(c,1.0);return;}
  vec3 sum=vec3(0.0);float weights=0.0;
  for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++){
    vec3 n=texture2D(frame,p+vec2(float(x),float(y))*pixel*2.3).rgb;
    vec3 delta=n-c;
    float w=exp(-float(x*x+y*y)*.22-dot(delta,delta)*55.0);
    sum+=n*w;weights+=w;
  }
  float light=dot(c,vec3(.299,.587,.114));
  // Dark hair/nostrils and saturated lip colors remain sharp even inside the oval.
  float protectedDetail=smoothstep(.025,.085,light)*(1.0-smoothstep(.18,.32,c.r-c.g));
  float amount=smoothstep(.02,.95,mask)*protectedDetail*strength;
  vec3 base=sum/max(weights,.001);
  vec3 smoothSkin=mix(c,base,.78);
  // Lift skin midtones without a white overlay or blown highlights.
  smoothSkin+=vec3(.20,.19,.18)*smoothSkin*(1.0-smoothSkin);
  gl_FragColor=vec4(clamp(mix(c,smoothSkin,amount),0.0,1.0),1.0);
}`;

function createRenderer() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const shaders = [];
  let program, buffer, texture, maskTexture;
  const dispose = () => {
    gl.deleteTexture(maskTexture); gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
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
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.activeTexture(gl.TEXTURE1);
    maskTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,maskTexture);
    for(const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE);
    for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program,'skinMask'),1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(program, 'frame'), 0);
    const pixel = gl.getUniformLocation(program, 'pixel');
    const amount = gl.getUniformLocation(program, 'strength');
    const pullsUniform=gl.getUniformLocation(program,'pulls[0]');
    const radiusUniform=gl.getUniformLocation(program,'radius');
    const aspectUniform=gl.getUniformLocation(program,'aspect');
    const noPulls=new Float32Array(8);
    return { dispose, render(video, level, mask, balance) {
      if (gl.isContextLost()) throw new Error('Beauty context lost');
      const scale = Math.min(1, 1280 / Math.max(video.width, video.height));
      const width = Math.max(1, Math.round(video.width * scale));
      const height = Math.max(1, Math.round(video.height * scale));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      gl.viewport(0, 0, width, height);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,maskTexture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,256,256,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,mask);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform2f(pixel, 1 / width, 1 / height);
      gl.uniform4fv(pullsUniform,balance?.pulls || noPulls);
      gl.uniform1f(radiusUniform,balance?.radius || 0);
      gl.uniform1f(aspectUniform,video.width/video.height);
      gl.uniform1f(amount, level === 0 ? 0 : level === 2 ? 1.0 : 0.55);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return canvas;
    } };
  } catch { dispose(); return null; }
}

// Exported renderer permits deterministic mask/frame alignment tests.
export { createRenderer as createSkinRenderer };
export function beautyFrame(video, level) {
  if (!level || video.readyState < 2 || !video.videoWidth) return video;
  if (!processors.has(video)) {
    const renderer=createRenderer();
    if(!renderer){processors.set(video,null);return video;}
    const pipeline=createSkinPipeline(video,(bitmap,amount,mask,balance)=>renderer.render(bitmap,amount,mask,balance));
    processors.set(video,{frame:pipeline.frame,dispose(){pipeline.dispose();renderer.dispose();}});
  }
  return processors.get(video)?.frame(level) ?? (processors.get(video)?null:video);
}
export function releaseBeauty(video) {
  processors.get(video)?.dispose();processors.delete(video);
}
