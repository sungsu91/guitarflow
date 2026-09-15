export const SCORE_FILE_ACCEPT='.json,application/json,.pdf,application/pdf';
export const isPdfScoreFile=file=>file?.type==='application/pdf'||/\.pdf$/i.test(file?.name??'');
