import { ART_MAP_BY_ID } from './artMapCatalog.js';
import ArtMapMotionCanvas from './ArtMapMotionCanvas.jsx';
import './art-maps.css';

// Decoration is shared; each platform owns its framing and contrast treatment.
function ArtMapImage({ id, src, presentation, active = true }) {
  return <>
    <img className="artMapImage" src={src} alt="" draggable={false} />
    <ArtMapMotionCanvas id={id} src={src} presentation={presentation} active={active} />
    <div className="artMapAtmosphere" data-active={active} style={{ '--art-map-glow': ART_MAP_BY_ID[id]?.glow }}>
      {Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--spark-index': index, '--spark-x': `${(index * 37 + 9) % 94}%`, '--spark-y': `${(index * 23 + 14) % 53 + 8}%` }} />)}
    </div>
  </>;
}

export function DesktopArtMap({ id, paused = false }) {
  return <div className="desktopArtMap" data-art-map={id} aria-hidden="true">
    <ArtMapImage id={id} src={ART_MAP_BY_ID[id].artwork.desktop} presentation="desktop" active={!paused} />
  </div>;
}

function MobileArtMap({ skin, active }) {
  return <div className="shooterMapSkinStage shooterMapSkinStage--underlay mobileArtMap" data-art-map={skin.id} aria-hidden="true">
    <ArtMapImage id={skin.id} src={skin.background.src} presentation="mobile" active={active} />
  </div>;
}

function TabletArtMap({ skin, active }) {
  return <div className="shooterMapSkinStage shooterMapSkinStage--underlay tabletArtMap" data-art-map={skin.id} aria-hidden="true">
    <ArtMapImage id={skin.id} src={skin.background.src} presentation="tablet" active={active} />
  </div>;
}

export default function ArtMapRenderer({ skin, stage, animationsActive = true, editMode = false }) {
  if (stage === 'overlay') return null;
  const active = animationsActive && !editMode;
  return skin.tabletComposition ? <TabletArtMap skin={skin} active={active} /> : <MobileArtMap skin={skin} active={active} />;
}
