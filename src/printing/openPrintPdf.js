import { getLanguage } from '../i18n/core.js';

export function mobilePrintHint() {
  return getLanguage() === 'ko'
    ? '열린 PDF의 공유 메뉴에서 프린트를 선택하세요.'
    : 'In the opened PDF, choose Print from the Share menu.';
}

// Open synchronously from the tap so iOS allows the new viewer. Giving native
// print a PDF preserves each sheet and its footer as one physical page, without
// asking mobile WebKit to paginate the preview's HTML again.
export async function openPrintPdf(createBlob, title, sourceWindow = window) {
  const ko = getLanguage() === 'ko';
  const viewer = sourceWindow.open('', '_blank');
  if (!viewer) throw Error(ko ? '팝업을 허용한 뒤 다시 인쇄해 주세요.' : 'Allow popups and try printing again.');
  const doc = viewer.document;
  doc.title = title || 'FRETIVA LAB';
  doc.documentElement.lang = ko ? 'ko' : 'en';
  const viewport = doc.createElement('meta');
  viewport.name = 'viewport'; viewport.content = 'width=device-width, initial-scale=1';
  const style = doc.createElement('style');
  style.textContent = 'body{margin:0;padding:32px 20px;background:#faf8f5;color:#211813;font:16px/1.6 system-ui}h1{font-size:20px}p{overflow-wrap:anywhere}';
  doc.head.append(viewport, style);
  const heading = doc.createElement('h1');
  heading.textContent = ko ? '인쇄용 PDF 준비 중…' : 'Preparing PDF for printing…';
  const hint = doc.createElement('p'); hint.textContent = mobilePrintHint();
  doc.body.append(heading, hint);
  let url;
  try {
    const blob = await createBlob();
    if (viewer.closed) return;
    url = sourceWindow.URL.createObjectURL(blob);
    viewer.location.replace(url);
    // Keep the PDF alive while the native viewer hands it to the share sheet.
    sourceWindow.setTimeout(() => sourceWindow.URL.revokeObjectURL(url), 300000);
  } catch (error) {
    if (url) sourceWindow.URL.revokeObjectURL(url);
    if (!viewer.closed) {
      heading.textContent = ko ? 'PDF를 준비하지 못했습니다.' : 'Could not prepare the PDF.';
      hint.textContent = ko ? '이 창을 닫고 다시 시도해 주세요.' : 'Close this window and try again.';
    }
    throw error;
  }
}
