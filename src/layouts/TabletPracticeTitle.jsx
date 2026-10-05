import { AudioLines, Guitar, Music2 } from 'lucide-react';
import { useLanguage } from '../i18n/react.jsx';

const TITLES = {
  'first-position': { ko: '단일음 연습', en: 'Note practice', eyebrow: 'NOTE PRACTICE', Icon: Music2 },
  'scale-block': { ko: '스케일 연습', en: 'Scale practice', eyebrow: 'SCALE PRACTICE', Icon: Guitar },
  rhythm: { ko: '리듬 & 코드', en: 'Rhythm & chords', eyebrow: 'RHYTHM & CHORDS', Icon: AudioLines },
};

// Presentation only: practice prompts, playback and selections stay in App.
export default function TabletPracticeTitle({ mode }) {
  const language = useLanguage();
  const title = TITLES[mode];
  if (!title) return null;
  const { Icon } = title;
  return (
    <header className="tabletPracticeTitle">
      <div className="tabletPracticeTitleEyebrow" aria-hidden="true">
        <Icon size={17} strokeWidth={1.6} />
        <span>{title.eyebrow}</span>
      </div>
      <div className="tabletPracticeTitleLine">
        <h1>{language === 'ko' ? title.ko : title.en}</h1>
      </div>
    </header>
  );
}
