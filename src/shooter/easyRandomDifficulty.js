import {
  STANDARD_GUITAR_OPEN_MIDI,
  createShooterTargetNote,
} from "./gameplayRules.js";

export const SHOOTER_EASY_RANDOM_DIFFICULTY_ID = "easy-random";
export const SHOOTER_NORMAL_RANDOM_DIFFICULTY_ID = "normal-random";
export const SHOOTER_EASY_RANDOM_RANGE_LABEL = "개방현~3프렛 · # 없이 랜덤";
export const SHOOTER_NORMAL_RANDOM_RANGE_LABEL = "개방현~3프렛 · # 포함 랜덤";

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
