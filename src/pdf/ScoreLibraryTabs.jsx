import {Translation,useLanguage} from '../i18n/react.jsx';
export default function ScoreLibraryTabs({children}){
 useLanguage();
 return <header className="scoreWorkspaceHeading"><h1 id="score-workspace-title"><Translation id="score.practiceRoom"/></h1>{children}</header>;
}
