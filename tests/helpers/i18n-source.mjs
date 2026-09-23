// Existing source-contract tests inspect Korean JSX and evaluate extracted pure
// functions. Resolve presentation wrappers to their Korean resource values for
// those tests; preserve all other source code and assertions unchanged.
import { readFile as readActualFile } from 'node:fs/promises';
import { readFileSync as readActualFileSync } from 'node:fs';
import { parseSync } from 'rolldown/utils';
import ko from '../../src/i18n/locales/ko.js';
const cache=new Map();
function walk(node,visit,parents=[]){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(n=>walk(n,visit,parents));return;}if(!node.type)return;visit(node,parents);for(const value of Object.values(node))if(value&&typeof value==='object')walk(value,visit,[...parents,node]);}
export function koreanSource(source){
 if(typeof source!=='string'||!source.includes('i18n/'))return source;
 if(cache.has(source))return cache.get(source);
 const ast=parseSync('source.jsx',source).program,items=[];
 walk(ast,(node,parents)=>{
  if(node.type==='JSXElement'&&node.openingElement.name.name==='Translation')items.push({node,kind:'text',key:node.openingElement.attributes.find(a=>a.name.name==='id').value.value});
  if(node.type==='MemberExpression'&&node.object.name==='ko'&&ko[node.property.value]!==undefined)items.push({node,kind:'literal',key:node.property.value});
  if(node.type==='CallExpression'&&['translateUi','formatMessage','localizeUi'].includes(node.callee.name))items.push({node,kind:node.callee.name});
  if(node.type==='JSXExpressionContainer'&&parents.at(-1)?.type==='JSXAttribute'&&node.expression.type==='CallExpression'&&node.expression.callee.name==='translateUi'&&node.expression.arguments.length===1)items.push({node,kind:'attribute',key:node.expression.arguments[0].value});
  if(node.type==='JSXExpressionContainer'&&parents.at(-1)?.type==='JSXAttribute'&&node.expression.type==='MemberExpression'&&node.expression.object.name==='ko')items.push({node,kind:'attribute',key:node.expression.property.value});
 });
 function slice(start,end,exclude){let result=source.slice(start,end);const all=items.filter(i=>i!==exclude&&i.node.start>=start&&i.node.end<=end);const roots=all.filter(i=>!all.some(o=>o!==i&&o.node.start<=i.node.start&&o.node.end>=i.node.end));for(const i of roots.sort((a,b)=>b.node.start-a.node.start))result=result.slice(0,i.node.start-start)+render(i)+result.slice(i.node.end-start);return result;}
 function render(item){
  const {node,kind,key}=item;
  if(kind==='text')return ko[key].replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  if(kind==='literal'||kind==='attribute')return JSON.stringify(ko[key]);
  if(kind==='localizeUi')return slice(node.arguments[0].start,node.arguments[0].end,item);
  const message=kind==='translateUi'?ko[node.arguments[0].value]:ko[node.arguments[0]?.property?.value];
  if(message===undefined)return source.slice(node.start,node.end);
  const values=node.arguments[1]?.properties;
  if(!values?.length)return JSON.stringify(message);
  const escaped=message.replaceAll('\\','\\\\').replaceAll('`','\\`').replaceAll('${','\\${');
  return '`'+escaped.replace(/\{(value\d+)\}/g,(_,name)=>{const value=values.find(p=>(p.key.name??p.key.value)===name)?.value;return value?'${'+slice(value.start,value.end,item)+'}':'';})+'`';
 }
 const result=slice(0,source.length,null);
 cache.set(source,result);return result;
}
export async function readFile(...args){return koreanSource(await readActualFile(...args));}
export function readFileSync(...args){return koreanSource(readActualFileSync(...args));}
