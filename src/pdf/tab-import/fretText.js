// Canonical TAB tokens. A mute occupies a string but has no sounding fret.
export const normalizeFretText=value=>String(value??'').trim().replace(/^x$/i,'X');
export const isFretText=value=>/^(?:\d{1,2}|X)$/.test(normalizeFretText(value))&&(normalizeFretText(value)==='X'||Number(value)<=24);
