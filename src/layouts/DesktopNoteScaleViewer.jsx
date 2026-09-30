import {Translation} from '../i18n/react.jsx';

// Both instruments use the application's existing note store and scale state.
// Only the desktop presentation combines them into a comparison workspace.
export default function DesktopNoteScaleViewer({navigation,noteTitle,noteControls,noteBoard,scaleTitle,scaleControls,scaleBoard}) {
  return <div className="desktopNoteScaleViewer">
    <section className="desktopTheoryCard desktopTheoryCard--notes">
      <div className="desktopTheoryNavigation">{navigation}</div>
      <header className="desktopTheoryHeading">
        <span><Translation id="app.notePositions" /></span>
        {noteTitle}
      </header>
      <div className="desktopTheoryControls">{noteControls}</div>
      <div className="desktopTheoryBoard">{noteBoard}</div>
    </section>
    <section className="desktopTheoryCard desktopTheoryCard--scale">
      <div className="desktopTheorySectionLabel"><Translation id="app.scales" /> · <Translation id="app.pentatonics" /></div>
      <header className="desktopTheoryHeading">
        <span><Translation id="app.scalePositions" /></span>
        <strong>{scaleTitle}</strong>
      </header>
      <div className="desktopTheoryControls">{scaleControls}</div>
      <div className="desktopTheoryBoard">{scaleBoard}</div>
    </section>
  </div>;
}
