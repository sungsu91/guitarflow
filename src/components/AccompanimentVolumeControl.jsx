import { Volume2 } from "lucide-react";
import { t } from "../i18n/core.js";
import { useLanguage } from "../i18n/react.jsx";
import {
  MAX_ACCOMPANIMENT_VOLUME,
  setAccompanimentVolume,
  useAccompanimentVolume,
} from "../audio/accompanimentVolumeStore.js";

export default function AccompanimentVolumeControl({ className = "" }) {
  useLanguage();
  const { volume } = useAccompanimentVolume();
  const percentage = Math.round(volume * 100);
  return (
    <label className={`${className} soundSettingsMasterRow`}>
      <span>
        <Volume2 size={16} aria-hidden="true" />
        <strong>{t("soundSettings.backingMaster")}</strong>
        <b data-accompaniment-volume-value>{percentage}</b>
      </span>
      <input
        aria-label={t("soundSettings.backingMasterVolume")}
        aria-valuetext={`${percentage}%`}
        data-accompaniment-volume
        max={MAX_ACCOMPANIMENT_VOLUME * 100}
        min="0"
        onChange={(event) => setAccompanimentVolume(event.currentTarget.valueAsNumber / 100)}
        step="1"
        style={{ "--sound-volume": `${percentage / MAX_ACCOMPANIMENT_VOLUME}%` }}
        type="range"
        value={percentage}
      />
    </label>
  );
}
