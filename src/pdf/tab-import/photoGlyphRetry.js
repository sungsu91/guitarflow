import {TAB_IMPORT_CONFIG as C} from './config.js';
import {isFretText} from './fretText.js';

export function trustedGlyphReading(c){
 const r=c.ocr;
 return r?.agrees&&r.confidence>=C.confirmed&&!r.shapeRejected&&isFretText(r.text)
  &&!r.alternatives?.some(a=>a.text!==r.text&&isFretText(a.text)&&a.text.length===c.parts&&a.confidence>r.confidence-C.candidateMargin);
}

// The camera path cuts components between strings. A small digit's rounded
// top or foot can cross that cut. Re-read the measured surrounding pixels;
// never fill a fret from the chord, expected pattern or missing beat count.
export function acceptPhotoGlyphRetry(candidate,retry){
 if(trustedGlyphReading(candidate)||candidate.ocr?.method==='geometry-rejected'||!trustedGlyphReading(retry))return false;
 const r=retry.ocr,old=candidate.ocr;
 if(!/^[0-9]$/.test(r.text)||candidate.parts!==1)return false;
 const evidence=[old,...(old?.alternatives??[])].filter(Boolean);
 return evidence.some(e=>e.text===r.text&&e.confidence>=.75);
}
