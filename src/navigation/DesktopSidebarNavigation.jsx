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
      <span className="desktopSidebarLabel">{label}</span>
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
  onSelectTheme,
  themeOptions,
  themeTransitionActive,
  versionLabel,
}) {
  return (
    <aside className="desktopSidebar" aria-label="FRETIVA LAB 데스크톱 내비게이션">
      <div className="desktopSidebarBrand" aria-label="FRETIVA LAB">
        <span aria-hidden="true">FL</span>
        <div>
          <strong>FRETIVA LAB</strong>
          <small>GUITAR PRACTICE SYSTEM</small>
        </div>
      </div>

      <nav className="desktopSidebarNav" aria-label="주요 화면">
        <div className="desktopSidebarGroup">
          <DesktopSidebarItem active={activeKey === "tuner"} icon={Radio} label="튜너" onClick={onOpenTuner} />
          <DesktopSidebarItem active={activeKey === "fretboard"} icon={Grid3X3} label="지판 보기" onClick={onOpenFretboard} />
          <DesktopSidebarItem active={activeKey === "metronome"} icon={Timer} label="메트로놈" onClick={onOpenMetronome} />
          <DesktopSidebarItem active={activeKey === "shooter"} icon={Gamepad2} label="슈팅게임" onClick={onOpenShooter} />
        </div>

        <DesktopSidebarSectionHeading>연습 코스</DesktopSidebarSectionHeading>

        <div className="desktopSidebarGroup">
          <DesktopSidebarItem active={activeKey === "stage1"} index="①" label="단일 음 위치 익히기" mark="초보 ★" onClick={onOpenSingleNote} tone="beginner" />
          <DesktopSidebarItem active={activeKey === "stage2"} index="②" label="스케일 · 펜타토닉" mark="SOLO" onClick={onOpenScale} tone="solo" />
          <DesktopSidebarItem active={activeKey === "stage3"} index="③" label="리듬 코드 전환" mark="HOT •" onClick={onOpenRhythm} tone="rhythm" />
          <DesktopSidebarItem active={activeKey === "etudes"} icon={Music2} label="에튀드 스튜디오" mark="PRO" onClick={onOpenEtudes} tone="arranger" />
        </div>

        <DesktopSidebarSectionHeading>반주 · 편집</DesktopSidebarSectionHeading>

        <div className="desktopSidebarGroup">
          <DesktopSidebarItem
            active={activeKey === "mini-chord"}
            icon={Music2}
            label="미니반주"
            mark="진행 구성"
            onClick={onOpenMiniChord}
            tone="arranger"
          />
          {audioStudioEnabled ? (
            <DesktopSidebarItem
              active={activeKey === "audio-studio"}
              icon={AudioLines}
              label="오디오 스튜디오"
              mark="간편 편집"
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
              <span className="desktopSidebarLabel">사운드 및 리듬 설정</span>
              <ChevronDown className="desktopSidebarChevron" size={16} aria-hidden="true" />
            </summary>
            <div className="desktopSidebarSoundControls">
              <MetronomeVolumeControl className="desktopSidebarSoundRow" />
              {backingVolumeControls.map((control) => {
                const value = getBackingVolumeValue(control.id);
                return (
                  <label className="desktopSidebarSoundRow" key={control.id}>
                    <span>
                      <strong>{control.label}</strong>
                      <b data-backing-volume-value>{value}</b>
                    </span>
                    <input
                      aria-label={`${control.label} 볼륨`}
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
                <Settings size={14} aria-hidden="true" />
                리듬 사용자 설정
              </button>
              <button
                className="desktopSidebarReset"
                disabled={accompanimentControlsDisabled}
                onClick={onResetSound}
                type="button"
              >
                사운드 초기화
              </button>
            </div>
          </details>
          <DesktopSidebarItem icon={CircleHelp} label="사용설명서 & 도움말" onClick={onOpenHelp} />
          <a
            className="desktopSidebarNavItem desktopSidebarContact"
            href="https://www.instagram.com/sungsu91_/"
            rel="noreferrer"
            target="_blank"
          >
            <span className="desktopSidebarIcon desktopSidebarInstagramIcon" aria-hidden="true"><InstagramMark size={18} /></span>
            <span className="desktopSidebarLabel">문의하기</span>
          </a>
        </div>
      </nav>

      <footer className="desktopSidebarFooter">
        <div className="desktopSidebarThemeOptions" role="radiogroup" aria-label="화면 테마">
          {themeOptions.map((option) => (
            <button
              aria-checked={appTheme === option.id}
              aria-label={`${option.label} 테마`}
              className={appTheme === option.id ? "is-active" : ""}
              disabled={themeTransitionActive}
              key={option.id}
              onClick={() => onSelectTheme(option.id)}
              role="radio"
              title={`${option.label} 테마`}
              type="button"
            >
              {option.id === "light" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        <small>{versionLabel}</small>
      </footer>
    </aside>
  );
}
