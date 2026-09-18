import { setMetronomeVolume, useMetronomeVolume } from "../audio/metronomeVolumeStore.js";

export default function MetronomeVolumeControl({ className = "", label = "메트로놈" }) {
  const { volume } = useMetronomeVolume();
  const percentage = Math.round(volume * 100);
  return (
    <label className={className}>
      <span>
        <strong>{label}</strong>
        <b data-metronome-volume-value>{percentage}</b>
      </span>
      <input
        aria-label="메트로놈 볼륨"
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
