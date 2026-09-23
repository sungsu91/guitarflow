import { GROOVE_VOLUME_UNITY_PERCENT, setGrooveVolume, useGrooveVolume } from "../audio/grooveVolumeStore.js";

export default function GrooveVolumeControl({ className = "", label = "그루브팩" }) {
  const { volume } = useGrooveVolume();
  const percentage = Math.round(volume * GROOVE_VOLUME_UNITY_PERCENT);
  return (
    <label className={className}>
      <span>
        <strong>{label}</strong>
        <b data-groove-volume-value>{percentage}</b>
      </span>
      <input
        aria-label="그루브팩 볼륨"
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
