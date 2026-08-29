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
  if (noteFilter === ALL_FRETBOARD_NOTES) return <strong>전체 음표</strong>;
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
  const { accidentalPreference, noteFilter } = useFretboardNoteViewerSnapshot(store);

  return (
    <div className="viewerNotePanel" aria-label="음표 선택">
      <span>음표 선택</span>
      <div className="viewerNoteAccidentalControls" aria-label="음표 변화표 표기" role="group">
        <button
          aria-label="음표를 샵으로 표기"
          aria-pressed={accidentalPreference === NOTE_ACCIDENTAL_PREFERENCES.SHARP}
          className={accidentalPreference === NOTE_ACCIDENTAL_PREFERENCES.SHARP ? "selected" : ""}
          onClick={() => store.selectAccidental(NOTE_ACCIDENTAL_PREFERENCES.SHARP)}
          type="button"
        >
          #
        </button>
        <button
          aria-label="음표를 플랫으로 표기"
          aria-pressed={accidentalPreference === NOTE_ACCIDENTAL_PREFERENCES.FLAT}
          className={accidentalPreference === NOTE_ACCIDENTAL_PREFERENCES.FLAT ? "selected" : ""}
          onClick={() => store.selectAccidental(NOTE_ACCIDENTAL_PREFERENCES.FLAT)}
          type="button"
        >
          b
        </button>
      </div>
      <div className="viewerNoteButtons">
        <button
          aria-pressed={noteFilter === ALL_FRETBOARD_NOTES}
          className={noteFilter === ALL_FRETBOARD_NOTES ? "selected" : ""}
          onClick={() => store.selectNote(ALL_FRETBOARD_NOTES)}
          type="button"
        >
          전체
        </button>
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
