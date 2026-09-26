import { BEAT_PRESETS } from './model.js';

export const GUIDE_FAMILY_EN = {basic:'Basic',sixteenth:'Sixteenths',rests:'Rests & offbeats',dotted:'Dotted notes',ties:'Ties',triplet:'Triplets',tuplets:'5-, 6- & 7-note tuplets'};
const titles = {
  tie:'Tie across beats', 'compound-quarter':'Main beat · dotted quarter',
  'compound-long-short':'Quarter + eighth', 'compound-short-long':'Eighth + quarter',
  'compound-six':'Six sixteenths', 'compound-mix':'Eighth + two sixteenths + eighth',
  'compound-rest':'Eighth rest first', 'compound-mid-rest':'Eighth rest in the middle',
  'compound-end-rest':'Eighth rest last', 'compound-dotted':'Dotted eighth + sixteenth + eighth',
  'compound-tie':'Tie across main beats',
};
export function guidePatternTitle(pattern, meter, language) {
  if (language === 'ko') return pattern.title;
  if (pattern.id === 'pack-core') return pattern.title.replace(/ · 핵심 패턴$/, ' · core pattern');
  const preset = BEAT_PRESETS.find(item => item.id === pattern.id);
  if (preset) return preset.en;
  if (titles[pattern.id]) return titles[pattern.id];
  if (pattern.id === 'compound-eighths') return `${Array(parseInt(meter, 10) / 3).fill(3).join('+')} · eighth notes`;
  const tuplet = /^tuplet-(\d+)-(\d+)$/.exec(pattern.id);
  if (tuplet) return `${tuplet[1]}-note tuplet${tuplet[2] === '0' ? '' : tuplet[2] === '1' ? ' · rest first' : ' · middle rest'}`;
  const compound = /^compound-tuplet-(\d+)-(true|false)$/.exec(pattern.id);
  if (compound) return `${compound[1] === '3' ? 'Quarter-note triplet + eighth' : `${compound[1]} notes in a dotted quarter`}${compound[2] === 'true' ? ' · middle rest' : ''}`;
  return pattern.title;
}
