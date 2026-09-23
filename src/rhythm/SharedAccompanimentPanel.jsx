import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import { Lock, Settings, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function SharedAccompanimentVolumeSlider({ disabled, onVolumeCommit, onVolumeInput, part }) {
  useLanguage();
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
        aria-label={localizeUi(translateUi("app.value1Volume", { value1: part.label }))}
        data-backing-volume-part={part.id}
        defaultValue={part.volume}
        disabled={disabled}
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
  lockedLabel = ko["app.recommendedProgressions"],
  lockedNotice = "",
  onOpenSettings,
  onToggleAll,
  masterDisabled = false,
  onTogglePart,
  onVolumeCommit,
  onVolumeInput,
  parts = [],
}) {
  useLanguage();
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

  useEffect(() => {
    if (!disabled) return;
    setBeatValueOverrides({});
    setEnabledOverrides({});
  }, [disabled]);

  return (
    <details
      aria-disabled={disabled}
      className={`sharedAccompanimentPanel miniChordBackingPanel ${className}`.trim()}
      data-accompaniment-locked={disabled ? "true" : undefined}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      open={expanded}
      title={disabled ? translateUi("rhythm.value1BackingSoundIsFixed", { value1: lockedLabel }) : undefined}
    >
      <summary>
        <span>
          {disabled ? <Lock aria-hidden="true" size={12} /> : null}<Translation id="rhythm.backingSound" /><button
            type="button"
            className="sharedAccompanimentMasterToggle"
            aria-label={translateUi("rhythm.allBackingSoundsValue1", { value1: parts.some(part => part.enabled) ? ko["app.off"] : ko["app.on"] })}
            aria-pressed={parts.some(part => part.enabled)}
            disabled={masterDisabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleAll?.();
            }}
          >
            {parts.some(part => part.enabled) ? "ON" : "OFF"}
          </button>
        </span>
        {!hidePartSummary ? <b>{disabled ? translateUi("rhythm.value1FixedBacking", { value1: lockedLabel }) : translateUi("rhythm.drumsBassPiano")}</b> : null}
        <button
          aria-haspopup="dialog"
          className="sharedAccompanimentSettingsButton"
          disabled={disabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!disabled) onOpenSettings?.();
          }}
          type="button"
        >
          <Settings aria-hidden="true" size={13} /><Translation id="app.customRhythms" /></button>
      </summary>
      {disabled && lockedNotice ? (
        <p className="sharedAccompanimentLockNotice" role="note">
          {lockedNotice}
        </p>
      ) : null}
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
              aria-label={localizeUi(translateUi("rhythm.value1BackingSettings", { value1: part.label }))}
              className={`miniChordBackingRow miniChordBackingRow--${part.id}`}
              key={part.id}
            >
              <div className="miniChordBackingControlLine">
                <div className="miniChordPartMeter">
                  <strong>{localizeUi(part.label)}</strong>
                </div>
                <SharedAccompanimentVolumeSlider
                  disabled={disabled}
                  onVolumeCommit={onVolumeCommit}
                  onVolumeInput={onVolumeInput}
                  part={part}
                />
                <button
                  aria-label={localizeUi(`${part.label} ${enabled ? translateUi("app.off") : translateUi("app.on")}`)}
                  aria-pressed={enabled}
                  className={`miniChordPowerToggle ${enabled ? "is-on" : "is-off"}`}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
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
              <div className="miniChordBeatOptions" role="group" aria-label={localizeUi(translateUi("rhythm.chooseValue1Beat", { value1: part.label }))}>
                {part.options.map((option) => (
                  <button
                    aria-pressed={beatValue === option.id}
                    className={beatValue === option.id ? "selected" : ""}
                    disabled={disabled}
                    key={option.id}
                    onClick={() => {
                      if (disabled || beatValue === option.id) return;
                      setBeatValueOverrides((current) => ({ ...current, [part.id]: option.id }));
                      part.onBeatChange(option.id);
                    }}
                    type="button"
                  >
                    {localizeUi(option.compactLabel ?? option.label)}
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
