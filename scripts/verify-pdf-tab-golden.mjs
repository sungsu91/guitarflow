import {readFile} from 'node:fs/promises';
import {golden,laterGolden,verifyBar} from '../tests/fixtures/pdf-tab-golden.mjs';
const d=JSON.parse(await readFile(process.argv[2]||'artifacts/pdf-tab-100/final/4-document.json'));
for(let i=0;i<4;i++)verifyBar(d.measures[i].events,golden[i]);
for(const [bar,expected] of laterGolden)verifyBar(d.measures[bar-1].events,expected);
console.log('9 manually transcribed source bars match frets and complete rhythms:',[1,2,3,4,...laterGolden.keys()]);
