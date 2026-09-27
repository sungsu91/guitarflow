import React from 'react';
import {createRoot} from 'react-dom/client';
import {getIsMobileLayout} from '../layouts/mobileLayout.js';
import PrintPreviewDialog from '../printing/PrintPreviewDialog.jsx';
import ScorePrintPreview from './ScorePrintPreview.jsx';
import {t} from '../i18n/core.js';

let activePreview;
// Both entry points (practice and editor) use the same in-app preview as rhythm.
export function printEditorScore(container,title,view='both',metadata) {
 if(activePreview)return;
 if(!metadata&&!container.querySelector('[data-draw-count]'))throw Error(t('etudes.prepareADisplayableScoreFirst'));
 const mount=document.createElement('div');mount.dataset.html2canvasIgnore='true';document.body.append(mount);
 const root=createRoot(mount),mobile=getIsMobileLayout(window);
 const close=()=>{root.unmount();mount.remove();activePreview=null;};
 activePreview=close;
 root.render(React.createElement(PrintPreviewDialog,{mobile,onClose:close},React.createElement(ScorePrintPreview,{container,title,view,metadata,mobile})));
}
