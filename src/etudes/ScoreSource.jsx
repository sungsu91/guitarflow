import brand from './assets/fretiva-lab-logo-print.png';
import './scoreSourceFrame.css';
import qr from './score-source-qr.png';
import {SCORE_SOURCE_HANDLE} from './scoreSource.js';
export default function ScoreSource(){return <><div className="scoreBrand"><img src={brand} alt="FRETIVA LAB"/></div><div className="etudeSheetAddress"><div className="scoreSourceFrame"><img className="scoreSourceQr" src={qr} alt="FRETIVA LAB 앱 접속 QR 코드"/><div className="scoreSourceHandle">{SCORE_SOURCE_HANDLE}</div></div></div></>;}
