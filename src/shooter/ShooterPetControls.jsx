import { useLanguage } from "../i18n/react.jsx";
import { usePetPreferences } from "./usePetPreferences.js";

function MobilePetControls({ children }) {
  return <section className="shooterPetControls shooterPetControls--mobile">{children}</section>;
}
function DesktopPetControls({ children }) {
  return <section className="shooterPetControls shooterPetControls--desktop">{children}</section>;
}

export default function ShooterPetControls({ skin, mobile }) {
  const [preferences, update] = usePetPreferences(skin.id);
  const language = useLanguage();
  const en = language === "en";
  const text = (ko, english) => en ? english : ko;
  const Layout = mobile ? MobilePetControls : DesktopPetControls;
  return <Layout>
    <div className="shooterPetDirectionControl">
      <span>{text("보는 방향", "Facing")}</span>
      <button type="button" aria-pressed={preferences.facing === "left"} onClick={() => update({ facing: "left" })}>{text("왼쪽", "Left")}</button>
      <button type="button" aria-pressed={preferences.facing === "right"} onClick={() => update({ facing: "right" })}>{text("오른쪽", "Right")}</button>
    </div>
  </Layout>;
}
