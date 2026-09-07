export const SHOOTER_PLAY_HELP_LEVELS = Object.freeze([0, 1, 2]);

export function getShooterPlayHelpLevelLabel(level) {
  if (Number(level) === 1) return "1";
  if (Number(level) === 2) return "2";
  return "OFF";
}

export function getShooterPlayHelpMessage(level, positions = [], hasTarget = false) {
  const normalizedLevel = Number(level);
  if (normalizedLevel === 0) return "";
  if (!hasTarget) return "목표 음 대기";

  const position = positions[0];
  if (!position) return "위치 정보 없음";
  const fretNumber = Math.max(0, Number(position.fretNumber ?? position.fret) || 0);
  const fretLabel = fretNumber === 0 ? "개방현" : `${fretNumber}프렛`;
  if (fretNumber === 0 || normalizedLevel === 1) return fretLabel;
  return `${fretLabel} ${position.stringNumber}번줄`;
}
