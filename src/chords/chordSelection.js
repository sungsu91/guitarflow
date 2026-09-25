import ko from '../i18n/locales/ko.js';
import {isAdditionalChord} from './additionalChords.js';

export const CHORD_ACCIDENTAL_OPTIONS = [
  { id: "natural", label: ko["app.default"], suffix: "" },
  { id: "sharp", label: "#", suffix: "#" },
  { id: "flat", label: "b", suffix: "b" },
];

export const CHORD_QUALITY_OPTIONS = [
  { id: "major", label: "Major", shortLabel: "" },
  { id: "minor", label: "Minor", shortLabel: "" },
  { id: "dim", label: "Dim", shortLabel: "" },
  { id: "aug", label: "Aug", shortLabel: "" },
];

export const CHORD_EXTENSION_OPTIONS = [
  { id: "none", label: ko["app.default"], quality: "any" },
  { id: "7", label: "7", quality: "major" },
  { id: "maj7", label: "maj7", quality: "major" },
  { id: "m7", label: "7", quality: "minor" },
  { id: "m7b5", label: "7♭5", quality: "minor" },
  { id: "sus2", label: "sus2", quality: "major" },
  { id: "sus4", label: "sus4", quality: "major" },
  { id: "7sus4", label: "7sus4", quality: "major" },
  { id: "6", label: "6", quality: "major" },
  { id: "6/9", label: "6/9", quality: "major" },
  { id: "m6", label: "6", quality: "minor" },
  { id: "add9", label: "add9", quality: ["major", "minor"] },
  { id: "9", label: "9", quality: "major" },
  { id: "m9", label: "9", quality: "minor" },
  { id: "maj9", label: "maj9", quality: "major" },
  { id: "5", label: "5", quality: "major" },
  { id: "add2", label: "add2", quality: "major" },
  { id: "add11", label: "add11", quality: "major" },
  { id: "maj11", label: "maj11", quality: "major" },
  { id: "maj13", label: "maj13", quality: "major" },
  { id: "11", label: "11", quality: "major" },
  { id: "13", label: "13", quality: "major" },
  { id: "7b5", label: "7♭5", quality: "major" },
  { id: "7#5", label: "7♯5", quality: "major" },
  { id: "7b9", label: "7♭9", quality: "major" },
  { id: "7#9", label: "7♯9", quality: "major" },
  { id: "m11", label: "11", quality: "minor" },
  { id: "m13", label: "13", quality: "minor" },
  { id: "dim7", label: "dim7", quality: "dim" },
];

export function isChordExtensionAvailableForQuality(option, quality) {
  if (!option) return false;
  if (option.quality === "any") return true;
  if (Array.isArray(option.quality)) return option.quality.includes(quality);
  return option.quality === quality;
}

export function normalizeChordExtensionForQuality(quality, extension) {
  const option = CHORD_EXTENSION_OPTIONS.find((item) => item.id === extension);
  if (isChordExtensionAvailableForQuality(option, quality)) return extension;
  return "none";
}


export function getChordDisplayRoot(baseRoot, accidental = "natural") {
  const suffix = CHORD_ACCIDENTAL_OPTIONS.find((option) => option.id === accidental)?.suffix ?? "";
  return `${baseRoot}${suffix}`;
}

export function getChordNameFromParts(baseRoot, accidental, quality, extension) {
  const root = getChordDisplayRoot(baseRoot, accidental);
  if (isAdditionalChord(quality, extension)) return `${root}${extension}`;
  if (quality === "dim") return `${root}dim`;
  if (quality === "aug") return `${root}aug`;
  if (quality === "minor") {
    if (extension === "m7") return `${root}m7`;
    if (extension === "m7b5") return `${root}m7b5`;
    if (extension === "m6") return `${root}m6`;
    if (extension === "m9") return `${root}m9`;
    if (extension === "add9") return `${root}m(add9)`;
    return `${root}m`;
  }
  if (extension === "7") return `${root}7`;
  if (extension === "maj7") return `${root}maj7`;
  if (extension === "9") return `${root}9`;
  if (extension === "maj9") return `${root}maj9`;
  if (extension === "sus2") return `${root}sus2`;
  if (extension === "sus4") return `${root}sus4`;
  if (extension === "7sus4") return `${root}7sus4`;
  if (extension === "6") return `${root}6`;
  if (extension === "6/9") return `${root}6/9`;
  if (extension === "add9") return `${root}add9`;
  return root;
}

