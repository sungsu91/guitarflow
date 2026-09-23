import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { useLanguage } from "./../i18n/react.jsx";
import { GROOVE_VOLUME_UNITY_PERCENT, setGrooveVolume, useGrooveVolume } from "../audio/grooveVolumeStore.js";

export default function GrooveVolumeControl({ className = "", label = ko["app.groovePacksApp"] }) {
  useLanguage();
  const { volume } = useGrooveVolume();
  const percentage = Math.round(volume * GROOVE_VOLUME_UNITY_PERCENT);
  return (
    <label className={className}>
      <span>
        <strong>{localizeUi(label)}</strong>
        <b data-groove-volume-value>{percentage}</b>
      </span>
      <input
        aria-label={translateUi("components.groovePackVolume")}
        data-groove-volume
        max="100"
        min="0"
        onChange={(event) => setGrooveVolume(event.currentTarget.valueAsNumber / GROOVE_VOLUME_UNITY_PERCENT)}
        step="1"
        type="range"
        value={percentage}
      />
    </label>
  );
}
