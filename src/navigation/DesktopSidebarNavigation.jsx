import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {
  AudioLines,
  ChevronDown,
  CircleHelp,
  Gamepad2,
  Grid3X3,
  Music2,
  Moon,
  Radio,
  Settings,
  Sun,
  Timer,
  Volume2,
} from "lucide-react";
import MetronomeVolumeControl from "../components/MetronomeVolumeControl.jsx";
import LanguageSettings from '../i18n/LanguageSettings.jsx';

function InstagramMark({ size = 18 }) {
  return (
    <svg fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
      <rect height="18" rx="5" stroke="currentColor" strokeWidth="2" width="18" x="3" y="3" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.7" fill="currentColor" r="1.1" />
    </svg>
  );
}

function DesktopSidebarItem({ active = false, icon: Icon, index, label, mark = "", onClick, tone = "" }) {
  useLanguage();
  const toneClassName = tone ? ` desktopSidebarNavItem--${tone}` : "";
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`desktopSidebarNavItem${toneClassName}${active ? " is-active" : ""}`}
      onClick={onClick}
      type="button"
    >
      {index ? (
        <span className="desktopSidebarIndex" aria-hidden="true">{index}</span>
      ) : (
        <span className="desktopSidebarIcon" aria-hidden="true"><Icon size={18} /></span>
      )}
      <span className="desktopSidebarLabel">{localizeUi(label)}</span>
      {mark ? (
        <span className={`desktopSidebarStatusLogo desktopSidebarStatusLogo--${tone || "neutral"}`}>
          {mark}
        </span>
      ) : null}
    </button>
  );
}

function DesktopSidebarSectionHeading({ children }) {
  return (
    <div className="desktopSidebarSectionHeading">
      <span aria-hidden="true" />
      <h2>{children}</h2>
      <span aria-hidden="true" />
    </div>
  );
}

export default function DesktopSidebarNavigation({
  activeKey,
  appTheme,
  audioStudioEnabled,
  backingVolumeControls,
  commitBackingVolumeInput,
  getBackingVolumeValue,
  handleBackingVolumeInput,
  accompanimentControlsDisabled = false,
  onOpenAudioStudio,
  onOpenEtudes,
  onOpenFretboard,
  onOpenHelp,
  onOpenMetronome,
  onOpenMiniChord,
  onOpenRhythm,
  onOpenRhythmSettings,
  onOpenScale,
  onOpenShooter,
  onOpenSingleNote,
  onOpenTuner,
  onResetSound,
  inputControls,
  onSelectTheme,
  themeOptions,
  themeTransitionActive,
  versionLabel,
}) {
  useLanguage();
  return (
    <aside className="desktopSidebar" aria-label={translateUi("navigation.fretivaLabDesktopNavigation")}>
      <div className="desktopSidebarBrand" aria-label={translateUi("originalUi.fretivaLab")}>
        <span aria-hidden="true"><Translation id="originalUi.fl" /></span>
        <div>
          <strong><Translation id="originalUi.fretivaLab" /></strong>
          <small><Translation id="originalUi.guitarPracticeSystem" /></small>
        </div>
      </div>

      <nav className="desktopSidebarNav" aria-label={translateUi("navigation.mainScreens")}>
        <div className="desktopSidebarGroup">
          <DesktopSidebarItem active={activeKey === "tuner"} icon={Radio} label={translateUi("menu.tuner")} onClick={onOpenTuner} />
          <DesktopSidebarItem active={activeKey === "fretboard"} icon={Grid3X3} label={translateUi("menu.fretboard")} onClick={onOpenFretboard} />
          <DesktopSidebarItem active={activeKey === "metronome"} icon={Timer} label={translateUi("menu.metronome")} onClick={onOpenMetronome} />
          <DesktopSidebarItem active={activeKey === "shooter"} icon={Gamepad2} label={translateUi("menu.shooter")} onClick={onOpenShooter} />
        </div>

        <DesktopSidebarSectionHeading><Translation id="app.practiceCourses" /></DesktopSidebarSectionHeading>

        <div className="desktopSidebarGroup">
          <DesktopSidebarItem active={activeKey === "stage1"} index="①" label={translateUi("app.singleNotes")} mark={translateUi("app.beginner")} onClick={onOpenSingleNote} tone="beginner" />
          <DesktopSidebarItem active={activeKey === "stage2"} index="②" label={translateUi("app.scalesPentatonics")} mark="SOLO" onClick={onOpenScale} tone="solo" />
          <DesktopSidebarItem active={activeKey === "stage3"} index="③" label={translateUi("navigation.rhythmChords")} mark="HOT •" onClick={onOpenRhythm} tone="rhythm" />
          <DesktopSidebarItem active={activeKey === "etudes"} icon={Music2} label={translateUi("app.scorePractice")} mark="PRO" onClick={onOpenEtudes} tone="arranger" />
        </div>

        <DesktopSidebarSectionHeading><Translation id="app.backingEditing" /></DesktopSidebarSectionHeading>

        <div className="desktopSidebarGroup">
          <DesktopSidebarItem
            active={activeKey === "mini-chord"}
            icon={Music2}
            label={translateUi("menu.miniBacking")}
            mark={translateUi("app.buildProgressions")}
            onClick={onOpenMiniChord}
            tone="arranger"
          />
          {audioStudioEnabled ? (
            <DesktopSidebarItem
              active={activeKey === "audio-studio"}
              icon={AudioLines}
              label={translateUi("menu.audioStudio")}
              mark={translateUi("app.quickEditing")}
              onClick={onOpenAudioStudio}
              tone="editor"
            />
          ) : null}
        </div>

        <div className="desktopSidebarDivider" role="separator" />

        <div className="desktopSidebarGroup desktopSidebarUtilityGroup">
          <details className="desktopSidebarSettings">
            <summary>
              <span className="desktopSidebarIcon" aria-hidden="true"><Volume2 size={18} /></span>
              <span className="desktopSidebarLabel"><Translation id="app.soundRhythm" /></span>
              <ChevronDown className="desktopSidebarChevron" size={16} aria-hidden="true" />
            </summary>
            <div className="desktopSidebarSoundControls">
              <LanguageSettings desktop />
              {inputControls}
              <MetronomeVolumeControl className="desktopSidebarSoundRow" />
              {backingVolumeControls.map((control) => {
                const value = getBackingVolumeValue(control.id);
                return (
                  <label className="desktopSidebarSoundRow" key={control.id}>
                    <span>
                      <strong>{localizeUi(control.label)}</strong>
                      <b data-backing-volume-value>{value}</b>
                    </span>
                    <input
                      aria-label={localizeUi(translateUi("app.value1Volume", { value1: control.label }))}
                      data-backing-volume-part={control.id}
                      defaultValue={value}
                      disabled={accompanimentControlsDisabled}
                      max="100"
                      min="0"
                      onBlur={(event) => commitBackingVolumeInput(control.id, event)}
                      onInput={(event) => handleBackingVolumeInput(control.id, event)}
                      onKeyUp={(event) => commitBackingVolumeInput(control.id, event)}
                      onPointerUp={(event) => commitBackingVolumeInput(control.id, event)}
                      step="1"
                      type="range"
                    />
                  </label>
                );
              })}
              <button
                className="desktopSidebarSubAction"
                disabled={accompanimentControlsDisabled}
                onClick={onOpenRhythmSettings}
                type="button"
              >
                <Settings size={14} aria-hidden="true" /><Translation id="app.customRhythms" /></button>
              <button
                className="desktopSidebarReset"
                disabled={accompanimentControlsDisabled}
                onClick={onResetSound}
                type="button"
              ><Translation id="app.resetSound" /></button>
            </div>
          </details>
          <DesktopSidebarItem icon={CircleHelp} label={translateUi("app.guideHelp")} onClick={onOpenHelp} />
          <a
            className="desktopSidebarNavItem desktopSidebarContact"
            href="https://www.instagram.com/sungsu91_/"
            rel="noreferrer"
            target="_blank"
          >
            <span className="desktopSidebarIcon desktopSidebarInstagramIcon" aria-hidden="true"><InstagramMark size={18} /></span>
            <span className="desktopSidebarLabel"><Translation id="app.contact" /></span>
          </a>
        </div>
      </nav>

      <footer className="desktopSidebarFooter">
        <div className="desktopSidebarThemeOptions" role="radiogroup" aria-label={translateUi("navigation.displayTheme")}>
          {themeOptions.map((option) => (
            <button
              aria-checked={appTheme === option.id}
              aria-label={localizeUi(translateUi("navigation.value1Theme", { value1: option.label }))}
              className={appTheme === option.id ? "is-active" : ""}
              disabled={themeTransitionActive}
              key={option.id}
              onClick={() => onSelectTheme(option.id)}
              role="radio"
              title={localizeUi(translateUi("navigation.value1Theme", { value1: option.label }))}
              type="button"
            >
              {option.id === "light" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
              <span>{localizeUi(option.label)}</span>
            </button>
          ))}
        </div>
        <small>{localizeUi(versionLabel)}</small>
      </footer>
    </aside>
  );
}
