import { localizeUi } from "./../../i18n/core.js";
import { t as translateUi } from "./../../i18n/core.js";
import { Translation, useLanguage } from "./../../i18n/react.jsx";
import { memo } from "react";
import {
  CircleHelp,
  ChevronDown,
  Gauge,
  Guitar,
  Languages,
  Map,
  Mic,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getDesktopHorizontalMapBackdrop } from "./desktopHorizontalMaps.js";

function HudItem({ children, label, meta = "" }) {
  useLanguage();
  return (
    <div className={`desktopHorizontalHudItem desktopHorizontalHudItem--${label.toLowerCase()}`}>
      <span>{localizeUi(label)}</span>
      <strong>{children}</strong>
      <small>{meta}</small>
    </div>
  );
}

const DesktopHorizontalBattleView = memo(function DesktopHorizontalBattleView({
  bestScore = 0,
  currentPitch,
  currentScore = 0,
  difficultyLabel,
  judgment,
  level,
  levelPhase,
  lives,
  maxLives,
  mapId,
  mobileLandscape = false,
  targetLabel,
  targetPitch,
  waterFlowActive,
}) {
  useLanguage();
  const mapBackdrop = getDesktopHorizontalMapBackdrop(mapId);
  return (
    <>
      {mapBackdrop ? (
        <div
          aria-hidden="true"
          className={`desktopHorizontalMapBackdrop desktopHorizontalMapBackdrop--${mapBackdrop.id}`}
          data-desktop-map={mapBackdrop.id}
        >
          <img
            alt=""
            className="desktopHorizontalMapBackdropImage"
            draggable="false"
            src={mapBackdrop.src}
          />
        </div>
      ) : null}
      {waterFlowActive ? (
        <div
          aria-hidden="true"
          className="desktopHorizontalWaterFlow"
          data-wave-system="gerstner-lite"
        >
          <span className="desktopHorizontalWaveLayer desktopHorizontalWaveLayer--far" />
          <span className="desktopHorizontalWaveLayer desktopHorizontalWaveLayer--mid" />
          <span className="desktopHorizontalWaveLayer desktopHorizontalWaveLayer--near" />
        </div>
      ) : null}
      <div className="desktopHorizontalBattleHud" aria-label={translateUi("shooter.desktopNoteShooterStatus")}>
        <HudItem label="TARGET" meta={targetPitch || "WAITING"}>{localizeUi(targetLabel || "—")}</HudItem>
        {mobileLandscape ? (
          <HudItem label="SIGNAL" meta={translateUi("shooter.playedNote")}>{currentPitch || "—"}</HudItem>
        ) : (
          <>
            <HudItem label="BEST" meta="HIGH SCORE">{Number(bestScore || 0).toLocaleString()}</HudItem>
            <HudItem label="LEVEL" meta={levelPhase}>{localizeUi(level)}</HudItem>
          </>
        )}
        <HudItem label="LIFE" meta={difficultyLabel}>
          <span className="desktopHorizontalLifeHearts" aria-label={translateUi("app.livesLeftValue1", { value1: lives })}>
            {Array.from({ length: maxLives }, (_, index) => (
              <i className={index < lives ? "active" : ""} key={index}>♥</i>
            ))}
          </span>
        </HudItem>
        {mobileLandscape ? (
          <div className="desktopHorizontalScorePair" aria-label={translateUi("shooter.landscapeNoteShooterStats")}>
            <span><small><Translation id="originalUi.best" /></small><b>{Number(bestScore || 0).toLocaleString()}</b></span>
            <span><small><Translation id="shooter.current" /></small><b>{Number(currentScore || 0).toLocaleString()}</b></span>
          </div>
        ) : null}
      </div>
      {judgment === "Slash" || judgment === "Success" || judgment === "Miss" ? (
        <output
          aria-live="polite"
          className={`desktopHorizontalJudgment desktopHorizontalJudgment--${judgment === "Miss" ? "miss" : "hit"}`}
        >
          {judgment === "Miss" ? "MISS" : "SLASH HIT"}
        </output>
      ) : null}
    </>
  );
});

export const DesktopHorizontalBattleControls = memo(function DesktopHorizontalBattleControls({
  difficultyLabel,
  difficultyLocked,
  helpLevel,
  micActive,
  mobileLandscape = false,
  onDifficulty,
  onHelpChange,
  onMic,
  onMap,
  onRecords,
  onSkin,
  onSolfege,
  onSound,
  recordsOpen,
  recordingEntryRef,
  solfegeOn,
  soundOn,
}) {
  useLanguage();
  return (
    <div className="desktopHorizontalBattleControls" aria-label={translateUi("shooter.landscapeNoteShooterSettings")}>
      {mobileLandscape ? (
        <button type="button" aria-haspopup="dialog" disabled={difficultyLocked} onClick={onDifficulty}>
          <Gauge aria-hidden="true" size={13} />
          <span><Translation id="shooter.difficulty" />{localizeUi(difficultyLabel)}</span>
          <ChevronDown aria-hidden="true" size={12} />
        </button>
      ) : <button aria-disabled={difficultyLocked} disabled={difficultyLocked} onClick={onDifficulty} type="button">
        <Gauge aria-hidden="true" size={15} /><Translation id="shooter.difficulty" />{localizeUi(difficultyLabel)}
      </button>}
      {mobileLandscape ? (
        <label className="desktopHorizontalSelectControl">
          <CircleHelp aria-hidden="true" size={13} />
          <span><Translation id="shooter.hints" />{helpLevel === 0 ? "OFF" : helpLevel}</span>
          <ChevronDown aria-hidden="true" size={12} />
          <select aria-label={translateUi("shooter.chooseHintLevel")} onChange={(event) => onHelpChange(Number(event.target.value))} value={helpLevel}>
            <option value={0}><Translation id="originalUi.off" /></option><option value={1}>1</option><option value={2}>2</option>
          </select>
        </label>
      ) : <button onClick={() => onHelpChange((helpLevel + 1) % 3)} type="button">
        <CircleHelp aria-hidden="true" size={15} /><Translation id="shooter.hints" />{helpLevel === 0 ? "OFF" : helpLevel}
      </button>}
      {!mobileLandscape ? <button onClick={onSkin} type="button">
        <Guitar aria-hidden="true" size={16} /><Translation id="shooter.changeSkin" /></button> : null}
      <button onClick={onMap} type="button" aria-label={translateUi("app.changeMap")}>
        <Map aria-hidden="true" size={mobileLandscape ? 13 : 15} /><Translation id="app.changeMap" /></button>
      <button aria-pressed={solfegeOn} className={solfegeOn ? "selected" : ""} onClick={onSolfege} type="button">
        <Languages aria-hidden="true" size={15} />
        {solfegeOn ? translateUi("shooter.solfeGeKo") : translateUi("shooter.noteNamesEn")}
      </button>
      {mobileLandscape ? (
        <div className="shooterRecordingEntrySlot shooterRecordingEntrySlot--landscapeControl" ref={recordingEntryRef} />
      ) : null}
      <button aria-pressed={micActive} className={`desktopHorizontalMicButton ${micActive ? "selected" : ""}`} onClick={onMic} type="button">
        <Mic aria-hidden="true" size={13} /><Translation id="shooter.microphone" />{micActive ? "ON" : "OFF"}
      </button>
      {!mobileLandscape ? <button aria-pressed={soundOn} className={soundOn ? "selected" : ""} onClick={onSound} type="button">
        {soundOn ? <Volume2 aria-hidden="true" size={15} /> : <VolumeX aria-hidden="true" size={15} />}<Translation id="shooter.soundEffects" /></button> : null}
      {!mobileLandscape ? <button aria-pressed={recordsOpen} className={recordsOpen ? "selected" : ""} onClick={onRecords} type="button">
        <Trophy aria-hidden="true" size={15} /><Translation id="shooter.history" /></button> : null}
    </div>
  );
});

export default DesktopHorizontalBattleView;
