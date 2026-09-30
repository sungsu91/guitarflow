import React from 'react';

// The trainer owns data and actions. This desktop surface only arranges them.
export default function DesktopPackLibrary({title,collections,filters,toolbar,selection,children}) {
  return <div className="rt-desktop-library">
    <aside className="rt-library-rail" aria-label={title}>
      <h1>{title}</h1>
      {collections}
      <div className="rt-library-refine">{filters}</div>
    </aside>
    <section className="rt-library-browser" aria-label={title}>
      {toolbar}
      <div className="rt-library-selection">{selection}</div>
      {children}
    </section>
  </div>;
}
