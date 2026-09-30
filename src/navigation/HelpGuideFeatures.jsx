import { Translation } from '../i18n/react.jsx';
import { useDesktopLayout } from '../layouts/DesktopLayout.jsx';

// One set of feature descriptions; platform-specific instructions stay scoped.
export const HELP_GUIDE_UPDATES = [
  { id: 'remember', section: 'etudes', title: 'guide.rememberTitle', description: 'guide.rememberBody' },
  { id: 'pages', section: 'etudes', title: 'guide.pagesTitle', description: 'guide.pagesBody', desktop: true },
  { id: 'notes', section: 'fretboard-viewer', title: 'guide.notesTitle', description: 'guide.notesBody', desktop: true },
  { id: 'packs', section: 'rhythm-trainer', title: 'guide.packsTitle', description: 'guide.packsDesktop', desktop: true },
  { id: 'octaves', section: 'scale-pentatonic', title: 'guide.octavesTitle', description: 'guide.octavesBody' },
  { id: 'sound', section: 'sound-rhythm', title: 'guide.soundTitle', description: 'guide.soundDesktop', desktop: true },
  { id: 'backing', section: 'backing-audio', title: 'guide.backingTitle', description: 'guide.backingBody' },
  { id: 'recording', section: 'shooter', title: 'guide.recordingTitle', description: 'guide.recordingBody' },
];

export function HelpGuideFeatureNotes({ sectionId }) {
  const desktop = useDesktopLayout();
  const updates = HELP_GUIDE_UPDATES.filter(item => item.section === sectionId && (!item.desktop || desktop));
  if (!updates.length) return null;
  return <div className="helpGuideFeatureNotes">
    {updates.map(item => <div className="helpFactCard" key={item.id}>
      <strong><Translation id={item.title} /></strong>
      <p><Translation id={item.description} /></p>
    </div>)}
  </div>;
}

export function RhythmTrainerHelp() {
  const desktop = useDesktopLayout();
  return <>
    <p><Translation id="guide.trainerIntro" /></p>
    <div className="helpFlow">
      <span><Translation id="guide.choosePack" /></span><i aria-hidden="true">→</i>
      <span><Translation id="guide.checkRhythm" /></span><i aria-hidden="true">→</i>
      <span><Translation id="guide.startSlow" /></span>
    </div>
    <ul className="helpFactList">
      <li><Translation id="guide.trainerFilters" /></li>
      <li><Translation id={desktop ? 'guide.packsDesktop' : 'guide.packsMobile'} /></li>
      <li><Translation id="guide.trainerPractice" /></li>
      <li><Translation id="guide.trainerCreate" /></li>
    </ul>
  </>;
}

export function FretboardGuideIntro() {
  const desktop = useDesktopLayout();
  return <p><Translation id={desktop ? 'guide.fretboardDesktop' : 'guide.fretboardMobile'} /></p>;
}

export function HelpSampleCredits({ samples }) {
  return <details className="helpSampleCredits">
    <summary><Translation id="app.guitarAudioBiblicalbricksproductionsCcBy30" /></summary>
    <p><Translation id="app.basicMajorChordsCBUseOriginalRecordingsTheirVoicingsMayDiffer" /></p>
    <p><a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer"><Translation id="originalUi.creativeCommonsAttribution30" /></a><Translation id="app.originalFileKeptLeadInSkippedDuringPlayback" /></p>
    <p>{Object.entries(samples).map(([root, sample]) => <a key={root} href={sample.source} target="_blank" rel="noreferrer">{sample.title} </a>)}</p>
  </details>;
}
