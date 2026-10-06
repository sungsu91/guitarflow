import { Translation } from "../i18n/react.jsx";
import "./voice-mode.css";

export default function ShooterVoiceIntro({ mobile }) {
  const content = <><b><Translation id="shooter.voiceRange" /></b><p><Translation id="shooter.voiceDescription" /></p></>;
  return mobile
    ? <section className="shooterVoiceIntroMobile">{content}</section>
    : <section className="shooterVoiceIntroDesktop">{content}</section>;
}
