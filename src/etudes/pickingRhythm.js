import {ticksOf} from './scoreModel.js';
import {t} from '../i18n/core.js';

// A pendulum keeps moving during rests and sustained notes. The onset on
// that time grid determines its direction; the count of attacks does not.
export function pickingGrid(events,pattern,bar) {
 const grids=pattern==='rhythm-auto'?[8,16,32,64]:[Number(pattern.slice(7))];
 const aligned=(ticks,step)=>Math.abs(ticks/step-Math.round(ticks/step))<1e-6;
 const grid=grids.find(n=>events.every(e=>aligned(e.onset,1920/n)&&aligned(ticksOf(e),1920/n)));
 if(!grid)throw Error(t('editor.pickingGridMismatch',{value1:bar+1}));
 return 1920/grid;
}

export const rhythmicPick=(onset,step)=>Math.round(onset/step)%2===0?'down':'up';
export const pickingBeat=meter=>1920/meter[1]*(meter[1]===8&&meter[0]%3===0?3:1);
