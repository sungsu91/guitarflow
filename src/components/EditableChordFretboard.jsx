import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  addChordFretboardNote,
  cloneChordFretboardSnapshot,
  removeChordFretboardNote,
} from "../rhythm/chordFretboardState.js";
import Fretboard from "./Fretboard";

const EDITABLE_FRETBOARD_SELECTION = Object.freeze(["__editable-chord-note__"]);

const EditableChordFretboard = memo(forwardRef(function EditableChordFretboard({
  className = "",
  initialFretboard,
  rootNote = "",
}, ref) {
  const [draft, setDraft] = useState(() => cloneChordFretboardSnapshot(initialFretboard, rootNote));

  useImperativeHandle(ref, () => ({
    getSnapshot: () => cloneChordFretboardSnapshot(draft, rootNote),
  }), [draft, rootNote]);

  const displayNotes = useMemo(() => draft.notes.map((note) => ({
    ...note,
    label: note.noteName,
    isCurrent: false,
    isRoot: note.noteName === rootNote,
  })), [draft.notes, rootNote]);

  const addNote = useCallback((note) => {
    setDraft((current) => addChordFretboardNote(
      current,
      note?.stringNumber,
      note?.fretNumber,
      rootNote,
    ));
  }, [rootNote]);

  const deleteNote = useCallback((note) => {
    setDraft((current) => removeChordFretboardNote(
      current,
      note?.stringNumber,
      note?.fretNumber,
      rootNote,
    ));
  }, [rootNote]);

  return (
    <Fretboard
      barres={draft.barres}
      className={className}
      editable
      fretRange={draft.visibleFrets}
      mode="chord"
      notes={displayNotes}
      onEmptyPositionPress={addNote}
      onNoteDelete={deleteNote}
      rootNote=""
      selectedNotes={EDITABLE_FRETBOARD_SELECTION}
      showFretNumbers
      showStringNames={false}
      stringStates={draft.stringStates}
    />
  );
}));

export default EditableChordFretboard;
