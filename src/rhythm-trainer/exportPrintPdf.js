// Download and mobile printing share the exact same pages, including footers.
export async function createRhythmPrintPdf(root) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
  await document.fonts.ready;
  await Promise.all([...root.querySelectorAll('img')].map(img => img.decode().catch(() => {})));
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  for (const [i, page] of [...root.querySelectorAll('.rt-print-page')].entries()) {
    const canvas = await html2canvas(page, {
      scale: 2, backgroundColor: '#ffffff', windowWidth: 1000, logging: false,
      onclone: doc => {
        doc.querySelectorAll('.rt-print-page').forEach(el => { el.style.transform = 'none'; });
        doc.querySelectorAll('.rt-print-frame').forEach(el => { el.style.width = '794px'; el.style.height = '1123px'; });
        doc.querySelectorAll('.rt-print-section').forEach(el => el.removeAttribute('data-selected'));
        doc.querySelectorAll('.rt-print-page [contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
      },
    });
    if (i) pdf.addPage();
    pdf.addImage(canvas, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    canvas.width = canvas.height = 0;
  }
  return pdf;
}
