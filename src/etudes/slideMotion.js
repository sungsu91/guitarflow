import {rhythmStateAt} from './rhythmProgress.js';

export function slideMotionPosition(slide,tick,geometry) {
  const progress=Math.max(0,Math.min(1,(tick-slide.start)/(slide.end-slide.start||1)));
  return {progress,x:geometry.x1+(geometry.x2-geometry.x1)*progress,y:geometry.y1+(geometry.y2-geometry.y1)*progress};
}

// One overlay per engraved string/voice; follows the shared musical clock.
// No CSS-duration animation, notation reflow, or extra audio events.
export function createSlideMotion(svg,states) {
  const ns='http://www.w3.org/2000/svg';
  const overlays=[...svg.querySelectorAll('[data-slide-motion]')].map(host=>{
    const geometry=JSON.parse(host.dataset.slideMotion);
    const group=document.createElementNS(ns,'g');
    group.setAttribute('class','rhythmSlideMotion');
    group.setAttribute('pointer-events','none');group.setAttribute('aria-hidden','true');
    const trail=document.createElementNS(ns,'line');
    for(const [key,value] of Object.entries({x1:geometry.x1,y1:geometry.y1,x2:geometry.x1,y2:geometry.y1,stroke:'var(--riff-danger, #c85d54)','stroke-width':1.8,'stroke-linecap':'round','vector-effect':'non-scaling-stroke'}))trail.setAttribute(key,value);
    group.append(trail);
    return {host,geometry,group,trail};
  });
  return {
    update(tick,enabled) {
      const slides=enabled?rhythmStateAt(states,tick)?.slides??[]:[];
      for(const item of overlays) {
        const slide=slides.find(s=>s.from===item.host.dataset.slideFrom&&s.to===item.host.dataset.slideTo);
        // The notation stylesheet explicitly makes SVG lines visible, overriding
        // inherited visibility. Keep inactive motion out of the SVG altogether.
        if(!slide){item.group.remove();continue;}
        const {x,y,progress}=slideMotionPosition(slide,tick,item.geometry);
        item.group.dataset.progress=String(progress);
        const tail=Math.max(0,progress-.25);
        item.trail.setAttribute('x1',item.geometry.x1+(item.geometry.x2-item.geometry.x1)*tail);
        item.trail.setAttribute('y1',item.geometry.y1+(item.geometry.y2-item.geometry.y1)*tail);
        item.trail.setAttribute('x2',x);item.trail.setAttribute('y2',y);
        if(item.group.parentNode!==item.host)item.host.append(item.group);
      }
    },
    clear(){for(const {group} of overlays)group.remove();},
  };
}
