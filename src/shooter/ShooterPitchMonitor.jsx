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

function MobilePitchMonitor({ pitch, message }) {
  return <output className="shooterPitchMonitorMobile" aria-label="지금 감지한 음">
    <span>내가 친 음 <b>{pitch?.note ?? "—"}</b></span>
    <small>{message}</small>
  </output>;
}

function DesktopPitchMonitor({ pitch, message }) {
  return <output className="shooterPitchMonitorDesktop" aria-label="지금 감지한 음">
    <span>내가 친 음</span>
    <b>{pitch?.note ?? "—"}</b>
    <span>{pitch ? `${pitch.frequency.toFixed(1)} Hz` : "— Hz"}</span>
    <small>{message}</small>
  </output>;
}

export default function ShooterPitchMonitor({ mobile, pitch, reason, active = true, micStatus }) {
  const message = active ? (STATUS[reason] ?? "소리를 기다리는 중")
    : micStatus === "Permission Denied" ? "마이크 권한을 허용해주세요" : "마이크 연결 중";
  return mobile
    ? <MobilePitchMonitor pitch={pitch} message={message} />
    : <DesktopPitchMonitor pitch={pitch} message={message} />;
}
