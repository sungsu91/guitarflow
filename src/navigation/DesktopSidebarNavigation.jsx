import {
  AudioLines,
  ChevronDown,
  CircleHelp,
  Gamepad2,
  Grid3X3,
  MessagesSquare,
  Moon,
  Radio,
  Settings,
  Sun,
  Timer,
  Volume2,
} from "lucide-react";

function DesktopSidebarItem({ active = false, icon: Icon, index, label, onClick }) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`desktopSidebarNavItem ${active ? "is-active" : ""}`}
      onClick={onClick}
      type="button"
    >
      {index ? (
        <span className="desktopSidebarIndex" aria-hidden="true">{index}</span>
      ) : (
        <span className="desktopSidebarIcon" aria-hidden="true"><Icon size={18} /></span>
      )}
      <span className="desktopSidebarLabel">{label}</span>
    </button>
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
  onOpenAudioStudio,
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

        <div className="desktopSidebarDivider" role="separator" />

        <div className="desktopSidebarGroup">
          <DesktopSidebarItem active={activeKey === "stage1"} index="①" label="단일 음 위치 익히기" onClick={onOpenSingleNote} />
          <DesktopSidebarItem active={activeKey === "stage2"} index="②" label="스케일 · 펜타토닉" onClick={onOpenScale} />
          <DesktopSidebarItem active={activeKey === "stage3"} index="③" label="리듬 & 코드" onClick={onOpenRhythm} />
          <DesktopSidebarItem active={activeKey === "mini-chord"} index="④" label="미니반주" onClick={onOpenMiniChord} />
        </div>

        <div className="desktopSidebarDivider" role="separator" />

        <div className="desktopSidebarGroup">
          {audioStudioEnabled ? (
            <DesktopSidebarItem
              active={activeKey === "audio-studio"}
              icon={AudioLines}
              label="오디오 스튜디오"
              onClick={onOpenAudioStudio}
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
              <button className="desktopSidebarSubAction" onClick={onOpenRhythmSettings} type="button">
                <Settings size={14} aria-hidden="true" />
                리듬 사용자 설정
              </button>
              <button className="desktopSidebarReset" onClick={onResetSound} type="button">
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
            <span className="desktopSidebarIcon" aria-hidden="true"><MessagesSquare size={18} /></span>
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
