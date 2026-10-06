import RhythmScore from './RhythmScore.jsx';
import {useLanguage} from '../i18n/react.jsx';
import './corePatternEditor.css';

function CoreLength({core,meter,onLength,t}) {
 return <label>{t('길이','Length')}<select aria-label={t('핵심 패턴 길이','Core length')} value={core.length} onChange={e=>onLength(Number(e.target.value))}>{[...new Set([1,2,meter])].map(n=><option key={n} value={n}>{n} {t('박','beats')}</option>)}</select></label>;
}
function CoreScore({core,selected,onSelect,stemDirection,t}) {
 return <div className="rt-core-paper"><RhythmScore measures={[core]} meter={core.length} selected={selected} onSelect={onSelect} stemDirection={stemDirection} showMeasureNumber={false} label={t('편집 중인 핵심 패턴 악보','Core pattern being edited')}/></div>;
}
function CoreOverview(props) {
 return <><header className="rt-core-heading"><h2>{props.t('핵심 패턴','Core pattern')}</h2><div className="rt-core-overview-actions">{props.backingControl}<CoreLength {...props}/></div></header><CoreScore {...props}/></>;
}
function CoreSettings({selected,editorAction,children,t}) {
 return <section className="rt-core-settings" aria-label={t('선택한 박 설정','Selected beat settings')}><header className="rt-core-settings-heading"><h2>{selected[1]+1} {t('박 설정','beat settings')}</h2>{editorAction}</header><div className="rt-core-settings-body">{children}</div></section>;
}
function MobileCoreEditor(props) {
 return <section className="rt-core-editor rt-core-editor--mobile" aria-label={props.t('핵심 패턴 편집','Edit core pattern')}><div className="rt-core-mobile-score"><CoreOverview {...props}/></div><CoreSettings {...props}/></section>;
}
function DesktopCoreEditor(props) {
 return <section className="rt-core-editor rt-core-editor--desktop" aria-label={props.t('핵심 패턴 편집','Edit core pattern')}><div className="rt-core-desktop-score"><CoreOverview {...props}/></div><CoreSettings {...props}/></section>;
}
export default function CorePatternEditor({mobile,...props}) {
 const language=useLanguage(),t=(ko,en)=>language==='ko'?ko:en;
 return mobile?<MobileCoreEditor {...props} t={t}/>:<DesktopCoreEditor {...props} t={t}/>;
}
