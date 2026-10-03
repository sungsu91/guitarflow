import {t} from '../../i18n/core.js';
export default function PdfTabCoverageNotice({summary}){
  return <>{Boolean(summary?.pagesWithoutTab?.length)&&<p className="pdfTabCoverageNotice" role="status">{t('editor.pdfMissingPages',{value1:summary.pagesWithoutTab.join(', ')})}</p>}{Boolean(summary?.barCountMismatches?.length)&&<p className="pdfTabCoverageNotice" role="status">{t('editor.sourceBarCountReview',{value1:summary.barCountMismatches.map(m=>`${m.page} / ${m.staff}`).join(', ')})}</p>}</>;
}
