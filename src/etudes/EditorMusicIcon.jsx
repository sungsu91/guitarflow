export default function EditorMusicIcon({kind}){
 const path={down:'M5 20V5H19V20 M5 8H19',up:'M5 5L12 21L19 5',H:'M3 14Q12 1 21 14',P:'M3 14Q12 1 21 14',S:'M3 20L21 5',tie:'M3 7Q12 22 21 7',vibrato:'M2 15Q5 3 8 15T14 15T20 15',harmonic:'M12 3L20 13L12 23L4 13Z','arpeggio-up':'M8 21Q3 19 8 16T8 11T8 6 M16 21V3 M12 7L16 3L20 7','arpeggio-down':'M8 3Q3 5 8 8T8 13T8 18 M16 3V21 M12 17L16 21L20 17',clear:'M5 5L19 19M19 5L5 19'}[kind];
 return <svg width="24" height="26" viewBox="0 0 24 26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path}/>{['H','P'].includes(kind)&&<text x="12" y="23" textAnchor="middle" fill="currentColor" stroke="none" fontSize="11">{kind}</text>}</svg>;
}
