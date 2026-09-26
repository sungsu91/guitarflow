import { useLayoutEffect, useRef } from 'react';
import './help-guide-dialog.css';

// The browser top layer keeps the guide above all picker stacking contexts
// and makes the rest of the page inert while the guide is open.
export default function HelpGuideDialog({ children, label, onClose }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="helpGuideLayer helpGuideDialog" aria-label={label}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    {children}
  </dialog>;
}
