import { memo } from "react";
import {
  CircleHelp,
  ChevronDown,
  Gauge,
  Guitar,
  Languages,
  Mic,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getDesktopHorizontalMapBackdrop } from "./desktopHorizontalMaps.js";

function HudItem({ children, label, meta = "" }) {
  return (
    <div className={`desktopHorizontalHudItem desktopHorizontalHudItem--${label.toLowerCase()}`}>
      <span>{label}</span>
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
      <div className="desktopHorizontalBattleHud" aria-label="데스크톱 슈팅게임 현재 상태">
        <HudItem label="TARGET" meta={targetPitch || "WAITING"}>{targetLabel || "—"}</HudItem>
        {mobileLandscape ? (
          <HudItem label="SIGNAL" meta="내가 친 음">{currentPitch || "—"}</HudItem>
        ) : (
          <>
            <HudItem label="BEST" meta="HIGH SCORE">{Number(bestScore || 0).toLocaleString()}</HudItem>
            <HudItem label="LEVEL" meta={levelPhase}>{level}</HudItem>
          </>
        )}
        <HudItem label="LIFE" meta={difficultyLabel}>
          <span className="desktopHorizontalLifeHearts" aria-label={`남은 목숨 ${lives}`}>
            {Array.from({ length: maxLives }, (_, index) => (
              <i className={index < lives ? "active" : ""} key={index}>♥</i>
            ))}
          </span>
        </HudItem>
        {mobileLandscape ? (
          <div className="desktopHorizontalScorePair" aria-label="가로 슈팅게임 기록">
            <span><small>BEST</small><b>{Number(bestScore || 0).toLocaleString()}</b></span>
            <span><small>현재</small><b>{Number(currentScore || 0).toLocaleString()}</b></span>
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
  difficultyOptions = [],
  difficultyValue,
  difficultyLocked,
  helpLevel,
  micActive,
  mobileLandscape = false,
  onDifficulty,
  onDifficultySelect,
  onHelpChange,
  onMic,
  onRecords,
  onSkin,
  onSolfege,
  onSound,
  recordsOpen,
  recordingEntryRef,
  solfegeOn,
  soundOn,
}) {
  return (
    <div className="desktopHorizontalBattleControls" aria-label="가로 슈팅게임 설정">
      {mobileLandscape ? (
        <label className="desktopHorizontalSelectControl">
          <Gauge aria-hidden="true" size={13} />
          <span>난이도 {difficultyLabel}</span>
          <ChevronDown aria-hidden="true" size={12} />
          <select
            aria-label="난이도 선택"
            disabled={difficultyLocked}
            onChange={(event) => onDifficultySelect?.(event.target.value)}
            value={difficultyValue}
          >
            {difficultyOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      ) : <button aria-disabled={difficultyLocked} disabled={difficultyLocked} onClick={onDifficulty} type="button">
        <Gauge aria-hidden="true" size={15} />
        난이도 {difficultyLabel}
      </button>}
      {mobileLandscape ? (
        <label className="desktopHorizontalSelectControl">
          <CircleHelp aria-hidden="true" size={13} />
          <span>도움 {helpLevel === 0 ? "OFF" : helpLevel}</span>
          <ChevronDown aria-hidden="true" size={12} />
          <select aria-label="도움 단계 선택" onChange={(event) => onHelpChange(Number(event.target.value))} value={helpLevel}>
            <option value={0}>OFF</option><option value={1}>1</option><option value={2}>2</option>
          </select>
        </label>
      ) : <button onClick={() => onHelpChange((helpLevel + 1) % 3)} type="button">
        <CircleHelp aria-hidden="true" size={15} />
        도움 {helpLevel === 0 ? "OFF" : helpLevel}
      </button>}
      {!mobileLandscape ? <button onClick={onSkin} type="button">
        <Guitar aria-hidden="true" size={16} />
        스킨 변경
      </button> : null}
      <button aria-pressed={solfegeOn} className={solfegeOn ? "selected" : ""} onClick={onSolfege} type="button">
        <Languages aria-hidden="true" size={15} />
        {solfegeOn ? "계이름 KO" : "음이름 EN"}
      </button>
      {mobileLandscape ? (
        <div className="shooterRecordingEntrySlot shooterRecordingEntrySlot--landscapeControl" ref={recordingEntryRef} />
      ) : null}
      <button aria-pressed={micActive} className={`desktopHorizontalMicButton ${micActive ? "selected" : ""}`} onClick={onMic} type="button">
        <Mic aria-hidden="true" size={13} />
        마이크 {micActive ? "ON" : "OFF"}
      </button>
      {!mobileLandscape ? <button aria-pressed={soundOn} className={soundOn ? "selected" : ""} onClick={onSound} type="button">
        {soundOn ? <Volume2 aria-hidden="true" size={15} /> : <VolumeX aria-hidden="true" size={15} />}
        효과음
      </button> : null}
      {!mobileLandscape ? <button aria-pressed={recordsOpen} className={recordsOpen ? "selected" : ""} onClick={onRecords} type="button">
        <Trophy aria-hidden="true" size={15} />
        기록
      </button> : null}
    </div>
  );
});

export default DesktopHorizontalBattleView;
