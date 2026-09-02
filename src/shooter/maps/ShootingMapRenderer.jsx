import MapSkinRenderer from "./MapSkinRenderer.jsx";
import Pseudo3DRenderer from "../pseudo3d/Pseudo3DRenderer.jsx";
import ThreeDLabHorizontalRenderer from "../threed/ThreeDLabHorizontalRenderer.jsx";
import ThreeDLabRenderer from "../threed/ThreeDLabRenderer.jsx";

export default function ShootingMapRenderer({
  pseudo3dActive,
  pseudo3dDeveloper,
  pseudo3dSettings,
  onPseudo3DSettingsChange,
  threeDLabActive,
  threeDLabBattleState,
  threeDLabDeveloper,
  threeDLabHorizontalBattle,
  threeDLabSettings,
  onThreeDLabSettingsChange,
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
    if (threeDLabHorizontalBattle) {
      return (
        <ThreeDLabHorizontalRenderer
          active={threeDLabActive}
          battleState={threeDLabBattleState}
          developer={threeDLabDeveloper}
          stage={mapSkinProps.stage}
        />
      );
    }
    return (
      <ThreeDLabRenderer
        active={threeDLabActive}
        developer={threeDLabDeveloper}
        onSettingsChange={onThreeDLabSettingsChange}
        settings={threeDLabSettings ?? skin.threeD}
        skin={skin}
        stage={mapSkinProps.stage}
      />
    );
  }

  return <MapSkinRenderer {...mapSkinProps} skin={skin} />;
}
