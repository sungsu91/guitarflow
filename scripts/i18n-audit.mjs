import fs from 'node:fs';
import ko from '../src/i18n/locales/ko.js';
import en from '../src/i18n/locales/en.js';
import {filesUnder,inspect,walk} from './i18n-inventory.mjs';
import {parseSync} from 'rolldown/utils';
const files=[...filesUnder('src'),'experiments/omr/app.jsx'].filter(file=>!file.startsWith('src/i18n/'));
const sourceKeys=new Set(Object.values(ko)), missing=[], references=[],remaining=[];
const musicalContent=/src\/(?:etudes\/(?:catalog|curriculum|curriculumRevision|openChordStudies|trackStudies|tracks|mixedTechniqueStudies|daylightFingerstyle|compositionSketch)|mini-chord\/(?:originalPracticeSongs|personalPracticeProjects))/;
for(const file of files){
 const source=fs.readFileSync(file,'utf8'),ast=parseSync(file,source).program,aliases=new Set();
 for(const node of ast.body)if(node.type==='ImportDeclaration'&&/i18n\/core\.js$/.test(node.source.value))for(const s of node.specifiers)if(s.imported?.name==='t')aliases.add(s.local.name);
 const check=(key,node)=>{if(typeof key!=='string')return;references.push({file,key});if(!Object.hasOwn(ko,key)||!Object.hasOwn(en,key))missing.push({file,key,start:node.start});};
 walk(ast,node=>{
  if(node.type==='CallExpression'&&aliases.has(node.callee.name))check(node.arguments[0]?.value,node);
  if(node.type==='MemberExpression'&&node.object.name==='ko')check(node.property.value,node);
  if(node.type==='JSXOpeningElement'&&node.name.name==='Translation')check(node.attributes.find(a=>a.name?.name==='id')?.value?.value,node);
 });
 for(const entry of inspect(file).entries){
  let classification='pending-ui-or-content-review',reason='Not approved as an exception; translation or display-boundary review is still required.';
  if(file==='src/music/noteNotation.js'){classification='exception-note-names';reason='Korean solfège is musical notation and follows the existing note-display setting.';}
  else if(musicalContent.test(file)&&['title','english','artist','composer'].includes(entry.property)){classification='exception-song-title-or-credit';reason='Authored song title/artist/composer content is preserved.';}
  else if(file==='src/AppRuntime.jsx'){classification='exception-development-probe';reason='Original Korean labels used by the DEV navigation profiler; no user-visible output.';}
  else if(/^([A-G][#b]?(?:m|M|sus|add|\d)*\(바레\))(?: chord)?$/.test(entry.value)){classification='exception-chord-identifier';reason='Existing chord catalog identity includes the Korean barre qualifier; do not change identity.';}
  else if((file==='src/etudes/pedagogy.js'&&entry.value==='코드톤 런')||(file==='src/etudes/ScoreEditor.jsx'&&entry.value==='삭제')){classification='exception-canonical-lookup-key';reason='Object lookup key for an existing category or keyboard command; preserve the identifier. The displayed label is localized separately.';}
  else if(sourceKeys.has(entry.value)){classification='canonical-resource-present';reason='Matching resource exists; canonical data/message kept unchanged. Verify its display boundary separately.';}
  remaining.push({file,line:entry.line,type:entry.type,value:entry.value,classification,reason});
 }
}
const koKeys=Object.keys(ko),enKeys=Object.keys(en);
const placeholders=text=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
const parity={ko:koKeys.length,en:enKeys.length,onlyKo:koKeys.filter(k=>!Object.hasOwn(en,k)),onlyEn:enKeys.filter(k=>!Object.hasOwn(ko,k)),placeholderMismatch:koKeys.filter(k=>placeholders(ko[k])!==placeholders(en[k]??'')),missingReferences:missing};
const classifications=Object.fromEntries([...new Set(remaining.map(e=>e.classification))].map(kind=>[kind,remaining.filter(e=>e.classification===kind).length]));
const unresolved=remaining.filter(entry=>!entry.classification.startsWith('exception-'));
const lexicalComplete=!unresolved.length&&!parity.onlyKo.length&&!parity.onlyEn.length&&!parity.placeholderMismatch.length&&!missing.length;
const report={complete:lexicalComplete,scope:'Source string and resource parity audit; browser and hardware coverage are reported separately.',productionFiles:files.length,parity,referencedKeys:new Set(references.map(r=>r.key)).size,remainingOccurrences:remaining.length,remainingUnique:new Set(remaining.map(e=>e.value)).size,classifications,remaining};
fs.writeFileSync('docs/i18n/audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,remaining:undefined},null,2));
if(parity.onlyKo.length||parity.onlyEn.length||parity.placeholderMismatch.length||missing.length)process.exitCode=1;
