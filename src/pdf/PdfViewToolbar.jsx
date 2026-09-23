import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import MobileScoreZoom from '../components/MobileScoreZoom.jsx';
export default function PdfViewToolbar({zoom,setZoom,mobile=false,previewRoot,children}) {
  useLanguage();
 return <div className="pdfViewTools pdfViewTools--singleRow">
  {mobile?<MobileScoreZoom label="PDF" zoom={zoom} onFit={()=>setZoom(100)} previewRoot={previewRoot}/>:<select aria-label={translateUi("pdf.pdfZoom")} title={translateUi("pdf.widthAndZoom")} value={zoom} onChange={e=>setZoom(['fit','page'].includes(e.target.value)?e.target.value:Number(e.target.value))}>
   <option value="fit"><Translation id="components.fitWidth" /></option><option value="page"><Translation id="pdf.fitPage" /></option>
   {[...new Set([25,50,75,100,125,150,175,200,225,250,...(['fit','page'].includes(zoom)?[]:[zoom])])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n}%</option>)}
  </select>}
  {children}
 </div>;
}
