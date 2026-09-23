import ko from "../i18n/locales/ko.js";
import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { useLanguage } from "./../i18n/react.jsx";
const MENU_STATUS_META = Object.freeze({
  HOT: Object.freeze({ label: ko["components.popularOrRecommendedFeature"] }),
  NEW: Object.freeze({ label: ko["components.newFeature"] }),
  BETA: Object.freeze({ label: ko["components.featureInBeta"] }),
  PRO: Object.freeze({ label: ko["components.membersOnlyFeature"] }),
  DEV: Object.freeze({ label: ko["components.featureInDevelopment"] }),
  BEGINNER: Object.freeze({ label: ko["components.recommendedForBeginners"], text: ko["components.beginner"] }),
  SOLO: Object.freeze({ label: ko["components.soloPracticeFeature"], text: "SOLO" }),
});

export const MENU_STATUS_TYPES = Object.freeze(Object.keys(MENU_STATUS_META));

export function MenuStatusBadge({ status }) {
  useLanguage();
  const normalizedStatus = typeof status === "string" ? status.trim().toUpperCase() : "";
  const meta = MENU_STATUS_META[normalizedStatus];
  if (!meta) return null;

  return (
    <span
      aria-label={localizeUi(translateUi("components.featureStatusValue1", { value1: localizeUi(meta.label) }))}
      className={`utilityMenuStatusBadge utilityMenuStatusBadge--${normalizedStatus.toLowerCase()}`}
      data-menu-status={normalizedStatus}
      title={localizeUi(meta.label)}
    >
      {localizeUi(meta.text ?? normalizedStatus)}
    </span>
  );
}

export function UtilityMenuTitle({ children, status = "" }) {
  return (
    <strong className="utilityMenuTitle">
      <span className="utilityMenuTitleLabel">{children}</span>
      {status ? <MenuStatusBadge status={status} /> : null}
    </strong>
  );
}
