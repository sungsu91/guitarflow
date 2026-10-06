import {pdfRepeatShapes} from './pdfRepeatDrawing.js';

export default function PdfRepeatOverlay({bars,marks,page,crop,width,height}){
 const groups=pdfRepeatShapes(bars,marks,page,crop,width,height);
 if(!groups.length)return null;
 return <svg className="pdfRepeatOverlay" aria-label="Repeat symbols" viewBox={`0 0 ${width} ${height}`} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:2,overflow:'hidden'}}>
  {groups.map(({number,shapes})=><g key={number} data-pdf-repeat-bar={number} stroke="#191919" fill="#191919">{shapes.map((shape,index)=>{
   const {type,...props}=shape;
   if(type==='line')return <line key={index} {...props}/>;
   if(type==='circle')return <circle key={index} {...props} fill={shape.fill?'#191919':'none'}/>;
   if(type==='path')return <path key={index} {...props} fill="none"/>;
   return <text key={index} x={shape.x} y={shape.y} fontSize={shape.fontSize} fontFamily="Arial, sans-serif" fontWeight="600" textAnchor={shape.anchor} stroke="none">{shape.text}</text>;
  })}</g>)}
 </svg>;
}
