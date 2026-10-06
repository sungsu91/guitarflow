export default function tabWorkerManifest(){
 return {name:'tab-worker-manifest',apply:'build',generateBundle(_,bundle){
  const files=Object.keys(bundle).filter(name=>/^assets\/geometry\.worker-[\w-]+\.js$/.test(name));
  if(files.length!==1)throw Error(`Expected one TAB geometry worker, got ${files.length}`);
  this.emitFile({type:'asset',fileName:'tab-analysis-worker.json',source:JSON.stringify({protocol:1,url:`/${files[0]}`})});
 }};
}
