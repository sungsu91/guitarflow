import { useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { useLanguage } from '../i18n/react.jsx';
import { t } from '../i18n/core.js';

export const SITE_SHARE_URL = 'https://guitarflow.vercel.app/';

export default function SiteShareButton({ desktop = false }) {
  useLanguage();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const sharing = useRef(false);
  const share = async () => {
    if (sharing.current) return;
    sharing.current = true;
    setBusy(true);
    setStatus('');
    try {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'FRETIVA LAB', url: SITE_SHARE_URL });
          return;
        } catch (error) {
          if (error?.name === 'AbortError') return;
        }
      }
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(SITE_SHARE_URL);
          setStatus('copied');
          return;
        }
      } catch { /* Provide a selectable link if clipboard access fails. */ }
      setStatus('manual');
    } finally {
      sharing.current = false;
      setBusy(false);
    }
  };
  return <>
    <button type="button" className={desktop ? 'desktopSidebarNavItem' : 'utilityMenuItem utilityMenuItemSecondary utilityMenuItemActive'} onClick={share} disabled={busy}>
      <span className={desktop ? 'desktopSidebarIcon' : 'utilityMenuIcon'} aria-hidden="true"><Share2 size={19} /></span>
      <span className={desktop ? 'desktopSidebarLabel' : 'utilityMenuText'}>{desktop ? t('app.shareSite') : <strong>{t('app.shareSite')}</strong>}</span>
    </button>
    {status === 'copied' && <p className="shooterShareFeedback" role="status">{t('app.siteLinkCopied')}</p>}
    {status === 'manual' && <div className="shooterShareFeedback" role="status"><p>{t('app.copySiteLink')}</p><input aria-label={t('app.siteLink')} readOnly value={SITE_SHARE_URL} onFocus={event => event.target.select()} /></div>}
  </>;
}
