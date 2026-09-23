import ko from "../i18n/locales/ko.js";
// Editorially ordered guitar voicings. No fret search, transposition or score.
// Each root owns its absolute frets; open strings are never moved to another root.
import preservedBadd9 from './preservedBadd9.json' with { type: 'json' };
export { preservedBadd9 };
const sources = {
 add2: 'https://www.guitar-chord.org/add2.html',
 add9: 'https://www.guitar-chord.org/add9.html',
 open: "https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf",
};
const shape = (id, frets, fingers, rootString, source, reason, barres = []) => Object.freeze({
 id, frets: Object.freeze(frets.split(' ').map(f => f === 'x' ? null : Number(f))),
 fingers: Object.freeze(fingers.split(' ')), rootString, sources: source.map(s => sources[s]), reason,
 barres: Object.freeze(barres),
 kind: frets.split(' ').includes('0') ? 'open-position' : 'movable',
});
// Closed four-string F form: documented as movable, root on string 4.
// These are explicitly reviewed placements, not open-shape transpositions.
const closed = {
 C: shape('c-d-string','x x 10 9 8 10','x x 3 2 1 4',4,['add9'],ko["chords.cPositionOfTheVerifiedMovableFourthStringRootShape"]),
 'C#': shape('db-d-string','x x 11 10 9 11','x x 3 2 1 4',4,['add9'],ko["chords.dbPositionOfTheVerifiedMovableFourthStringRootShape"]),
 D: shape('d-d-string','x x 12 11 10 12','x x 3 2 1 4',4,['add9'],ko["chords.dPositionOfTheVerifiedMovableFourthStringRootShape"]),
 'D#': shape('eb-d-string','x x 13 12 11 13','x x 3 2 1 4',4,['add9'],ko["chords.ebPositionOfTheVerifiedMovableFourthStringRootShape"]),
 E: shape('e-d-string','x x 14 13 12 14','x x 3 2 1 4',4,['add9'],ko["chords.ePositionOfTheVerifiedMovableFourthStringRootShape"]),
 F: shape('f-d-string','x x 3 2 1 3','x x 3 2 1 4',4,['add2','add9'],ko["chords.standardFShapeSharedByBothChordReferences"]),
 'F#': shape('gb-d-string','x x 4 3 2 4','x x 3 2 1 4',4,['add2','add9'],ko["chords.fGbEntryInBothReferences"]),
 G: shape('g-d-string','x x 5 4 3 5','x x 3 2 1 4',4,['add9'],ko["chords.gPositionOfTheVerifiedMovableFourthStringRootShape"]),
 'G#': shape('ab-d-string','x x 6 5 4 6','x x 3 2 1 4',4,['add2','add9'],ko["chords.crossCheckedAgainstTheAbEntryAndMovableFourthStringRootShape"]),
 A: shape('a-d-string','x x 7 6 5 7','x x 3 2 1 4',4,['add9'],ko["chords.aPositionOfTheVerifiedMovableFourthStringRootShape"]),
 'A#': shape('bb-d-string','x x 8 7 6 8','x x 3 2 1 4',4,['add9'],ko["chords.standardClosedShapeFromTheBbadd9Entry"]),
 B: shape('b-d-string','x x 9 8 7 9','x x 3 2 1 4',4,['add9'],ko["chords.bPositionOfTheVerifiedMovableFourthStringRootShape"]),
};
const c9=shape('c-open-nine','x 3 2 0 3 0','x 2 1 o 3 o',5,['add9','open'],ko["chords.userDefinedCadd9ReferenceAndOpenChordTeachingMaterial"]);
const c2=shape('c-open-two','x 3 2 0 3 3','x 2 1 o 3 4',5,['add2'],ko["chords.mainCadd2ReferenceDiagramRetainsThe3rdAndDoublesThe5th"]);
const cLow=shape('c-open-low-second','x 3 0 0 1 0','x 3 o o 1 o',5,['open'],ko["chords.openCadd2FromTeachingMaterialASecondaryOptionWithALow2nd"]);
const d9=shape('d-open-nine','x x 0 2 5 2','x x o 1 4 2',4,['open'],ko["chords.dadd2TeachingShapeAlsoUsedUnderTheAdd9NamingConvention"]);
const d2=shape('d-closed-two','x 5 4 x 5 5','x 2 1 x 3 4',5,['add2'],ko["chords.mainDadd2DiagramMuteString3"]);
const e9=shape('e-open-nine','0 2 2 1 0 2','o 2 3 1 o 4',6,['open','add9'],ko["chords.eadd9TeachingShapeFOnString1"]);
const e2=shape('e-open-two','0 2 4 1 0 0','o 2 4 1 o o',6,['open','add2'],ko["chords.eadd2TeachingShapeFOnString4"]);
const g9=shape('g-open-nine','3 2 0 2 0 3','3 1 o 2 o 4',6,['add9','add2'],ko["chords.mainGadd9Diagram320203"]);
const g2=shape('g-open-two','3 0 0 0 0 3','2 o o o o 3',6,['add2','add9'],ko["chords.alternativeOpenGFromTheReferenceUsedOnlyForGNotTransposed"]);
const a=shape('a-open-add','x 0 2 4 2 0','x o 1 4 2 o',5,['open','add9'],ko["chords.openTeachingShapeSharedByAadd2Add9NoArbitraryAlternativeFingeringGenerated"]);
const db=shape('db-five-string','x 4 3 1 4 1','x 3 2 1 4 1',5,['add9'],ko["chords.explicitShapeFromTheDbadd9Reference"],[{fret:1,fromString:3,toString:1,label:'1'}]);
const db2=shape('db-four-string','x 4 3 1 4 x','x 3 2 1 4 x',5,['add2'],ko["chords.explicitShapeFromTheDbadd2Entry"]);
const eb=shape('eb-five-string','x 6 5 3 6 3','x 3 2 1 4 1',5,['add9'],ko["chords.explicitShapeFromTheEbadd9Entry"],[{fret:3,fromString:3,toString:1,label:'1'}]);
const eb2=shape('eb-four-string','x 6 5 3 6 x','x 3 2 1 4 x',5,['add2'],ko["chords.explicitShapeFromTheEbadd2Entry"]);
const bb2=shape('bb-low','x 1 0 3 1 1','x 1 o 4 2 3',5,['add2'],ko["chords.originalBbadd2ShapeIncludingOpenDNotMovedToOtherRoots"]);
const b2=shape('b-four-string','x 2 4 6 4 x','x 1 2 4 3 x',5,['add2'],ko["chords.explicitAlternativeFromTheBadd2ReferenceItsWideStretchIsNotLabeled"]);
export const FIXED_ADD_VOICINGS = Object.freeze({
 C:{add9:[c9,c2,closed.C],add2:[c2,cLow,c9,closed.C]},
 'C#':{add9:[db,closed['C#']],add2:[db2,closed['C#']]},
 D:{add9:[d9,d2,closed.D],add2:[d2,d9,closed.D]},
 'D#':{add9:[eb,closed['D#']],add2:[eb2,closed['D#']]},
 E:{add9:[e9,e2,closed.E],add2:[e2,e9,closed.E]},
 F:{add9:[closed.F],add2:[closed.F]},
 'F#':{add9:[closed['F#']],add2:[closed['F#']]},
 G:{add9:[g9,g2,closed.G],add2:[g2,g9,closed.G]},
 'G#':{add9:[closed['G#']],add2:[closed['G#']]},
 A:{add9:[a,closed.A],add2:[a,closed.A]},
 'A#':{add9:[closed['A#'],bb2],add2:[bb2,closed['A#']]},
 B:{add2:[b2,closed.B],add9:[closed.B]}, // Cb spelling; natural Badd9 uses its protected snapshot.
});
for(const family of Object.values(FIXED_ADD_VOICINGS))for(const [key,list]of Object.entries(family))family[key]=Object.freeze(list);
export function isFixedAddFamily(quality,extension){return quality==='major'&&['add2','add9'].includes(extension);}
