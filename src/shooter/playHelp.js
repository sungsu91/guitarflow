export const SHOOTER_PLAY_HELP_LEVELS = Object.freeze([0, 1, 2]);

export function getShooterPlayHelpLevelLabel(level) {
  if (Number(level) === 1) return "1";
  if (Number(level) === 2) return "2";
  return "OFF";
}

export function getShooterPlayHelpMessage(level, positions = [], hasTarget = false) {
  const normalizedLevel = Number(level);
  if (normalizedLevel === 0) return "";
  if (!hasTarget) return "목표 음을 기다리는 중";

  const position = positions[0];
  if (!position) return "지판 위치를 확인할 수 없습니다";
  const fretNumber = Math.max(0, Number(position.fretNumber ?? position.fret) || 0);
  const fretLabel = fretNumber === 0 ? "개방현" : `${fretNumber}프렛`;
  if (normalizedLevel === 1) return `${fretLabel}에 위치했습니다`;
  return `${fretLabel} · ${position.stringNumber}번줄에 위치했습니다`;
}
