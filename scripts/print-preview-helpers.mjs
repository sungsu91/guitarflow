// Exercise page placement through the gesture UI, without removed sliders.
export async function moveRhythmPackToPageTwo(page,mobile){
 if(mobile)await page.getByRole('button',{name:'위치 조절',exact:true}).click();
 const pack=page.locator('[data-print-section="2:0"]');await pack.scrollIntoViewIfNeeded();
 const box=await pack.boundingBox(),viewport=await page.locator('.rt-print-scroll').boundingBox();
 const x=box.x+box.width*.4,y=Math.max(box.y+15,viewport.y+20),edge=viewport.y+viewport.height-5;
 await page.mouse.move(x,y);await page.mouse.down();
 try{
  await page.mouse.move(x,edge,{steps:10});
  await page.waitForFunction(()=>document.querySelector('[data-print-section="2:0"]')?.closest('[data-print-page]').dataset.pageIndex==='1',{},{timeout:15000,polling:'raf'});
 }finally{await page.mouse.up();}
 await page.waitForFunction(()=>!document.querySelector('.rt-print-frame--draft'));
 if(mobile)await page.getByRole('button',{name:'위치 조절 완료',exact:true}).click();
 await page.getByRole('combobox',{name:'미리보기 페이지',exact:true}).selectOption('1');
}
