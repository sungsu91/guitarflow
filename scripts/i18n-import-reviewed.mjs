// Import reviewed translations, preserving canonical values used by app logic.
import fs from 'node:fs';
import path from 'node:path';
import {parseSync} from 'rolldown/utils';
import {filesUnder,walk,jsxText} from './i18n-inventory.mjs';
import ko from '../src/i18n/locales/ko.js';
import en from '../src/i18n/locales/en.js';
const entries=JSON.parse(fs.readFileSync('docs/i18n/remaining-strings.json','utf8'));
const sourceKeys=new Map();
for(const [key,value]of Object.entries(ko))if(!sourceKeys.has(value))sourceKeys.set(value,key);
const camel=text=>text.replace(/\{value\d+\}/g,' value ').replace(/[^a-zA-Z0-9]+/g,' ').trim().split(/\s+/).slice(0,12).map((word,i)=>i?word[0].toUpperCase()+word.slice(1).toLowerCase():word.toLowerCase()).join('');
for(const line of fs.readFileSync('docs/i18n/english-remaining.tsv','utf8').split(/\r?\n/)){
 if(!line)continue;const tab=line.indexOf('\t'),index=Number(line.slice(0,tab)),english=line.slice(tab+1).replaceAll('\\n','\n'),entry=entries[index];
 if(!entry)throw Error(`Unknown reviewed entry ${index}`);
 if(sourceKeys.has(entry.value))continue;
 const namespace=camel(entry.files[0].split('/')[1]),base=`${namespace}.${camel(english)||'fractionSuffix'}`;
 let key=base;
 if(Object.hasOwn(ko,key))key+=camel(path.basename(entry.files[0],path.extname(entry.files[0]))).replace(/^./,s=>s.toUpperCase());
 if(Object.hasOwn(ko,key))key+=camel(entry.value.replace(/[^a-zA-Z0-9]/g,' ')).replace(/^./,s=>s.toUpperCase());
 if(Object.hasOwn(ko,key))throw Error(`Key collision: ${key} (${index})`);
 ko[key]=entry.value;en[key]=english;sourceKeys.set(entry.value,key);
}
for(const [locale,resource]of Object.entries({ko,en}))fs.writeFileSync(`src/i18n/locales/${locale}.js`,'// UI resources. Korean text is preserved from the pre-migration source.\nexport default '+JSON.stringify(resource,null,2)+';\n');
const changes=[];
for(const file of filesUnder('src').filter(f=>!f.startsWith('src/i18n/')&&!['src/AppRuntime.jsx','src/music/noteNotation.js'].includes(f))){
 const source=fs.readFileSync(file,'utf8'),edits=[];let needsKo=false;
 walk(parseSync(file,source).program,(node,parents)=>{
  if(node.type!=='Literal'||typeof node.value!=='string'||!/[가-힣]/.test(node.value))return;
  const key=sourceKeys.get(node.value),parent=parents.at(-1);if(!key)return;
  if(parent?.type==='Property'&&parent.key===node&&!parent.computed)return;
  if(parent?.type==='ImportDeclaration'||parent?.type==='ExportNamedDeclaration')return;
  const reference=`ko[${JSON.stringify(key)}]`;
  edits.push({start:node.start,end:node.end,text:parent?.type==='JSXAttribute'?`{${reference}}`:reference});needsKo=true;
 });
 if(!edits.length)continue;
 let result=source;for(const edit of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,edit.start)+edit.text+result.slice(edit.end);
 if(needsKo&&!/import ko from/.test(source)){let relative=path.relative(path.dirname(file),'src/i18n/locales/ko.js').replaceAll('\\','/');if(!relative.startsWith('.'))relative='./'+relative;result=`import ko from ${JSON.stringify(relative)};\n`+result;}
 fs.writeFileSync(file,result);changes.push({file,literals:edits.length});
}
fs.writeFileSync('docs/i18n/reviewed-extraction.json',JSON.stringify(changes,null,2)+'\n');
console.log('Keys:',Object.keys(ko).length,'Canonical literals extracted:',changes.reduce((sum,c)=>sum+c.literals,0));
