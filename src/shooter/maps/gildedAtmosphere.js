// Local smoke and gold dust, composited over the stationary ink painting.
// Uses the existing scene clock and canvas; no extra textures or draw loop.
export const gildedAtmosphereFragment = `
vec4 gildedAtmosphere(vec2 p,vec4 field) {
  if(field.z<=0.) return vec4(0.);
  vec2 q=(p-field.xy)/field.zw;
  float radius=length(q);
  if(radius>=1.) return vec4(0.);
  float edge=1.-smoothstep(.60,1.,radius);
  // Leave a quieter opening where the notes travel through the middle.
  float quiet=1.-.88*exp(-q.x*q.x*8.-(q.y+.3)*(q.y+.3)*3.);
  vec2 flow=vec2(q.x*3.6-time*.23,q.y*5.+sin(q.x*3.-time*.6)*.55);
  float curl=fbm(flow*.8+11.);
  float cloud=fbm(flow+vec2(curl*1.8,curl*.7));
  float wisps=pow(.5+.5*sin(q.y*19.+curl*9.-time*.35),3.);
  float density=smoothstep(.25,.73,cloud)*(.62+.38*wisps);
  vec3 smokeColor=mix(vec3(.47,.49,.47),vec3(.85,.82,.72),cloud);
  vec4 smoke=vec4(smokeColor,density*edge*quiet*.64);

  // Cell noise keeps hundreds of separate flecks cheap to render.
  vec2 grid=p*(sourceSize/min(sourceSize.x,sourceSize.y))*74.;
  grid+=vec2(-time*.85+sin(p.y*21.+time*.38)*.7,time*.46);
  vec2 cell=floor(grid),local=fract(grid);
  float seed=hash(cell+41.);
  vec2 point=.18+.64*vec2(hash(cell+7.),hash(cell+23.));
  float distance=length(local-point);
  float size=mix(.055,.15,hash(cell+63.));
  float grain=1.-smoothstep(size*.25,size,distance);
  float halo=exp(-distance*distance*65.)*.17;
  float shimmer=.5+.5*pow(.5+.5*sin(time*1.65+seed*29.),2.);
  float gold=(grain+halo)*step(.77,seed)*shimmer*edge*(.3+.7*quiet);
  vec3 goldColor=mix(vec3(1.,.68,.24),vec3(1.,.91,.61),hash(cell+3.));
  return over(vec4(goldColor,min(.95,gold)),smoke);
}
`;
