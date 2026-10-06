import { X } from "lucide-react";
import ko from "../../i18n/locales/ko.js";
import { formatMessage } from "../../i18n/format.js";
import { localizeUi } from "../../i18n/core.js";

function DeleteControl({ title, onDelete, deleting }) {
  const label = localizeUi(formatMessage(ko["shooter.deleteGuitarSkin"], { value1: title }));
  return onDelete ? (
    <button className="shooterGuitarDelete" type="button" aria-label={label}
      title={label} disabled={deleting} onClick={(event) => {
        event.stopPropagation();
        onDelete();
      }}>
      <X size={14} aria-hidden="true" />
    </button>
  ) : null;
}

export function DesktopGuitarSkinCard({ children, title, onDelete, deleting }) {
  return (
    <div className="shooterGuitarSkinCard shooterGuitarSkinCard--desktop">
      {children}
      <DeleteControl title={title} onDelete={onDelete} deleting={deleting} />
    </div>
  );
}

export function MobileGuitarSkinCard({ children, title, onDelete, deleting }) {
  return (
    <div className="shooterGuitarSkinCard shooterGuitarSkinCard--mobile">
      {children}
      <DeleteControl title={title} onDelete={onDelete} deleting={deleting} />
    </div>
  );
}
