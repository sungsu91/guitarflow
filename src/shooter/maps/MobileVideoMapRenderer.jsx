import MapVideoBackdrop from '../MapVideoBackdrop.jsx';
import './mobile-video-map.css';

export default function MobileVideoMapRenderer({ skin, stage, animationsActive = true, editMode = false, viewportFit = 'cover' }) {
  if (stage === 'overlay') return null;
  return (
    <div className="shooterMapSkinStage shooterMapSkinStage--underlay mobileShooterVideoMap"
      data-map-skin={skin.id} data-animations-active={animationsActive} aria-hidden="true"
      style={{ '--mobile-map-position': skin.background.position ?? 'center', '--mobile-map-fit': viewportFit }}>
      <MapVideoBackdrop
        posterSrc={skin.background.src}
        videoSrc={skin.background.videoSrc}
        paused={!animationsActive || editMode}
        imageClassName="mobileShooterVideoMapPoster"
        videoClassName="mobileShooterVideoMapVideo"
      />
    </div>
  );
}
