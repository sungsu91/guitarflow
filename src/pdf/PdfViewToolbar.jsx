import MobileScoreZoom from '../components/MobileScoreZoom.jsx';
export default function PdfViewToolbar({zoom,setZoom,mobile=false,previewRoot,children}) {
 return <div className="pdfViewTools pdfViewTools--singleRow">
  {mobile?<MobileScoreZoom label="PDF" zoom={zoom} onFit={()=>setZoom(100)} previewRoot={previewRoot}/>:<select aria-label="PDF 확대" title="너비·배율 조절" value={zoom} onChange={e=>setZoom(['fit','page'].includes(e.target.value)?e.target.value:Number(e.target.value))}>
   <option value="fit">너비 맞춤</option><option value="page">한 페이지 맞춤</option>
   {[...new Set([25,50,75,100,125,150,175,200,225,250,...(['fit','page'].includes(zoom)?[]:[zoom])])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n}%</option>)}
  </select>}
  {children}
 </div>;
}
