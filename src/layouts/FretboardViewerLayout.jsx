// The application supplies shared state and controls. Only their placement
// changes on desktop; the mobile DOM and gesture surface stay unchanged.
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
}) {
  if (!desktop) {
    return (
      <section className={className} aria-label={label}>
        <div {...controlPanelProps}>
          {tabs}
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
          {tabs}
          {board}
          {controls}
        </div>
      ) : explorer(tabs)}
      {catalog}
    </section>
  );
}
