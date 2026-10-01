// One concise beat-reference palette shared by practice and guide settings.
export const BEAT_SOUND_OPTIONS = [
 {id:'voice',ko:'원·투·쓰리·포',en:'One · two · three · four'},
 {id:'snare',ko:'스네어',en:'Snare'},
 {id:'tick',ko:'클릭',en:'Click'},
 {id:'rim',ko:'림샷',en:'Rimshot'},
 {id:'cowbell',ko:'카우벨',en:'Cowbell'},
];

export function normalizeBeatSound(value) {
 if(!value||value==='inherit')return 'voice';
 return BEAT_SOUND_OPTIONS.some(option=>option.id===value)?value:'snare';
}
