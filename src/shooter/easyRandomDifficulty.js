import ko from "../i18n/locales/ko.js";
import {
  STANDARD_GUITAR_OPEN_MIDI,
  createShooterTargetNote,
} from "./gameplayRules.js";

export const SHOOTER_EASY_RANDOM_DIFFICULTY_ID = "easy-random";
export const SHOOTER_NORMAL_RANDOM_DIFFICULTY_ID = "normal-random";
export const SHOOTER_EASY_RANDOM_RANGE_LABEL = ko["shooter.openStringsFret3RandomNoSharps"];
export const SHOOTER_NORMAL_RANDOM_RANGE_LABEL = ko["shooter.openStringsFret3RandomIncludingSharps"];

export const SHOOTER_NORMAL_RANDOM_POSITIONS = Object.freeze(
  Object.keys(STANDARD_GUITAR_OPEN_MIDI)
    .map(Number)
    .sort((a, b) => b - a)
    .flatMap((stringNumber) => (
      Array.from({ length: 4 }, (_, fretNumber) => {
        const target = createShooterTargetNote({ stringNumber, fretNumber });
        return Object.freeze({
          ...target,
          pitch: target.label,
          stringNumber: target.string,
          fretNumber: target.fret,
        });
      })
    )),
);

export const SHOOTER_EASY_RANDOM_POSITIONS = Object.freeze(
  SHOOTER_NORMAL_RANDOM_POSITIONS.filter((position) => !position.accidental),
);
