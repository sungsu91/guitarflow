import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
const FOLLOW_PATTERNS = [
  ['line', ko["etudes.follow"]],
  ['fingering', ko["etudes.followFingering"]],
  ['off', ko["etudes.off"]],
];

export default function FollowPatternControl({ value, onChange }) {
  useLanguage();
  return <div className="etudeFollowPattern">
    <span><Translation id="etudes.rhythmProgressMode" /></span>
    <div role="group" aria-label={translateUi("etudes.rhythmProgressMode")}>
      {FOLLOW_PATTERNS.map(([next, label]) => <button
        key={next}
        type="button"
        aria-pressed={(value === 'page' ? 'line' : value) === next}
        onClick={() => onChange(next)}
      >{localizeUi(label)}</button>)}
    </div>
    {value === 'fingering' && <small><Translation id="etudes.followsNoteAndRestDurationsShowingTheCurrentNoteAndConnectedTechniques" /></small>}
  </div>;
}
