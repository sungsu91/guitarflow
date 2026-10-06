// This shader only sees a transparent cloth sprite. The scenery cannot be warped:
// it is a separate, stationary <img>, not a texture available to this program.
export const artMapObjectFragment = `
precision highp float;
varying vec2 uv;
uniform sampler2D cloth;
uniform vec2 cropScale;
uniform vec2 cropOffset;
uniform float time;
uniform float scene;
uniform vec4 clothLeft;
uniform vec4 clothRight;
uniform vec4 pool;
uniform vec4 moon;
const float PI=3.14159265;
const float TAU=6.2831853;

vec4 streamer(vec2 p,vec4 rect,float phase,float mirror) {
  if(rect.z<=0.) return vec4(0.);
  vec2 q=(p-rect.xy)/rect.zw;
  if(q.y<0. || q.y>1.) return vec4(0.);
  float freeEnd=pow(q.y,.75);
  // The attachment stays put; travelling folds move the free cloth silhouette.
  float bend=(sin(q.y*6.5-time*1.45+phase)*.12
    +sin(q.y*14.-time*2.1+phase)*.025)*freeEnd;
  q.x-=bend;
  q.x=.5+(q.x-.5)/(1.+sin(q.y*9.-time*1.45+phase)*.07*freeEnd);
  if(mirror>.5) q.x=1.-q.x;
  if(q.x<0. || q.x>1.) return vec4(0.);
  vec4 color=texture2D(cloth,q);
  color.rgb*=.94+.075*sin(q.y*9.-time*1.45+phase);
  return color;
}

vec4 water(vec2 p) {
  if(pool.z<=0.) return vec4(0.);
  vec2 q=(p-pool.xy)/pool.zw;
  if(q.x<0. || q.x>1. || q.y<0. || q.y>1.) return vec4(0.);
  float edge=smoothstep(0.,.12,q.y)*(1.-smoothstep(.82,1.,q.y));
  float rings=0.;
  for(int i=0;i<5;i++) {
    float n=float(i), progress=fract(time*.25+n*.217);
    vec2 origin=vec2(pool.x+pool.z*(.12+n*.188),pool.y+pool.w*(.4+.22*sin(n*3.)));
    vec2 delta=(p-origin)*vec2(1.,12.);
    float radius=.006+progress*.070;
    float rim=1.-smoothstep(.0007,.0018,abs(length(delta)-radius));
    float echo=1.-smoothstep(.0005,.0012,abs(length(delta)-radius*.75));
    rings+=(rim+echo*.35)*sin(progress*PI)*.65;
  }
  float reflection=pow(max(0.,sin(p.x*220.+sin(p.y*750.-time*1.5)*2.)),16.)*.1;
  return vec4(.78,.93,1.,min(.65,rings+reflection)*edge);
}

vec4 lunarOrbit(vec2 p) {
  if(moon.z<=0.) return vec4(0.);
  vec2 q=(p-moon.xy)/moon.zw;
  float radius=length(q), angle=atan(q.y,q.x);
  if(radius<.94 || radius>1.16) return vec4(0.);
  float light=0.;
  for(int i=0;i<4;i++) {
    float n=float(i), orbit=1.045+.018*sin(n*2.);
    float trail=mod(angle-time*(.23+n*.018)+n*TAU/4.+TAU*4.,TAU);
    float stroke=exp(-pow((radius-orbit)*110.,2.));
    light+=stroke*exp(-trail*5.5)*.95;
    float head=exp(-pow(trail*32.,2.))*exp(-pow((radius-orbit)*65.,2.));
    light+=head*.8;
  }
  return vec4(1.,.80,.38,min(.95,light));
}

void main() {
  vec2 p=uv*cropScale+cropOffset;
  if(scene<.5) gl_FragColor=water(p);
  else if(scene<1.5) {
    vec4 a=streamer(p,clothLeft,0.,0.),b=streamer(p,clothRight,2.1,1.);
    float alpha=a.a+b.a*(1.-a.a);
    gl_FragColor=vec4((a.rgb*a.a+b.rgb*b.a*(1.-a.a))/max(alpha,.0001),alpha);
  } else gl_FragColor=lunarOrbit(p);
}
`;
