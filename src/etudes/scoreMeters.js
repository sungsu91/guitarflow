export function measureMeters(score){let meter=score.meter??[4,4];return score.measures.map((bar,i)=>{meter=score.document?.measures[i]?.meter??bar.meter??meter;return meter;});}
export const meterTicks=meter=>meter[0]*1920/meter[1];
export function performedMeasures(score,order){const meters=measureMeters(score);let tick=0;return order.map((bar,visit)=>{const meter=meters[bar],capacity=meterTicks(meter),item={bar,visit,meter,capacity,barStart:tick};tick+=capacity;return item;});}
export function practiceClicks(measures){return measures.flatMap(m=>Array.from({length:m.meter[0]},(_,beat)=>({tick:m.barStart+beat*1920/m.meter[1],beat,meter:m.meter,downbeat:beat===0})));}
