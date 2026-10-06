// Effects are registered to features in the painting. Cloth uses an isolated
// material surface extracted at matching coordinates; architecture is unavailable.
export const artMapObjectFragment = `
precision highp float;
varying vec2 uv;
uniform sampler2D cloth;
uniform vec2 cropScale;
uniform vec2 cropOffset;
uniform float time;
uniform float scene;
uniform vec2 sourceSize;
uniform vec4 regions[8];
uniform vec4 moon;
const float PI=3.14159265;
const float TAU=6.2831853;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 cell=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(cell),hash(cell+vec2(1.,0.)),f.x),mix(hash(cell+vec2(0.,1.)),hash(cell+vec2(1.)),f.x),f.y);
}
float fbm(vec2 p) { return noise(p)*.57+noise(p*2.03+7.)*.28+noise(p*4.07+19.)*.15; }
vec4 over(vec4 a,vec4 b) {
  float alpha=a.a+b.a*(1.-a.a);
  return vec4((a.rgb*a.a+b.rgb*b.a*(1.-a.a))/max(alpha,.0001),alpha);
}
vec4 wovenSilk(vec2 p) {
  vec4 base=texture2D(cloth,p);
  if(base.a<.002) return vec4(0.);
  float weave=sin(p.y*32.-time*1.35+sin(p.x*13.));
  float fold=cos(p.x*25.+p.y*18.-time*1.05);
  vec2 shift=vec2(weave*6.,fold*3.5)*smoothstep(.2,.95,base.a)/sourceSize;
  vec4 detail=texture2D(cloth,p+shift);
  float sheen=pow(.5+.5*sin(p.x*24.+p.y*27.-time*1.15),5.);
  // The original embroidery supplies the color and detail; no unrelated ribbon.
  vec3 color=detail.rgb*(.96+.075*fold)+vec3(.12,.085,.035)*sheen;
  return vec4(color,base.a*detail.a*.98);
}
vec4 beacon(vec2 p,vec4 anchor) {
  if(anchor.z<=0.) return vec4(0.);
  vec2 q=vec2((p.x-anchor.x)/anchor.z,(anchor.y-p.y)/anchor.w);
  if(abs(q.x)>1.25 || q.y<-.18 || q.y>1.15) return vec4(0.);
  float cycle=.3+.7*pow(.5+.5*sin(time*.85),2.);
  float rise=clamp(q.y,0.,1.);
  float turbulence=fbm(vec2(q.x*3.,q.y*6.-time*2.5));
  float sway=sin(q.y*8.-time*2.)*.12*rise;
  float width=pow(1.-rise,.72)*(.49+.2*turbulence);
  float fire=smoothstep(-.1,.18,width-abs(q.x+sway)+(turbulence-.5)*.33);
  fire*=smoothstep(-.04,.10,q.y)*(1.-smoothstep(.85,1.05,q.y));
  float glow=exp(-q.x*q.x*3.-(q.y-.3)*(q.y-.3)*3.5)*.28;
  float bounds=(1.-smoothstep(1.02,1.25,abs(q.x)))*smoothstep(-.18,-.02,q.y)*(1.-smoothstep(1.,1.15,q.y));
  vec3 hue=mix(vec3(1.,.52,.13),vec3(1.,.96,.70),pow(fire,.6));
  return vec4(hue,(fire*.78+glow)*cycle*bounds);
}
vec4 fallingWater(vec2 p,vec4 path,float index) {
  if(path.w<=path.y) return vec4(0.);
  float t=(p.y-path.y)/(path.w-path.y);
  if(t<0. || t>1.) return vec4(0.);
  float bend=index<2.?(index<.5?.014:-.014):0.;
  float center=mix(path.x,path.z,t)+sin(t*PI)*bend;
  float width=index<2.?.012:(index<4.?.013:.007);
  float u=(p.x-center)/width;
  if(abs(u)>1.) return vec4(0.);
  float grain=fbm(vec2(u*4.+index*7.,t*12.-time*1.9));
  float threads=pow(.5+.5*sin(u*29.+grain*5.),5.);
  float drops=smoothstep(.22,.78,noise(vec2(u*13.+index,t*38.-time*5.2)));
  float mask=(1.-smoothstep(.55,1.,abs(u)))*smoothstep(0.,.08,t)*(1.-smoothstep(.96,1.,t));
  return vec4(.79,.90,.94,(.12+threads*.22+drops*.18)*mask);
}
vec4 valleyFog(vec2 p,vec4 volume,float index) {
  if(volume.z<=0.) return vec4(0.);
  vec2 q=(p-volume.xy)/volume.zw;
  float distance=length(q);
  if(distance>=1.) return vec4(0.);
  // The volume is fixed among the peaks. Only vapor inside it is advected.
  vec2 flow=vec2(q.x*3.6-time*(.10+index*.009),q.y*3.+time*.035);
  float cloud=fbm(flow+index*8.);
  float detail=fbm(flow*1.7+vec2(time*.06,0.));
  float density=smoothstep(.26,.75,cloud*.75+detail*.25);
  float mask=1.-smoothstep(.30,1.,distance);
  vec3 color=mix(vec3(.58,.64,.64),vec3(.82,.85,.82),cloud);
  return vec4(color,density*mask*.56);
}

vec4 water(vec2 p,vec4 pool) {
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
  if(scene<.5) {
    vec4 result=water(p,regions[7]);
    result=over(fallingWater(p,regions[1],0.),result);
    result=over(fallingWater(p,regions[2],1.),result);
    result=over(fallingWater(p,regions[3],2.),result);
    result=over(fallingWater(p,regions[4],3.),result);
    result=over(fallingWater(p,regions[5],4.),result);
    result=over(fallingWater(p,regions[6],5.),result);
    gl_FragColor=over(beacon(p,regions[0]),result);
  } else if(scene<1.5) gl_FragColor=wovenSilk(p);
  else {
    vec4 result=lunarOrbit(p);
    result=over(valleyFog(p,regions[0],0.),result);
    result=over(valleyFog(p,regions[1],1.),result);
    result=over(valleyFog(p,regions[2],2.),result);
    result=over(valleyFog(p,regions[3],3.),result);
    result=over(valleyFog(p,regions[4],4.),result);
    gl_FragColor=over(valleyFog(p,regions[5],5.),result);
  }
}
`;
