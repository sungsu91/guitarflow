// Development-only runtimes. Never imported into the application bundle.
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function qualityBrowser(){
 let pw;
 if(process.env.PLAYWRIGHT_MODULE){
  const module=process.env.PLAYWRIGHT_MODULE;
  pw=await import(existsSync(module)?pathToFileURL(module).href:module);
 }
 else{
  try{pw=await import('playwright');}catch{
   const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
   if(!existsSync(bundled))throw Error('Install the development browser with npm install --no-save playwright, or set PLAYWRIGHT_MODULE.');
   pw=await import(pathToFileURL(bundled).href);
  }
 }
 const candidates=[process.env.QUALITY_BROWSER,process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':null];
 const executablePath=candidates.find(p=>p&&existsSync(p));
 return pw.chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
}
export function qualityPython(){
 if(process.env.QUALITY_PYTHON)return process.env.QUALITY_PYTHON;
 const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python',process.platform==='win32'?'python.exe':'bin/python3');
 return existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3';
}
