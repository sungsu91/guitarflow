import fs from 'node:fs';
import { parseSync } from 'rolldown/utils';
import { filesUnder, jsxText } from './i18n-inventory.mjs';
import ko from '../src/i18n/locales/ko.js';
const decode=s=>s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(match,n)=>n[0]==='#'?String.fromCodePoint(parseInt(n.slice(n[1].toLowerCase()==='x'?2:1),n[1].toLowerCase()==='x'?16:10)):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'})[n]??match);
function literal(value){return {type:'Literal',value};}
function norm(node){
 if(node==null||typeof node!=='object')return node;
 if(Array.isArray(node))return node.map(norm).filter(x=>x!==null);
 if(node.type==='ImportDeclaration'&&/i18n\//.test(node.source.value))return null;
 if(node.type==='ExpressionStatement'&&node.expression.type==='CallExpression'&&['useLanguage','syncDocumentLanguage'].includes(node.expression.callee.name))return null;
 if(node.type==='JSXElement'&&node.openingElement.name.name==='LanguageSettings')return null;
 if(node.type==='JSXElement'&&node.openingElement.name.name==='Translation')return {type:'JSXText',value:ko[node.openingElement.attributes.find(a=>a.name.name==='id').value.value]};
 if(node.type==='JSXText'){const value=decode(jsxText(node.value));return value?{type:'JSXText',value}:null;}
 if(node.type==='CallExpression'&&node.callee.name==='localizeUi')return norm(node.arguments[0]);
 if(node.type==='CallExpression'&&node.callee.name==='getLanguage')return literal('ko');
 if(node.type==='VariableDeclarator'&&node.init?.callee?.name==='useLanguage')return null;
 if(node.type==='VariableDeclaration'&&node.declarations.every(n=>n.init?.callee?.name==='useLanguage'))return null;
 if(node.type==='CallExpression'&&node.callee.property?.name==='map'&&node.arguments[0]?.name==='localizeUi')return norm(node.callee.object);
 if(node.type==='CallExpression'&&['useEffect','useLayoutEffect'].includes(node.callee.name)&&node.arguments[1]?.type==='ArrayExpression')node={...node,arguments:[node.arguments[0],{...node.arguments[1],elements:node.arguments[1].elements.filter(e=>e?.name!=='language')}]};
 if(node.type==='MemberExpression'&&node.object.name==='ko')return literal(ko[node.property.value]);
 if(node.type==='CallExpression'&&['translateUi','formatMessage'].includes(node.callee.name)){
  const message=node.callee.name==='translateUi'?ko[node.arguments[0].value]:norm(node.arguments[0]).value;
  if(message!==undefined){
   const values=node.arguments[1]?.properties??[];
   if(!values.length)return literal(message);
   const chunks=message.split(/\{value\d+\}/g),names=[...message.matchAll(/\{(value\d+)\}/g)].map(m=>m[1]);
   return {type:'TemplateLiteral',quasis:chunks.map((value,i)=>({type:'TemplateElement',value:{cooked:value},tail:i===chunks.length-1})),expressions:names.map(name=>norm(values.find(p=>(p.key.name??p.key.value)===name)?.value))};
  }
 }
 if(node.type==='TemplateLiteral'&&node.expressions.length===0)return literal(node.quasis[0].value.cooked);
 if(node.type==='JSXAttribute'){
  if(node.name?.name==='data-ui')return null; // Approved stable replacement for CSS aria-label selectors.
  const value=norm(node.value);
  return {type:node.type,name:norm(node.name),value:value?.type==='JSXExpressionContainer'&&value.expression?.type==='Literal'?value.expression:value};
 }
 const result={};
 for(const [key,value] of Object.entries(node)){
  if(['start','end','raw','loc','range','comments','hashbang','trailingComments','leadingComments','innerComments'].includes(key))continue;
  result[key]=norm(value);
 }
 if(node.type==='ConditionalExpression'&&JSON.stringify(result.consequent)===JSON.stringify(result.alternate))return result.consequent;
 if(node.type==='TemplateLiteral'&&result.expressions.every(e=>e?.type==='Literal'))return literal(result.quasis.map((q,i)=>q.value.cooked+(i<result.expressions.length?String(result.expressions[i].value):'')).join(''));
 if(node.type==='JSXElement'&&node.openingElement.name.name==='option'&&!result.openingElement.attributes.some(a=>a.name?.name==='value')&&result.children.length===1){
  const child=result.children[0], value=child.type==='JSXText'?literal(child.value):child.type==='JSXExpressionContainer'?child.expression:null;
  if(value)result.openingElement.attributes.push({type:'JSXAttribute',name:{type:'JSXIdentifier',name:'value'},value:value.type==='Literal'?value:{type:'JSXExpressionContainer',expression:value}});
 }
 return result;
}
const accessibleLabelAdditions=[];
function differences(a,b,p='',out=[]){
 if(out.length>20)return out;
 if(JSON.stringify(a)===JSON.stringify(b))return out;
 if(p.endsWith('.attributes')&&Array.isArray(a)&&Array.isArray(b)&&[...a,...b].every(n=>n.type==='JSXAttribute')){
  const before=Object.fromEntries(a.map(n=>[n.name.name,n])),after=Object.fromEntries(b.map(n=>[n.name.name,n]));
  for(const name of new Set([...Object.keys(before),...Object.keys(after)])){
   if(!before[name]&&['aria-label','title'].includes(name)){accessibleLabelAdditions.push({path:p,name,value:after[name].value});continue;}
   differences(before[name],after[name],p+'.'+name,out);
  }return out;
 }
 if(a&&b&&typeof a==='object'&&typeof b==='object'){
  for(const k of new Set([...Object.keys(a),...Object.keys(b)]))differences(a[k],b[k],p+'.'+k,out);
 }else out.push({path:p,before:a,after:b});
 return out;
}
const report=[];
for(const file of [...filesUnder('src'),'experiments/omr/app.jsx'].filter(f=>!f.startsWith('src/i18n/'))){
 const baseline=`work/i18n-baseline/${file}`;
 if(!fs.existsSync(baseline))continue;
 const before=fs.readFileSync(baseline,'utf8'),after=fs.readFileSync(file,'utf8');
 if(before===after)continue;
 const a=norm(parseSync(file,before).program),b=norm(parseSync(file,after).program);
 accessibleLabelAdditions.length=0;
 const diffs=differences(a,b);
 report.push({file,equivalent:!diffs.length,differences:diffs,accessibleLabelAdditions:[...accessibleLabelAdditions]});
}
fs.writeFileSync('docs/i18n/equivalence.json',JSON.stringify(report,null,2)+'\n');
console.log('Compared',report.length,'changed files; differences in',report.filter(r=>!r.equivalent).map(r=>r.file));
