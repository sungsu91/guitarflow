import React from 'react';
import './mobilePackLibrary.css';

// Share the trainer's controls and state; only the phone landscape arrangement changes.
export default function MobilePackLibrary({landscape,collections,filters,toolbar,selection,children}) {
  if(!landscape)return <>{collections}{filters}{toolbar}{children}{selection}</>;

  return <div className="rt-landscape-library">
    <aside className="rt-mobile-library-rail">
      {collections}
      {filters}
    </aside>
    <div className="rt-mobile-library-browser">
      {toolbar}
      {children}
      {selection}
    </div>
  </div>;
}
