import { t } from '../i18n/core.js';
import { useLanguage } from '../i18n/react.jsx';
import { etudeDifficulty } from './difficultyRatings.js';
import './difficultyStars.css';

const starPath = 'M12 2.5 14.94 8.46 21.52 9.42 16.76 14.06 17.88 20.62 12 17.52 6.12 20.62 7.24 14.06 2.48 9.42 9.06 8.46Z';

export default function DifficultyStars({ score }) {
  useLanguage();
  const rating = etudeDifficulty(score);
  if (rating === null) return null;
  const label = t('etudes.difficultyStarsLabel', { value1: rating });
  return <span className="etudeDifficultyStars" role="img" aria-label={label} title={`${label} · ${t('etudes.difficultyStarsHint')}`} data-difficulty={rating}>
    <span className="etudeDifficultyIcons" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => <span className="etudeDifficultyStar" key={index}>
        <svg viewBox="0 0 24 24" focusable="false"><path d={starPath} /></svg>
        <span className="etudeDifficultyStarFill" style={{ width: `${Math.max(0, Math.min(1, rating - index)) * 100}%` }}>
          <svg viewBox="0 0 24 24" focusable="false"><path d={starPath} /></svg>
        </span>
      </span>)}
    </span>
    <span className="etudeDifficultyValue" aria-hidden="true">{rating.toFixed(1)}</span>
  </span>;
}
