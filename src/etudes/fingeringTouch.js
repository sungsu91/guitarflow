// A stationary underline, outside each fret glyph. No travel/tween between
// notes: the written onset decides when one underline replaces the other.
export function createFingeringTouch(node) {
  const lines=[...node.querySelectorAll('text')].map(text=>{
    const box=text.getBBox(),line=document.createElementNS('http://www.w3.org/2000/svg','line');
    for(const [key,value] of Object.entries({class:'rhythmFingeringTouch',x1:box.x,x2:box.x+box.width,y1:box.y+box.height+2,y2:box.y+box.height+2,stroke:'var(--riff-danger, #c85d54)','stroke-width':2,'stroke-linecap':'round','vector-effect':'non-scaling-stroke','pointer-events':'none','aria-hidden':'true'}))line.setAttribute(key,value);
    return {line,parent:text.parentNode};
  });
  return {
    update(active){for(const {line,parent} of lines){if(active){if(line.parentNode!==parent)parent.append(line);}else line.remove();}},
    clear(){for(const {line} of lines)line.remove();},
  };
}
