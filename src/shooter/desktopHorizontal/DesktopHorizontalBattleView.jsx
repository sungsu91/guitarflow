import { memo } from "react";
import {
  CircleHelp,
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
  combo,
  difficultyLabel,
  judgment,
  level,
  levelPhase,
  lives,
  maxLives,
  mapId,
  score,
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
        <HudItem label="SCORE" meta="LIVE SCORE">{score.toLocaleString()}</HudItem>
        <HudItem label="COMBO" meta="CHAIN">{combo}</HudItem>
        <HudItem label="LEVEL" meta={levelPhase}>{level}</HudItem>
        <HudItem label="LIFE" meta={difficultyLabel}>
          <span className="desktopHorizontalLifeHearts" aria-label={`남은 목숨 ${lives}`}>
            {Array.from({ length: maxLives }, (_, index) => (
              <i className={index < lives ? "active" : ""} key={index}>♥</i>
            ))}
          </span>
        </HudItem>
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
  onDifficulty,
  onHelpChange,
  onMic,
  onRecords,
  onSkin,
  onSolfege,
  onSound,
  recordsOpen,
  solfegeOn,
  soundOn,
}) {
  return (
    <div className="desktopHorizontalBattleControls" aria-label="데스크톱 슈팅게임 설정">
      <button aria-disabled={difficultyLocked} disabled={difficultyLocked} onClick={onDifficulty} type="button">
        <Gauge aria-hidden="true" size={15} />
        난이도 {difficultyLabel}
      </button>
      <button onClick={() => onHelpChange((helpLevel + 1) % 3)} type="button">
        <CircleHelp aria-hidden="true" size={15} />
        도움 {helpLevel === 0 ? "OFF" : helpLevel}
      </button>
      <button onClick={onSkin} type="button">
        <Guitar aria-hidden="true" size={16} />
        스킨 변경
      </button>
      <button aria-pressed={solfegeOn} className={solfegeOn ? "selected" : ""} onClick={onSolfege} type="button">
        <Languages aria-hidden="true" size={15} />
        {solfegeOn ? "계이름 KO" : "음이름 EN"}
      </button>
      <button aria-pressed={micActive} className={micActive ? "selected" : ""} onClick={onMic} type="button">
        <Mic aria-hidden="true" size={15} />
        마이크 {micActive ? "ON" : "OFF"}
      </button>
      <button aria-pressed={soundOn} className={soundOn ? "selected" : ""} onClick={onSound} type="button">
        {soundOn ? <Volume2 aria-hidden="true" size={15} /> : <VolumeX aria-hidden="true" size={15} />}
        효과음
      </button>
      <button aria-pressed={recordsOpen} className={recordsOpen ? "selected" : ""} onClick={onRecords} type="button">
        <Trophy aria-hidden="true" size={15} />
        기록
      </button>
    </div>
  );
});

export default DesktopHorizontalBattleView;
