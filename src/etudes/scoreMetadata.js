import ko from "../i18n/locales/ko.js";
import {tuningCaption} from './scoreTuning.js';
export function scoreMetadata(document, values) {
 const title=String(values.title??'').trim(),artist=String(values.artist??'').trim(),bpm=Number(values.bpm);
 if(!title||title.length>200)throw Error(ko["etudes.enterATitleOf1200Characters"]);
 if(artist.length>200)throw Error(ko["etudes.keepTheComposerArtistWithin200Characters"]);
 if(!Number.isInteger(bpm)||bpm<30||bpm>240)throw Error(ko["etudes.enterBpmAsAWholeNumberFrom30To240"]);
 return {...document,title,artist,bpm};
}
export const scoreCredit=document=>[document.artist,`${document.bpm} BPM`,document.meter.join('/'),document.keySignature,document.tuning?tuningCaption(document):''].filter(Boolean).join(' · ');
