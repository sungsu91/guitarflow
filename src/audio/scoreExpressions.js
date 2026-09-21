// Bend phase is authored per rhythmic event; it never changes the event clock.
export function bendSemitones(effect,progress){
 if(!effect)return 0;const t=Math.max(0,Math.min(1,progress)),a=effect.amount;
 return effect.phase==='hold'?a:effect.phase==='release'?a*(1-t):effect.phase==='up-release'?a*(t<=.5?t*2:(1-t)*2):a*t;
}
export function expressionCents(expression,time){
 const t=Math.max(0,Math.min(expression.duration,time-expression.start));
 const bend=bendSemitones(expression.bendEffect,t/expression.duration)*100;
 const vibrato=expression.vibrato?Math.sin(t*Math.PI*2*5.5)*18*Math.max(0,Math.min(1,t/.08,(expression.duration-t)/.04)):0;
 return bend+vibrato;
}
export function scheduleScoreExpressions(source,phrase,when){
 const expressions=(phrase.segments??[phrase]).flatMap(s=>s.expressions??[{start:s.start,duration:s.duration,vibrato:s.vibrato,bendEffect:s.bendEffect}]);
 for(const expression of expressions){
  const start=Math.max(expression.start,phrase.start),end=Math.min(expression.start+expression.duration,phrase.start+phrase.duration),length=end-start;if(length<=0)continue;
  const at=when+start-phrase.start;
  if(!expression.vibrato&&!expression.bendEffect){source.detune.setValueAtTime(0,at);continue;}
  const curve=new Float32Array(Math.max(16,Math.ceil(length*120)));
  for(let i=0;i<curve.length;i++)curve[i]=expressionCents(expression,start+i/(curve.length-1)*length);
  source.detune.setValueCurveAtTime(curve,at,length);
 }
}

export function maximumBend(phrase){return Math.max(0,...(phrase.segments??[phrase]).flatMap(s=>(s.expressions??[]).map(e=>e.bendEffect?.amount??0)));}
