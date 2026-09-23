import { t as translateUi } from "./../i18n/core.js";
import { useLanguage } from "./../i18n/react.jsx";
import brand from './assets/fretiva-lab-logo-print.png';
import './scoreSourceFrame.css';
import qr from './score-source-qr.png';
import {SCORE_SOURCE_HANDLE} from './scoreSource.js';
export default function ScoreSource(){
  useLanguage();return <><div className="scoreBrand"><img src={brand} alt={translateUi("originalUi.fretivaLab")}/></div><div className="etudeSheetAddress"><div className="scoreSourceFrame"><img className="scoreSourceQr" src={qr} alt={translateUi("etudes.fretivaLabAppQrCode")}/><div className="scoreSourceHandle">{SCORE_SOURCE_HANDLE}</div></div></div></>;}
