export function scoreMetadata(document, values) {
 const title=String(values.title??'').trim(),artist=String(values.artist??'').trim(),bpm=Number(values.bpm);
 if(!title||title.length>200)throw Error('제목을 1–200자로 입력하세요.');
 if(artist.length>200)throw Error('작곡가 / 아티스트는 200자 이내로 입력하세요.');
 if(!Number.isInteger(bpm)||bpm<30||bpm>240)throw Error('BPM은 30–240 사이의 정수로 입력하세요.');
 return {...document,title,artist,bpm};
}
export const scoreCredit=document=>[document.artist,`${document.bpm} BPM`,document.meter.join('/'),document.keySignature].filter(Boolean).join(' · ');
