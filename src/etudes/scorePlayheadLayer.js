// Build once per engraving. Reparenting a cursor between page SVGs invalidates
// document-wide :has() styles; keep each page's pair in place instead.
export function createScorePlayheadLayer(root){
 const pairs=new Map();let active;
 for(const svg of root.querySelectorAll('svg[data-notation-view]')){
  const line=root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','line');
  for(const [name,value] of Object.entries({visibility:'hidden',stroke:'var(--riff-danger, #c85d54)','stroke-opacity':1,'stroke-width':2.5,'vector-effect':'non-scaling-stroke','pointer-events':'none','aria-hidden':'true'}))line.setAttribute(name,value);
  const wash=line.cloneNode();
  svg.append(wash,line);pairs.set(svg,{line,wash});
 }
 // SVG presentation attributes avoid the app's global [style] / :has() rules.
 const hide=()=>{if(!active)return;for(const node of [active.line,active.wash]){node.setAttribute('visibility','hidden');node.removeAttribute('class');}active=null;};
 return {
  activate(svg,visible=true){const pair=pairs.get(svg);if(!pair)return null;if(active!==pair){hide();active=pair;pair.line.setAttribute('class','savedScorePlayhead');pair.wash.setAttribute('class','savedScorePlayheadWash');}for(const node of [pair.line,pair.wash])node.setAttribute('visibility',visible?'visible':'hidden');return pair;},
  hide,
  destroy(){for(const {line,wash} of pairs.values()){line.remove();wash.remove();}pairs.clear();active=null;},
 };
}

export function highlightScoreBar(root,index){
 for(const node of root.querySelectorAll('[data-start-bar]')){
  const active=Number(node.dataset.startBar)===index;
  for(const [name,value] of Object.entries({fill:active?'rgba(190,155,98,.12)':'transparent',stroke:active?'rgba(190,155,98,.3)':'none'}))if(node.getAttribute(name)!==value)node.setAttribute(name,value);
 }
}
