import { House } from 'lucide-react';
import { t } from '../i18n/core.js';
import { Translation, useLanguage } from '../i18n/react.jsx';
import './tabletScoreHeader.css';

export default function TabletScoreHeader({ onHome, children }) {
  useLanguage();
  return <header className="scoreWorkspaceHeading tabletScoreHeading">
    <div className="tabletScoreHeadingIdentity">
      <button className="tabletScoreHome" type="button" onClick={onHome} aria-label={t('pdf.fretivaLabHome')}>
        <House size={24} aria-hidden="true" />
        <span>FRETIVA LAB</span>
      </button>
      <h1 id="score-workspace-title"><Translation id="score.practiceRoom" /></h1>
    </div>
    {children}
  </header>;
}
