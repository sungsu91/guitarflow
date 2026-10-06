// Reuse the two original streamers and their device-specific placement.
export const SILK_STREAMER_SRC = '/assets/maps/silk-streamers/silk-streamer.webp';
export const SILK_STREAMER_LAYOUTS = {
  desktop: [[.14,-.055,.205,.53],[.66,-.105,.205,.56]],
  mobile: [[-.12,-.02,.43,.43],[.72,-.08,.40,.47]],
  tablet: [[.23,-.055,.19,.52],[.59,-.105,.19,.56]],
};

export const silkStreamerFragment = `
uniform sampler2D silkStreamers;
uniform vec4 streamerLeft;
uniform vec4 streamerRight;

vec4 streamer(vec2 p,vec4 rect,float phase,float mirror) {
  if(rect.z<=0.) return vec4(0.);
  vec2 q=(p-rect.xy)/rect.zw;
  if(q.y<0. || q.y>1.) return vec4(0.);
  float freeEnd=pow(q.y,.75);
  // Keep the top pinned while travelling folds move the cloth's silhouette.
  float bend=(sin(q.y*6.5-time*1.45+phase)*.12
    +sin(q.y*14.-time*2.1+phase)*.025)*freeEnd;
  q.x-=bend;
  q.x=.5+(q.x-.5)/(1.+sin(q.y*9.-time*1.45+phase)*.07*freeEnd);
  if(mirror>.5) q.x=1.-q.x;
  if(q.x<0. || q.x>1.) return vec4(0.);
  vec4 color=texture2D(silkStreamers,q);
  color.rgb*=.94+.075*sin(q.y*9.-time*1.45+phase);
  return color;
}
`;
