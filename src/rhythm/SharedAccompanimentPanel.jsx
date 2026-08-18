import { Settings, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function SharedAccompanimentVolumeSlider({ onVolumeCommit, onVolumeInput, part }) {
  const inputRef = useRef(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || (typeof document !== "undefined" && document.activeElement === input)) return;
    const nextValue = String(part.volume);
    if (input.value !== nextValue) input.value = nextValue;
  }, [part.volume]);

  return (
    <label className="miniChordVolumeRail">
      <input
        aria-label={`${part.label} 볼륨`}
        data-backing-volume-part={part.id}
        defaultValue={part.volume}
        max="100"
        min="0"
        onBlur={(event) => onVolumeCommit(part.id, event)}
        onInput={(event) => onVolumeInput(part.id, event)}
        onKeyUp={(event) => onVolumeCommit(part.id, event)}
        onPointerUp={(event) => onVolumeCommit(part.id, event)}
        ref={inputRef}
        step="1"
        type="range"
      />
    </label>
  );
}

export function SharedAccompanimentPanel({
  className = "",
  defaultExpanded = true,
  disabled = false,
  onOpenSettings,
  onTogglePart,
  onVolumeCommit,
  onVolumeInput,
  parts = [],
}) {
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded));

  return (
    <details
      className={`sharedAccompanimentPanel miniChordBackingPanel ${className}`.trim()}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      open={expanded}
    >
      <summary>
        <span>반주 사운드</span>
        <b>드럼 · 베이스 · 피아노</b>
      </summary>
      <div className="miniChordRhythmSettingsBar sharedAccompanimentSettingsBar">
        <button
          aria-haspopup="dialog"
          disabled={disabled}
          onClick={onOpenSettings}
          type="button"
        >
          <Settings aria-hidden="true" size={13} />
          리듬 사용자 설정
        </button>
      </div>
      <div className="miniChordBackingRows sharedAccompanimentRows">
        {parts.map((part) => (
          <section
            aria-label={`${part.label} 반주 설정`}
            className={`miniChordBackingRow miniChordBackingRow--${part.id}`}
            key={part.id}
          >
            <div className="miniChordBackingControlLine">
              <div className="miniChordPartMeter">
                <strong>{part.label}</strong>
              </div>
              <SharedAccompanimentVolumeSlider
                onVolumeCommit={onVolumeCommit}
                onVolumeInput={onVolumeInput}
                part={part}
              />
              <button
                aria-label={`${part.label} ${part.enabled ? "끄기" : "켜기"}`}
                aria-pressed={part.enabled}
                className={`miniChordPowerToggle ${part.enabled ? "is-on" : "is-off"}`}
                onClick={() => onTogglePart(part.id)}
                type="button"
              >
                {part.enabled
                  ? <Volume2 aria-hidden="true" size={14} />
                  : <VolumeX aria-hidden="true" size={14} />}
              </button>
            </div>
            <div className="miniChordBeatOptions" role="group" aria-label={`${part.label} 비트 선택`}>
              {part.options.map((option) => (
                <button
                  aria-pressed={part.beatValue === option.id}
                  className={part.beatValue === option.id ? "selected" : ""}
                  disabled={disabled}
                  key={option.id}
                  onClick={() => part.onBeatChange(option.id)}
                  type="button"
                >
                  {option.compactLabel ?? option.label}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </details>
  );
}
