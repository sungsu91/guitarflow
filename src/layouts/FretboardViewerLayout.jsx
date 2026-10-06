// The application supplies shared state and controls. Only their placement
// changes on desktop; the mobile DOM and gesture surface stay unchanged.
import {useTabletLayout} from './TabletLayout.jsx';
import { MobileInstrumentControls, TabletInstrumentControls, DesktopInstrumentControls } from '../fretboard/ViewerInstrumentControls.jsx';
export default function FretboardViewerLayout({
  desktop,
  mode,
  className,
  label,
  controlPanelProps,
  tabs,
  board,
  controls,
  catalog,
  explorer,
  instrumentControls,
}) {
  const tablet = useTabletLayout();
  const navigation = tabs(tablet ? <TabletInstrumentControls {...instrumentControls} />
    : desktop ? <DesktopInstrumentControls {...instrumentControls} /> : <MobileInstrumentControls {...instrumentControls} />);
  if (tablet && mode !== 'chord') {
    return <section className={`${className} tabletTheoryViewer`} aria-label={label}>{explorer(navigation)}</section>;
  }
  if (tablet) {
    return (
      <section className={`${className} tabletChordViewer`} aria-label={label}>
        <div {...controlPanelProps} className={`${controlPanelProps.className} tabletChordWorkbench`}>
          {navigation}
          {board}
          {controls}
        </div>
        {catalog}
      </section>
    );
  }
  if (!desktop) {
    return (
      <section className={className} aria-label={label}>
        <div {...controlPanelProps}>
          {navigation}
          {board}
          {controls}
        </div>
        {catalog}
      </section>
    );
  }

  return (
    <section className={`${className} desktopFretboardViewer`} aria-label={label}>
      {mode === "chord" ? (
        <div {...controlPanelProps}>
          {navigation}
          {board}
          {controls}
        </div>
      ) : explorer(navigation)}
      {catalog}
    </section>
  );
}
