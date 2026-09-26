import { useId } from "react";
import { useLanguage } from "../i18n/react.jsx";
import { getPetLayoutKey } from "./petPreferences.js";
import { usePetPreferences } from "./usePetPreferences.js";

function MobilePetControls({ children }) {
  return <section className="shooterPetControls shooterPetControls--mobile">{children}</section>;
}
function DesktopPetControls({ children }) {
  return <section className="shooterPetControls shooterPetControls--desktop">{children}</section>;
}

export default function ShooterPetControls({ skin, mobile, horizontal }) {
  const [preferences, update] = usePetPreferences(skin.id);
  const language = useLanguage();
  const en = language === "en";
  const text = (ko, english) => en ? english : ko;
  const id = useId();
  const layout = getPetLayoutKey(mobile, horizontal);
  const Layout = mobile ? MobilePetControls : DesktopPetControls;
  return <Layout>
    <div className="shooterPetSpeedControl">
      <label htmlFor={id}>{text("동작 속도", "Motion speed")}</label>
      <input id={id} type="range" min="0.25" max="1" step="0.05" value={preferences.speed}
        onChange={event => update({ speed: Number(event.target.value) })} />
      <output htmlFor={id}>{preferences.speed.toFixed(2)}×</output>
    </div>
    <div className="shooterPetDirectionControl">
      <span>{text("보는 방향", "Facing")}</span>
      <button type="button" aria-pressed={preferences.facing === "left"} onClick={() => update({ facing: "left" })}>{text("왼쪽", "Left")}</button>
      <button type="button" aria-pressed={preferences.facing === "right"} onClick={() => update({ facing: "right" })}>{text("오른쪽", "Right")}</button>
      <button type="button" className="shooterPetResetPosition" onClick={() => update(current => ({ positions: { ...current.positions, [layout]: null } }))}>{text("하트 위로", "Above hearts")}</button>
    </div>
    <small>{text("펫을 드래그해 위치를 조절하세요.", "Drag your pet to move it.")}</small>
  </Layout>;
}
