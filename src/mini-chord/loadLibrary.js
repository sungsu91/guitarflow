import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
export const MINI_CHORD_EMPTY_SAVED_OPTION_ID = "mini-chord-saved-empty";

export function summarizeMiniChordLoadDescription(value, maxLength = 14) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim().split(/\s+·\s+/)[0];
  if (!normalized) return "";
  const characters = Array.from(normalized);
  if (characters.length <= maxLength) return normalized;
  return `${characters.slice(0, Math.max(1, maxLength - 1)).join("").trimEnd()}…`;
}

export function createMiniChordLoadLibrary(items = []) {
  const itemsById = new Map();
  const userIds = [];
  let recommendedCount = 0;
  const options = items.map((item) => {
    const isRecommended = item.libraryType === "recommended-progression";
    const facts = [
      Number.isFinite(item.barCount) ? formatMessage(ko["etudes.barValue1"], { value1: item.barCount }) : "",
      Number.isFinite(item.bpm) ? `${item.bpm} BPM` : "",
    ].filter(Boolean).join(" · ");
    itemsById.set(item.id, item);
    if (isRecommended) recommendedCount += 1;
    else userIds.push(item.id);
    return {
      id: item.id,
      label: item.title || (isRecommended ? ko["app.recommendedProgressions"] : ko["miniChord.savedChords"]),
      longLabel: `${item.title || ko["miniChord.miniChords"]}${facts ? ` · ${facts}` : ""}`,
      description: [summarizeMiniChordLoadDescription(item.description), facts].filter(Boolean).join(" · "),
      tabId: isRecommended ? "recommended" : "saved",
      deletable: !item.builtIn,
    };
  });

  if (!userIds.length) {
    options.push({
      id: MINI_CHORD_EMPTY_SAVED_OPTION_ID,
      label: ko["miniChord.noSavedChords"],
      description: ko["miniChord.saveChordsThenLoadThemHere"],
      tabId: "saved",
      disabled: true,
    });
  }

  return {
    itemsById,
    options,
    optionTabs: [
      { id: "recommended", label: ko["app.recommendedProgressions"], count: recommendedCount },
      { id: "saved", label: ko["miniChord.savedChords"], count: userIds.length },
    ],
    userIds,
  };
}
