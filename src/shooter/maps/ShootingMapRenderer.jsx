import MapSkinRenderer from "./MapSkinRenderer.jsx";
import Pseudo3DRenderer from "../pseudo3d/Pseudo3DRenderer.jsx";
import ThreeDLabHorizontalRenderer from "../threed/ThreeDLabHorizontalRenderer.jsx";

export default function ShootingMapRenderer({
  pseudo3dActive,
  pseudo3dDeveloper,
  pseudo3dSettings,
  onPseudo3DSettingsChange,
  threeDLabActive,
  threeDLabBattleState,
  threeDLabDeveloper,
  threeDLabHorizontalBattle,
  threeDLabPreview = false,
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

  if (skin?.renderer === "perspective3d") {
    if (!threeDLabHorizontalBattle && !threeDLabPreview) return null;
    return (
      <ThreeDLabHorizontalRenderer
        active={threeDLabHorizontalBattle && threeDLabActive}
        battleState={threeDLabBattleState}
        developer={threeDLabDeveloper}
        stage={mapSkinProps.stage}
      />
    );
  }

  return <MapSkinRenderer {...mapSkinProps} skin={skin} />;
}
