import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Cached mode trees can retain nested body portals after their first host root
// is hidden. Activity still disconnects layout effects: hide the portal surface
// on that cleanup, keeping its draft mounted for the next visit.
function ActivityPortalSurface({ children }) {
  const surface = useRef(null);
  useLayoutEffect(() => {
    const element = surface.current;
    element.hidden = false;
    return () => { element.hidden = true; };
  }, []);
  return <div ref={surface} className="activityPortalSurface">{children}</div>;
}

export function createActivityPortal(children, container) {
  return createPortal(<ActivityPortalSurface>{children}</ActivityPortalSurface>, container);
}
