import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/react.jsx';
import { t } from '../i18n/core.js';
import './desktop-scale-practice.css';

export default function DesktopScalePositionNavigation({ index, count, isBox, onSelect }) {
  useLanguage();
  return (
    <nav className="desktopScalePositionNavigation" aria-label={t('app.changeRange')}>
      <button type="button" aria-label={t('app.previousScaleSegment')} disabled={index === 0} onClick={() => onSelect(index - 1)}>
        <ChevronLeft size={18} strokeWidth={1.6} aria-hidden="true" />
      </button>
      <span className="desktopScalePositionCount" aria-live="polite">{isBox ? 'BOX' : t('app.range')} {index + 1} / {count}</span>
      <button type="button" aria-label={t('app.nextScaleSegment')} disabled={index === count - 1} onClick={() => onSelect(index + 1)}>
        <ChevronRight size={18} strokeWidth={1.6} aria-hidden="true" />
      </button>
    </nav>
  );
}
