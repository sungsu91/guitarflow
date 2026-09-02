const MENU_STATUS_META = Object.freeze({
  HOT: Object.freeze({ label: "인기·추천 기능" }),
  NEW: Object.freeze({ label: "새로 추가된 기능" }),
  BETA: Object.freeze({ label: "시험 운영 중인 기능" }),
  PRO: Object.freeze({ label: "멤버십 전용 기능" }),
  DEV: Object.freeze({ label: "개발 중인 기능" }),
  BEGINNER: Object.freeze({ label: "초보자 추천 기능", text: "초보" }),
  SOLO: Object.freeze({ label: "솔로 연습 기능", text: "SOLO" }),
});

export const MENU_STATUS_TYPES = Object.freeze(Object.keys(MENU_STATUS_META));

export function MenuStatusBadge({ status }) {
  const normalizedStatus = typeof status === "string" ? status.trim().toUpperCase() : "";
  const meta = MENU_STATUS_META[normalizedStatus];
  if (!meta) return null;

  return (
    <span
      aria-label={`기능 상태: ${meta.label}`}
      className={`utilityMenuStatusBadge utilityMenuStatusBadge--${normalizedStatus.toLowerCase()}`}
      data-menu-status={normalizedStatus}
      title={meta.label}
    >
      {meta.text ?? normalizedStatus}
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
