import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Translation, useLanguage } from '../i18n/react.jsx';
import { t } from '../i18n/core.js';
import './mobile-scale-practice.css';

export default function MobileScalePositionNavigation({ index, count, isBox, onSelect }) {
  useLanguage();
  return (
    <div className="mobileScalePositionNavigation">
      <button type="button" aria-label={t('app.previousScaleSegment')} disabled={index === 0} onClick={() => onSelect(index - 1)}>
        <ChevronLeft size={13} strokeWidth={1.6} aria-hidden="true" />
      </button>
      <span><Translation id="app.scaleSegmentSwipeHint" /></span>
      <span className="mobileScalePositionCount" aria-live="polite">{isBox ? 'BOX ' : ''}{index + 1} / {count}</span>
      <button type="button" aria-label={t('app.nextScaleSegment')} disabled={index === count - 1} onClick={() => onSelect(index + 1)}>
        <ChevronRight size={13} strokeWidth={1.6} aria-hidden="true" />
      </button>
    </div>
  );
}
