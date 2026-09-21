import {RotateCcw, LogOut} from 'lucide-react';
import ShooterShareButton from './ShooterShareButton.jsx';
import './shooter-results.css';
export default function ShooterGameOver({score,bestScore,onRestart,onExit}){
  const best=Math.max(Number(score)||0,Number(bestScore)||0);
  return <section className="shooterGameOverPanel" aria-label="슈팅게임 최종 결과" onClick={event=>event.stopPropagation()}>
    <h2>게임 오버</h2>
    <p className="shooterResultLabel">최종 점수</p>
    <strong className="shooterResultScore">{Number(score||0).toLocaleString('ko-KR')}</strong>
    <p className="shooterResultBest">최고 점수 <b>{best.toLocaleString('ko-KR')}</b></p>
    <div className="shooterResultActions">
      <button type="button" className="shooterResultButton shooterResultRestart" onClick={onRestart}><RotateCcw size={17} aria-hidden="true"/>다시 하기</button>
      <ShooterShareButton score={score} bestScore={best}/>
      <button type="button" className="shooterResultButton shooterResultExit" onClick={onExit}><LogOut size={17} aria-hidden="true"/>게임 종료</button>
    </div>
  </section>;
}
