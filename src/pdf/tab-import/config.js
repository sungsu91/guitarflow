import {PDF_SCORE_MAX_MEASURES} from '../../etudes/scoreLimits.js';
// All acceptance gates live here. Scores are evidence scores, not calibrated
// probabilities; changing them requires checking false positives on real PDFs.
export const TAB_IMPORT_CONFIG = Object.freeze({
  version: 1, confirmed: .95, rejected: .75, candidateMargin: .08,
  lineThreshold: 230, inkThreshold: 205, minStaffWidth: .40,
  minSpacing: 8, maxSpacing: 65, spacingTolerance: .12,
  stringTolerance: .22, slotTolerance: .38,
  renderScale: 3.5, maxPixels: 8500000, maxFileBytes: 40 * 1024 * 1024,
  maxPages: 20, maxMeasures: PDF_SCORE_MAX_MEASURES, maxCandidatesPerPage: 1800,
});
export const recognitionStatus = (score, config = TAB_IMPORT_CONFIG) =>
  score >= config.confirmed ? 'confirmed' : score >= config.rejected ? 'unresolved' : 'rejected';
