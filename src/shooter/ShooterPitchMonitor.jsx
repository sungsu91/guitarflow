import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import "./pitch-monitor.css";

const STATUS = {
  "no-signal": ko["shooter.inputSignalIsWeak"],
  "no-pitch": ko["shooter.findingThePitch"],
  "low-confidence": ko["shooter.pitchIsUnstable"],
  "wrong-pitch": ko["shooter.differentFromTheTargetNote"],
  "no-target": ko["shooter.waitingForTheNextTarget"],
  "sustain-lock": ko["shooter.pluckAgain"],
  "target-lock": ko["shooter.hitWaitingForTheNextNote"],
  stabilizing: ko["shooter.checkingTheNote"],
  hit: ko["shooter.hit"],
  held: ko["shooter.lastDetectedNote"],
  listening: ko["shooter.checkingYourNote"],
};

function MobilePitchMonitor({ pitch, message }) {
  useLanguage();
  return <output className="shooterPitchMonitorMobile" aria-label={translateUi("shooter.detectedNoteNow")}>
    <span><Translation id="shooter.playedNoteShooterPitchMonitor" /><b>{pitch?.note ?? "—"}</b></span>
    <small>{localizeUi(message)}</small>
  </output>;
}

function DesktopPitchMonitor({ pitch, message }) {
  useLanguage();
  return <output className="shooterPitchMonitorDesktop" aria-label={translateUi("shooter.detectedNoteNow")}>
    <span><Translation id="shooter.playedNote" /></span>
    <b>{pitch?.note ?? "—"}</b>
    <span>{pitch ? `${pitch.frequency.toFixed(1)} Hz` : "— Hz"}</span>
    <small>{localizeUi(message)}</small>
  </output>;
}

export default function ShooterPitchMonitor({ mobile, pitch, reason, active = true, micStatus }) {
  const message = active ? (STATUS[reason] ?? ko["tuner.waitingForSound"])
    : ({ 'Permission Denied': ko["shooter.allowMicrophoneAccess"], 'MIDI Disconnected': ko["shooter.connectAMidiDevice"], 'Device Disconnected': ko["shooter.audioDeviceDisconnected"], 'Input Error': ko["shooter.audioInputConnectionFailed"] }[micStatus] ?? ko["shooter.connectingMicrophone"]);
  return mobile
    ? <MobilePitchMonitor pitch={pitch} message={message} />
    : <DesktopPitchMonitor pitch={pitch} message={message} />;
}
