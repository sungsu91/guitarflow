import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { useLanguage } from "./../i18n/react.jsx";
import { setMetronomeVolume, useMetronomeVolume } from "../audio/metronomeVolumeStore.js";

export default function MetronomeVolumeControl({ className = "", label = ko["menu.metronome"] }) {
  useLanguage();
  const { volume } = useMetronomeVolume();
  const percentage = Math.round(volume * 100);
  return (
    <label className={className}>
      <span>
        <strong>{localizeUi(label)}</strong>
        <b data-metronome-volume-value>{percentage}</b>
      </span>
      <input
        aria-label={translateUi("components.metronomeVolume")}
        data-metronome-volume
        max="100"
        min="0"
        onChange={(event) => setMetronomeVolume(event.currentTarget.valueAsNumber / 100)}
        step="1"
        type="range"
        value={percentage}
      />
    </label>
  );
}
