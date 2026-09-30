import ko from '../i18n/locales/ko.js';

export const PDF_SCORE_MAX_MEASURES=512;
export const scoreMeasureLimit=document=>document?.pdfTabImport?PDF_SCORE_MAX_MEASURES:64;
export const scoreMeasureLimitMessage=document=>document?.pdfTabImport?`한 악보는 최대 ${PDF_SCORE_MAX_MEASURES}마디까지 지원합니다.`:ko['etudes.theMaximumIs64Bars'];
