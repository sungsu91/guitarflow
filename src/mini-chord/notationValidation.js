import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
function markEntries(marks = {}, barCount = 4) {
  const safeBarCount = Math.max(1, Math.round(Number(barCount) || 1));
  return Object.entries(marks && typeof marks === "object" ? marks : {})
    .map(([key, mark]) => ({ barIndex: Number(key), mark: mark ?? {} }))
    .filter(({ barIndex }) => Number.isInteger(barIndex) && barIndex >= 0 && barIndex < safeBarCount)
    .sort((left, right) => left.barIndex - right.barIndex);
}

function normalizedRanges(ranges = [], barCount = 4) {
  const safeBarCount = Math.max(1, Math.round(Number(barCount) || 1));
  return (Array.isArray(ranges) ? ranges : [])
    .map((range) => ({
      endingNumber: Math.round(Number(range?.endingNumber ?? range?.number ?? 0)),
      startBar: Math.max(0, Math.min(safeBarCount - 1, Math.round(Number(range?.startBar) || 0))),
      endBar: Math.max(0, Math.min(safeBarCount - 1, Math.round(Number(range?.endBar ?? range?.startBar) || 0))),
    }))
    .filter((range) => range.endingNumber >= 1 && range.endingNumber <= 5)
    .map((range) => ({ ...range, startBar: Math.min(range.startBar, range.endBar), endBar: Math.max(range.startBar, range.endBar) }))
    .sort((left, right) => left.startBar - right.startBar || left.endingNumber - right.endingNumber);
}

function sameTarget(mark, marker, targetIndex) {
  if (mark?.marker !== marker) return false;
  if (marker === "fine") return true;
  return Math.max(1, Math.round(Number(mark.markerIndex) || 1)) === Math.max(1, Math.round(Number(targetIndex) || 1));
}

function findMarker(entries, marker, targetIndex, excludedBar = null) {
  return entries.find(({ barIndex, mark }) => barIndex !== excludedBar && sameTarget(mark, marker, targetIndex));
}

function findCommandEntries(entries, excludedBar = null) {
  return entries.filter(({ barIndex, mark }) => barIndex !== excludedBar && Boolean(mark?.command));
}

function commandNeedsMarker(command, marker) {
  if (marker === "segno") return String(command).startsWith("ds");
  if (marker === "fine") return command === "dcAlFine" || command === "dsAlFine";
  if (marker === "toCoda" || marker === "coda") return command === "dcAlCoda" || command === "dsAlCoda";
  return false;
}

export function validateMiniChordRepeatEdit({
  barCount = 4,
  barIndex = 0,
  enabled = true,
  endingRanges = [],
  marks = {},
  type = "start",
} = {}) {
  const entries = markEntries(marks, barCount);
  const current = marks?.[barIndex] ?? marks?.[String(barIndex)] ?? {};
  const key = type === "end" ? "repeatEnd" : "repeatStart";
  if (enabled && current[key]) return { valid: false, message: ko["miniChord.theSameRepeatMarkingIsAlreadySet"] };

  if (enabled && type === "end") {
    const hasStart = entries.some(({ barIndex: index, mark }) => index <= barIndex && mark.repeatStart);
    if (!hasStart) return { valid: false, message: ko["miniChord.aRepeatStartIsRequired"] };
  }

  const ranges = normalizedRanges(endingRanges, barCount);
  if (!enabled && type === "start") {
    const nextEnd = entries.find(({ barIndex: index, mark }) => index >= barIndex && mark.repeatEnd);
    const hasLaterStart = nextEnd && entries.some(({ barIndex: index, mark }) => (
      index > barIndex && index <= nextEnd.barIndex && mark.repeatStart
    ));
    const ownsEnding = ranges.some((range) => (
      range.startBar >= barIndex && (!nextEnd || range.startBar <= nextEnd.barIndex)
    ));
    if ((nextEnd && !hasLaterStart) || ownsEnding) {
      return { valid: false, message: ko["miniChord.removeTheConnectedRepeatEndAndEndingsFirst"] };
    }
  }
  if (!enabled && type === "end") {
    const ownsEnding = ranges.some((range) => {
      if (range.endingNumber !== 1 || range.startBar > barIndex) return false;
      const earlierEnd = entries.some(({ barIndex: index, mark }) => (
        mark.repeatEnd && index >= range.startBar && index < barIndex
      ));
      return !earlierEnd;
    });
    if (ownsEnding) return { valid: false, message: ko["miniChord.removeTheEndingsThatUseThisRepeatFirst"] };
  }
  return { valid: true, message: "" };
}

export function validateMiniChordEndingEdit({
  barCount = 4,
  barIndex = 0,
  endingNumber = 1,
  endingRanges = [],
  marks = {},
} = {}) {
  const safeEnding = Math.max(1, Math.min(5, Math.round(Number(endingNumber) || 1)));
  const entries = markEntries(marks, barCount);
  const ranges = normalizedRanges(endingRanges, barCount);
  const current = ranges.find((range) => barIndex >= range.startBar && barIndex <= range.endBar);
  const existing = ranges.find((range) => range.endingNumber === safeEnding);

  if (current?.endingNumber === safeEnding) {
    const higherExists = ranges.some((range) => range.endingNumber > safeEnding);
    return higherExists
      ? { valid: false, message: ko["miniChord.removeHigherNumberedEndingsFirst"] }
      : { valid: true, message: "" };
  }

  if (existing && barIndex !== existing.startBar - 1 && barIndex !== existing.endBar + 1) {
    return { valid: false, message: ko["miniChord.anEndingCanOnlyExtendIntoAnAdjacentBarWithTheSame"] };
  }

  if (safeEnding === 1) {
    const hasStart = entries.some(({ barIndex: index, mark }) => index <= barIndex && mark.repeatStart);
    const hasEnd = entries.some(({ barIndex: index, mark }) => index >= barIndex && mark.repeatEnd);
    if (!hasStart || !hasEnd) return { valid: false, message: ko["miniChord.ending1NeedsBothARepeatStartAndARepeatEnd"] };
    return { valid: true, message: "" };
  }

  for (let required = 1; required < safeEnding; required += 1) {
    if (!ranges.some((range) => range.endingNumber === required)) {
      return { valid: false, message: formatMessage(ko["miniChord.setEndingValueFirst"], { value1: required }) };
    }
  }
  const previous = ranges.find((range) => range.endingNumber === safeEnding - 1);
  if (previous && barIndex <= previous.endBar) {
    return { valid: false, message: formatMessage(ko["miniChord.placeEndingValueAfterEndingValue"], { value1: safeEnding, value2: safeEnding - 1 }) };
  }
  const first = ranges.find((range) => range.endingNumber === 1);
  const firstHasRepeatEnd = first && entries.some(({ barIndex: index, mark }) => (
    mark.repeatEnd && index >= first.startBar && index <= first.endBar
  ));
  if (!firstHasRepeatEnd) return { valid: false, message: ko["miniChord.ending1NeedsARepeatEndMarking"] };
  return { valid: true, message: "" };
}

export function validateMiniChordMarkerEdit({
  barCount = 4,
  barIndex = 0,
  marker = "",
  markerIndex = 1,
  marks = {},
} = {}) {
  const entries = markEntries(marks, barCount);
  const current = marks?.[barIndex] ?? marks?.[String(barIndex)] ?? {};
  const safeIndex = Math.max(1, Math.min(5, Math.round(Number(markerIndex) || 1)));

  if (!marker) {
    const oldMarker = current.marker;
    const oldIndex = Math.max(1, Math.round(Number(current.markerIndex) || 1));
    if (oldMarker === "coda" && findMarker(entries, "toCoda", oldIndex, barIndex)) {
      return { valid: false, message: ko["miniChord.removeTheToCodaReferencingThisCodaFirst"] };
    }
    const referencing = findCommandEntries(entries, barIndex).find(({ mark }) => (
      commandNeedsMarker(mark.command, oldMarker)
      && (oldMarker === "fine" || Math.max(1, Math.round(Number(mark.targetIndex) || 1)) === oldIndex)
    ));
    return referencing
      ? { valid: false, message: ko["miniChord.removeTheJumpInstructionReferencingThisSymbolFirst"] }
      : { valid: true, message: "" };
  }

  if (current.command) return { valid: false, message: ko["miniChord.removeTheJumpInstructionInTheSameBarFirst"] };
  if (sameTarget(current, marker, safeIndex)) return { valid: false, message: ko["miniChord.theSameSymbolIsAlreadySet"] };
  if (findMarker(entries, marker, safeIndex, barIndex)) {
    return { valid: false, message: marker === "fine" ? ko["miniChord.aProgressionCanContainOnlyOneFine"] : formatMessage(ko["miniChord.theSameValueTargetAlreadyExists"], { value1: marker === "toCoda" ? "To Coda" : marker === "coda" ? "Coda" : "Segno" }) };
  }

  if (marker === "toCoda") {
    const coda = findMarker(entries, "coda", safeIndex);
    if (!coda) return { valid: false, message: ko["miniChord.aCodaSymbolIsNeededAsTheTarget"] };
    if (coda.barIndex <= barIndex) return { valid: false, message: ko["miniChord.codaMustBeInABarAfterToCoda"] };
  }
  if (marker === "coda") {
    const toCoda = findMarker(entries, "toCoda", safeIndex);
    if (toCoda && toCoda.barIndex >= barIndex) return { valid: false, message: ko["miniChord.codaMustBeInABarAfterToCoda"] };
  }
  return { valid: true, message: "" };
}

export function validateMiniChordCommandEdit({
  barCount = 4,
  barIndex = 0,
  command = "",
  marks = {},
  targetIndex = 1,
} = {}) {
  if (!command) return { valid: true, message: "" };
  const entries = markEntries(marks, barCount);
  const current = marks?.[barIndex] ?? marks?.[String(barIndex)] ?? {};
  const safeIndex = Math.max(1, Math.min(5, Math.round(Number(targetIndex) || 1)));
  if (current.marker) return { valid: false, message: ko["miniChord.removeTheLocationSymbolInTheSameBarFirst"] };
  if (current.command === command && Math.max(1, Math.round(Number(current.targetIndex) || 1)) === safeIndex) {
    return { valid: false, message: ko["miniChord.theSameJumpInstructionIsAlreadySet"] };
  }
  if (findCommandEntries(entries, barIndex).length) {
    return { valid: false, message: ko["miniChord.aProgressionCanContainOnlyOneJumpInstruction"] };
  }
  if (barIndex === 0) return { valid: false, message: ko["miniChord.placeTheJumpInstructionAfterTheFirstBar"] };

  const segno = findMarker(entries, "segno", safeIndex);
  const fine = findMarker(entries, "fine", 1);
  const toCoda = findMarker(entries, "toCoda", safeIndex);
  const coda = findMarker(entries, "coda", safeIndex);
  if (String(command).startsWith("ds") && !segno) return { valid: false, message: ko["miniChord.aSegnoSymbolIsNeededAsTheTarget"] };
  if (segno && segno.barIndex >= barIndex) return { valid: false, message: ko["miniChord.segnoMustBeInABarBeforeTheDSInstruction"] };
  if ((command === "dcAlFine" || command === "dsAlFine") && !fine) return { valid: false, message: ko["miniChord.aFineSymbolIsNeededAsTheTarget"] };
  if ((command === "dcAlFine" || command === "dsAlFine") && fine.barIndex >= barIndex) {
    return { valid: false, message: ko["miniChord.fineMustBeInABarBeforeTheJumpInstruction"] };
  }
  if (command === "dcAlCoda" || command === "dsAlCoda") {
    if (!toCoda || !coda) return { valid: false, message: ko["miniChord.toCodaAndCodaMustHaveMatchingNumbers"] };
    if (toCoda.barIndex >= barIndex) return { valid: false, message: ko["miniChord.toCodaMustBeInABarBeforeTheJumpInstruction"] };
    if (coda.barIndex <= barIndex) return { valid: false, message: ko["miniChord.codaMustBeInABarAfterTheJumpInstruction"] };
    if (segno && toCoda.barIndex <= segno.barIndex) return { valid: false, message: ko["miniChord.toCodaMustComeAfterSegno"] };
  }
  return { valid: true, message: "" };
}
