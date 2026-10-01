import { t } from '../i18n/core.js';
import BeatBurstCanvas from './BeatBurstCanvas.jsx';

function Brand() {
  return (
    <div className="launchSplash__brand">
      <div aria-label="FRETIVA LAB" className="launchSplash__wordmark">
        <strong>FRETIVA</strong><span>LAB.</span>
      </div>
      <p>{t('launch.burstTagline')}</p>
    </div>
  );
}

function LoadingStatus({ progress, ready, statusText }) {
  const value = ready ? 100 : progress;
  return (
    <footer className="launchSplash__footer">
      <div className="launchSplash__statusLine">
        <span>{ready ? t('launch.ready') : statusText}</span>
        <span className="launchSplash__loadingLabel" aria-hidden="true">
          {ready ? 'READY' : progress === null ? 'LOADING' : `LOADING ${progress}%`}
        </span>
      </div>
      <div
        aria-label={ready ? t('launch.ready') : statusText}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined}
        className={`launchSplash__progress ${value === null ? 'launchSplash__progress--indeterminate' : ''}`}
        role="progressbar"
      >
        <span style={value === null ? undefined : { transform: `scaleX(${value / 100})` }} />
      </div>
      <p className="launchSplash__signature">LET YOUR RHYTHM BREAK FREE</p>
    </footer>
  );
}

export function MobileLayout(props) {
  return (
    <div className="launchSplash__layout launchSplash__layout--mobile" data-splash-layout="mobile">
      <BeatBurstCanvas mobile />
      <header className="launchSplash__header"><span>FRETIVA LAB</span></header>
      <Brand />
      <LoadingStatus {...props} />
    </div>
  );
}

export function DesktopLayout(props) {
  return (
    <div className="launchSplash__layout launchSplash__layout--desktop" data-splash-layout="desktop">
      <BeatBurstCanvas mobile={false} />
      <header className="launchSplash__header"><span>FRETIVA LAB</span><span>PLAY. PRACTICE. ENJOY.</span></header>
      <Brand />
      <LoadingStatus {...props} />
    </div>
  );
}
