import MapSkinRenderer from "./MapSkinRenderer.jsx";
import Pseudo3DRenderer from "../pseudo3d/Pseudo3DRenderer.jsx";

export default function ShootingMapRenderer({
  pseudo3dActive,
  pseudo3dDeveloper,
  pseudo3dSettings,
  onPseudo3DSettingsChange,
  skin,
  ...mapSkinProps
}) {
  if (skin?.renderer === "pseudo3d") {
    return (
      <Pseudo3DRenderer
        active={pseudo3dActive}
        developer={pseudo3dDeveloper}
        onSettingsChange={onPseudo3DSettingsChange}
        settings={pseudo3dSettings ?? skin.pseudo3d}
        skin={skin}
        stage={mapSkinProps.stage}
      />
    );
  }

  return <MapSkinRenderer {...mapSkinProps} skin={skin} />;
}

