import { t as translateUi } from "./../../i18n/core.js";
import { Translation, useLanguage } from "./../../i18n/react.jsx";
import {RotateCcw, LogOut} from 'lucide-react';
import ShooterShareButton from './ShooterShareButton.jsx';
import './shooter-results.css';
export default function ShooterGameOver({score,bestScore,onRestart,onExit}){
  useLanguage();
  const best=Math.max(Number(score)||0,Number(bestScore)||0);
  return <section className="shooterGameOverPanel" aria-label={translateUi("shooter.noteShooterFinalResults")} onClick={event=>event.stopPropagation()}>
    <h2><Translation id="app.gameOver" /></h2>
    <p className="shooterResultLabel"><Translation id="shooter.finalScore" /></p>
    <strong className="shooterResultScore">{Number(score||0).toLocaleString('ko-KR')}</strong>
    <p className="shooterResultBest"><Translation id="shooter.bestScore" /><b>{best.toLocaleString('ko-KR')}</b></p>
    <div className="shooterResultActions">
      <button type="button" className="shooterResultButton shooterResultRestart" onClick={onRestart}><RotateCcw size={17} aria-hidden="true"/><Translation id="shooter.playAgain" /></button>
      <ShooterShareButton score={score} bestScore={best}/>
      <button type="button" className="shooterResultButton shooterResultExit" onClick={onExit}><LogOut size={17} aria-hidden="true"/><Translation id="shooter.exitGame" /></button>
    </div>
  </section>;
}
