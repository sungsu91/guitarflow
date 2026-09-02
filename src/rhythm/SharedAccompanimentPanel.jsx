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
  hidePartSummary = false,
  onOpenSettings,
  onTogglePart,
  onVolumeCommit,
  onVolumeInput,
  parts = [],
}) {
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded));
  const [beatValueOverrides, setBeatValueOverrides] = useState({});
  const [enabledOverrides, setEnabledOverrides] = useState({});
  const beatValueKey = parts.map((part) => `${part.id}:${part.beatValue}`).join("|");
  const enabledKey = parts.map((part) => `${part.id}:${part.enabled ? 1 : 0}`).join("|");

  useEffect(() => {
    setBeatValueOverrides((current) => {
      const next = { ...current };
      let changed = false;
      parts.forEach((part) => {
        if (Object.prototype.hasOwnProperty.call(next, part.id) && next[part.id] === part.beatValue) {
          delete next[part.id];
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [beatValueKey]);

  useEffect(() => {
    setEnabledOverrides((current) => {
      const next = { ...current };
      let changed = false;
      parts.forEach((part) => {
        if (Object.prototype.hasOwnProperty.call(next, part.id) && next[part.id] === part.enabled) {
          delete next[part.id];
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [enabledKey]);

  return (
    <details
      className={`sharedAccompanimentPanel miniChordBackingPanel ${className}`.trim()}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      open={expanded}
    >
      <summary>
        <span>반주 사운드</span>
        {!hidePartSummary ? <b>드럼 · 베이스 · 피아노</b> : null}
        <button
          aria-haspopup="dialog"
          className="sharedAccompanimentSettingsButton"
          disabled={disabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onOpenSettings();
          }}
          type="button"
        >
          <Settings aria-hidden="true" size={13} />
          리듬 사용자 설정
        </button>
      </summary>
      <div className="miniChordBackingRows sharedAccompanimentRows">
        {parts.map((part) => {
          const beatValue = Object.prototype.hasOwnProperty.call(beatValueOverrides, part.id)
            ? beatValueOverrides[part.id]
            : part.beatValue;
          const enabled = Object.prototype.hasOwnProperty.call(enabledOverrides, part.id)
            ? enabledOverrides[part.id]
            : part.enabled;
          return (
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
                  aria-label={`${part.label} ${enabled ? "끄기" : "켜기"}`}
                  aria-pressed={enabled}
                  className={`miniChordPowerToggle ${enabled ? "is-on" : "is-off"}`}
                  onClick={() => {
                    setEnabledOverrides((current) => ({ ...current, [part.id]: !enabled }));
                    onTogglePart(part.id);
                  }}
                  type="button"
                >
                  {enabled
                    ? <Volume2 aria-hidden="true" size={14} />
                    : <VolumeX aria-hidden="true" size={14} />}
                </button>
              </div>
              <div className="miniChordBeatOptions" role="group" aria-label={`${part.label} 비트 선택`}>
                {part.options.map((option) => (
                  <button
                    aria-pressed={beatValue === option.id}
                    className={beatValue === option.id ? "selected" : ""}
                    disabled={disabled}
                    key={option.id}
                    onClick={() => {
                      if (beatValue === option.id) return;
                      setBeatValueOverrides((current) => ({ ...current, [part.id]: option.id }));
                      part.onBeatChange(option.id);
                    }}
                    type="button"
                  >
                    {option.compactLabel ?? option.label}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </details>
  );
}
