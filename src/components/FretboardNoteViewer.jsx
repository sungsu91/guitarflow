import { localizeUi } from "../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import { memo, useMemo, useSyncExternalStore } from "react";
import {
  CHROMATIC_NOTES,
  getNoteDisplayName,
  getNoteSolfegeDisplayName,
} from "../music/noteNotation.js";
import {
  ALL_FRETBOARD_NOTES,
  NOTE_ACCIDENTAL_PREFERENCES,
} from "../fretboard/noteViewerStore.js";
import Fretboard from "./Fretboard";

function useFretboardNoteViewerSnapshot(store) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export const FretboardNoteViewerTitle = memo(function FretboardNoteViewerTitle({ store }) {
  const { accidentalPreference, noteFilter } = useFretboardNoteViewerSnapshot(store);
  if (noteFilter === ALL_FRETBOARD_NOTES) return <strong><Translation id="app.allNotes" /></strong>;
  return (
    <strong>
      {getNoteDisplayName(noteFilter, accidentalPreference)} / {getNoteSolfegeDisplayName(noteFilter, accidentalPreference)}
    </strong>
  );
});

export const FretboardNoteViewerBoard = memo(function FretboardNoteViewerBoard({
  fretRange,
  notes,
  onNotePress,
  store,
}) {
  const { accidentalPreference, noteFilter } = useFretboardNoteViewerSnapshot(store);
  const selectedNotes = useMemo(
    () => noteFilter === ALL_FRETBOARD_NOTES ? CHROMATIC_NOTES : [noteFilter],
    [noteFilter],
  );
  const displayNotes = useMemo(() => notes.map((note) => ({
    ...note,
    displayPitch: getNoteDisplayName(note.pitch, accidentalPreference),
    isRoot: noteFilter !== ALL_FRETBOARD_NOTES && note.noteName === noteFilter,
    label: getNoteDisplayName(note.noteName ?? note.pitch ?? note.label, accidentalPreference),
  })), [accidentalPreference, noteFilter, notes]);

  return (
    <Fretboard
      className={`viewerSharedFretboard allNotes ${noteFilter !== ALL_FRETBOARD_NOTES ? "noteFilterActive" : ""}`}
      fretRange={fretRange}
      mode="note"
      notes={displayNotes}
      onNotePress={onNotePress}
      rootNote={noteFilter === ALL_FRETBOARD_NOTES ? "" : noteFilter}
      selectedNotes={selectedNotes}
      showFretNumbers
      showOnlySelected
      showStringNames
    />
  );
});

export const FretboardNoteViewerControls = memo(function FretboardNoteViewerControls({ store }) {
  useLanguage();
  const { accidentalPreference, noteFilter } = useFretboardNoteViewerSnapshot(store);
  const isFlat = accidentalPreference === NOTE_ACCIDENTAL_PREFERENCES.FLAT;

  return (
    <div className="viewerNotePanel" aria-label={translateUi("components.chooseNote")}>
      <span><Translation id="components.chooseNote" /></span>
      <button
        aria-label={localizeUi(translateUi("components.currentlyValue1TapToUseValue2", { value1: isFlat ? ko["components.flats"] : ko["components.sharps"], value2: isFlat ? ko["components.sharps"] : ko["components.flats"] }))}
        className={`viewerNoteAccidentalControls ${isFlat ? "is-flat" : "is-sharp"}`}
        onClick={() => store.selectAccidental(
          isFlat ? NOTE_ACCIDENTAL_PREFERENCES.SHARP : NOTE_ACCIDENTAL_PREFERENCES.FLAT,
        )}
        type="button"
      >
        <span
          aria-hidden="true"
          className={`viewerNoteAccidentalOption viewerNoteAccidentalOption--sharp ${!isFlat ? "is-current" : ""}`}
        >
          #
        </span>
        <span
          aria-hidden="true"
          className={`viewerNoteAccidentalOption viewerNoteAccidentalOption--flat ${isFlat ? "is-current" : ""}`}
        >
          ♭
        </span>
      </button>
      <div className="viewerNoteButtons">
        <button
          aria-pressed={noteFilter === ALL_FRETBOARD_NOTES}
          className={noteFilter === ALL_FRETBOARD_NOTES ? "selected" : ""}
          onClick={() => store.selectNote(ALL_FRETBOARD_NOTES)}
          type="button"
        ><Translation id="app.all" /></button>
        {CHROMATIC_NOTES.map((note) => (
          <button
            aria-pressed={noteFilter === note}
            className={noteFilter === note ? "selected" : ""}
            key={note}
            onClick={() => store.selectNote(note)}
            type="button"
          >
            {getNoteDisplayName(note, accidentalPreference)}
          </button>
        ))}
      </div>
    </div>
  );
});
