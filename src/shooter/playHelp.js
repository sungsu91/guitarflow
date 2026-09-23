import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
export const SHOOTER_PLAY_HELP_LEVELS = Object.freeze([0, 1, 2]);

export function getShooterPlayHelpLevelLabel(level) {
  if (Number(level) === 1) return "1";
  if (Number(level) === 2) return "2";
  return "OFF";
}

export function getShooterPlayHelpMessage(level, positions = [], hasTarget = false) {
  const normalizedLevel = Number(level);
  if (normalizedLevel === 0) return "";
  if (!hasTarget) return ko["shooter.waitingForTarget"];

  const position = positions[0];
  if (!position) return ko["shooter.positionUnavailable"];
  const fretNumber = Math.max(0, Number(position.fretNumber ?? position.fret) || 0);
  const fretLabel = fretNumber === 0 ? ko["app.openString"] : formatMessage(ko["app.fretValue1"], { value1: fretNumber });
  if (fretNumber === 0 || normalizedLevel === 1) return fretLabel;
  return formatMessage(ko["shooter.valueStringValue"], { value1: fretLabel, value2: position.stringNumber });
}
