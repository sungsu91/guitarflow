import { createContext, useContext } from 'react';

export const TabletLayoutContext = createContext(false);
export const useTabletLayout = () => useContext(TabletLayoutContext);

// Shared sessions stay mounted when rotating or entering split view.
export default function TabletLayout({ active, children }) {
  return <TabletLayoutContext.Provider value={active}>{children}</TabletLayoutContext.Provider>;
}
