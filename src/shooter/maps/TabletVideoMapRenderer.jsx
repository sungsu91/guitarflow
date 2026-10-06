import MapVideoBackdrop from '../MapVideoBackdrop.jsx';
import './tablet-video-map.css';

// The tablet chooses the wide source; playback and reduced-motion handling
// remain shared with the other platforms.
export default function TabletVideoMapRenderer({ skin, stage, animationsActive = true, editMode = false }) {
  if (stage === 'overlay') return null;
  return (
    <div className="shooterMapSkinStage shooterMapSkinStage--underlay tabletShooterVideoMap"
      data-map-skin={skin.id} data-animations-active={animationsActive} aria-hidden="true">
      <MapVideoBackdrop
        posterSrc={skin.background.src}
        videoSrc={skin.background.videoSrc}
        paused={!animationsActive || editMode}
        imageClassName="tabletShooterVideoMapPoster"
        videoClassName="tabletShooterVideoMapVideo"
      />
    </div>
  );
}
