// Bend phase is authored per rhythmic event; it never changes the event clock.
export function bendSemitones(effect,progress){
 if(!effect)return 0;const t=Math.max(0,Math.min(1,progress)),a=effect.amount;
 return effect.phase==='prebend'?a:effect.phase==='hold'?(effect.fromAmount??a):effect.phase==='release'?(effect.fromAmount??a)*(1-t):effect.phase==='up-release'?a*(t<=.5?t*2:(1-t)*2):a*t;
}
export function expressionCents(expression,time){
 const t=Math.max(0,Math.min(expression.duration,time-expression.start));
 const bend=bendSemitones(expression.bendEffect,t/expression.duration)*100;
 const vibrato=expression.vibrato?Math.sin(t*Math.PI*2*5.5)*18*Math.max(0,Math.min(1,t/.08,(expression.duration-t)/.04)):0;
  const progress=t/expression.duration,slideWindow=Math.min(.075,expression.duration*.3)/expression.duration;
 const outgoing=expression.slideOut?(expression.slideOut==='up'?1:-1)*300*Math.max(0,(progress-(1-slideWindow))/slideWindow):0;
 const incoming=expression.slideIn?(expression.slideIn==='up'?-1:1)*300*Math.max(0,1-progress/slideWindow):0;
 return bend+vibrato+outgoing+incoming;
}
export function scheduleScoreExpressions(source,phrase,when){
 const expressions=(phrase.segments??[phrase]).flatMap(s=>s.expressions??[{start:s.start,duration:s.duration,vibrato:s.vibrato,bendEffect:s.bendEffect}]);
 for(const expression of expressions){
  const start=Math.max(expression.start,phrase.start),end=Math.min(expression.start+expression.duration,phrase.start+phrase.duration),length=end-start;if(length<=0)continue;
  const at=when+start-phrase.start;
  if(!expression.vibrato&&!expression.bendEffect&&!expression.slideOut&&!expression.slideIn){source.detune.setValueAtTime(0,at);continue;}
  const curve=new Float32Array(Math.max(16,Math.ceil(length*120)));
  for(let i=0;i<curve.length;i++)curve[i]=expressionCents(expression,start+i/(curve.length-1)*length);
  // Leave a sub-sample guard against floating-point overlap at adjacent boundaries.
  source.detune.setValueCurveAtTime(curve,at,Math.max(length*.999999,length-1e-7));
 }
}

export function maximumBend(phrase){return Math.max(0,...(phrase.segments??[phrase]).flatMap(s=>(s.expressions??[]).map(e=>Math.max(e.bendEffect?.amount??0,e.bendEffect?.fromAmount??0)+(e.slideOut==='up'||e.slideIn==='down'?3:0))));}
