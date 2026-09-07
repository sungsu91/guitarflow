import { useState } from "react";
import "./pitch-monitor.css";

const STATUS = {
  "no-signal": "입력 신호가 약해요",
  "no-pitch": "음 높이를 찾는 중",
  "low-confidence": "음이 불안정해요",
  "wrong-pitch": "목표 음과 달라요",
  "no-target": "다음 목표를 기다리는 중",
  "sustain-lock": "다시 튕겨주세요",
  "target-lock": "명중 · 다음 음을 기다려요",
  stabilizing: "음을 확인하는 중",
  hit: "명중",
  held: "마지막 감지 음",
  listening: "연주 음 확인 중",
};

function MobilePitchMonitor({ pitch, message, control }) {
  return <output className="shooterPitchMonitorMobile" aria-label="지금 감지한 음">
    <span>내가 친 음 <b>{pitch?.note ?? "—"}</b></span>
    <small>{message}</small>
    {control}
  </output>;
}

function DesktopPitchMonitor({ pitch, message, control }) {
  return <output className="shooterPitchMonitorDesktop" aria-label="지금 감지한 음">
    <span>내가 친 음</span>
    <b>{pitch?.note ?? "—"}</b>
    <span>{pitch ? `${pitch.frequency.toFixed(1)} Hz` : "— Hz"}</span>
    <small>{message}</small>
    {control}
  </output>;
}

export default function ShooterPitchMonitor({ mobile, pitch, reason, active = true, onStartMicrophone }) {
  const [connecting, setConnecting] = useState(false);
  const message = active ? (STATUS[reason] ?? "소리를 기다리는 중") : "게임 시작 전에도 확인할 수 있어요";
  const control = !active && onStartMicrophone ? <button
    className="shooterPitchMonitorConnect"
    type="button"
    disabled={connecting}
    onClick={async () => {
      setConnecting(true);
      try { await onStartMicrophone(); } finally { setConnecting(false); }
    }}
  >{connecting ? "연결 중…" : "마이크 켜기"}</button> : null;
  return mobile
    ? <MobilePitchMonitor pitch={pitch} message={message} control={control} />
    : <DesktopPitchMonitor pitch={pitch} message={message} control={control} />;
}
