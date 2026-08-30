import { memo, useEffect, useRef, useState } from "react";
import {
  LICK_TECHNIQUES,
  buildLickTechniqueRelations,
  getLickBendAmountLabel,
  getLickTechniqueLabel,
  getLickTechniqueSymbol,
  isLickHarmonicStep,
  isLickMuteStep,
  isLickRestStep,
  normalizeLickTechnique,
} from "../music/lickTechniques";
import { CHROMATIC_NOTES, NOTE_INDEX } from "../music/noteNotation.js";

const STANDARD_TUNING = [
  { stringNumber: 1, pitch: "E4" },
  { stringNumber: 2, pitch: "B3" },
  { stringNumber: 3, pitch: "G3" },
  { stringNumber: 4, pitch: "D3" },
  { stringNumber: 5, pitch: "A2" },
  { stringNumber: 6, pitch: "E2" },
];

const NOTE_COLORS = {
  C: { fill: "#38bdf8", text: "#03131f" },
  D: { fill: "#a78bfa", text: "#130b2e" },
  E: { fill: "#22d3ee", text: "#042026" },
  F: { fill: "#fb7185", text: "#310711" },
  G: { fill: "#4ade80", text: "#06210f" },
  A: { fill: "#facc15", text: "#241a02" },
  B: { fill: "#f472b6", text: "#2b0719" },
};

const notePressFeedbacks = new WeakMap();
const BARRE_LONG_PRESS_MS = 460;
const BARRE_MOVE_TOLERANCE_PX = 10;

function triggerNotePressFeedback(element) {
  if (!element) return;
  const previousFeedback = notePressFeedbacks.get(element);
  if (previousFeedback?.animation) {
    previousFeedback.animation.oncancel = null;
    previousFeedback.animation.onfinish = null;
    previousFeedback.animation.cancel();
  }
  if (previousFeedback?.timer) window.clearTimeout(previousFeedback.timer);
  element.classList.remove("is-pressed");
  element.classList.remove("is-pressed--fallback");
  element.classList.add("is-pressed");

  const release = (feedback) => {
    if (notePressFeedbacks.get(element) !== feedback) return;
    element.classList.remove("is-pressed");
    element.classList.remove("is-pressed--fallback");
    notePressFeedbacks.delete(element);
  };

  if (typeof element.animate === "function" && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    const animation = element.animate(
      [
        { filter: "brightness(1)", transform: "translate(-50%, -50%) scale(1)" },
        { filter: "brightness(1.1)", offset: 0.46, transform: "translate(-50%, -50%) scale(1.08)" },
        { filter: "brightness(1)", transform: "translate(-50%, -50%) scale(1)" },
      ],
      {
        duration: 160,
        easing: "cubic-bezier(0.22, 0.72, 0.25, 1)",
      },
    );
    const feedback = { animation };
    animation.onfinish = () => release(feedback);
    animation.oncancel = () => release(feedback);
    notePressFeedbacks.set(element, feedback);
    return;
  }

  element.classList.add("is-pressed--fallback");
  const feedback = {
    timer: window.setTimeout(() => release(feedback), 160),
  };
  notePressFeedbacks.set(element, feedback);
}

function pitchToMidi(pitch) {
  const match = /^([A-G]#?)(\d)$/.exec(pitch ?? "");
  if (!match) return null;
  return (Number(match[2]) + 1) * 12 + NOTE_INDEX[match[1]];
}

function midiToPitch(midi) {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${CHROMATIC_NOTES[noteIndex]}${octave}`;
}

function getPitchClass(pitch) {
  return pitch?.replace(/\d+/g, "") ?? "";
}

function getNoteStyle(noteName) {
  const color = NOTE_COLORS[noteName?.[0]] ?? NOTE_COLORS.C;
  return {
    "--fretboard-note-fill": color.fill,
    "--fretboard-note-text": color.text,
  };
}

function normalizeFretRange(fretRange) {
  const [rawStart = 0, rawEnd = 12] = fretRange ?? [];
  const start = Math.max(0, Number(rawStart) || 0);
  const end = Math.max(start + 1, Number(rawEnd) || 12);
  return [start, end];
}

function buildFretNumbers(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function buildGeneratedNotes({ fretRange, selectedNotes, showOnlySelected }) {
  const [start, end] = normalizeFretRange(fretRange);
  const selected = new Set(selectedNotes ?? []);
  return STANDARD_TUNING.flatMap((stringInfo) => {
    const openMidi = pitchToMidi(stringInfo.pitch);
    return buildFretNumbers(start, end).map((fretNumber) => {
      const pitch = midiToPitch(openMidi + fretNumber);
      const noteName = getPitchClass(pitch);
      return {
        id: `fretboard-s${stringInfo.stringNumber}-f${fretNumber}`,
        stringNumber: stringInfo.stringNumber,
        fretNumber,
        pitch,
        noteName,
      };
    });
  }).filter((note) => !showOnlySelected || selected.size === 0 || selected.has(note.noteName));
}

export function prepareLickTabSteps(tabSteps) {
  const steps = Array.isArray(tabSteps) ? tabSteps : [];
  return steps.map((step, index) => {
    return {
      ...step,
      tabId: step.id ?? `tab-step-${index + 1}`,
      tabIndex: index,
      order: step.order ?? index + 1,
      technique: normalizeLickTechnique(step.technique),
    };
  });
}

export function buildLickTabConnections(tabSteps) {
  const steps = Array.isArray(tabSteps) ? tabSteps : [];
  return buildLickTechniqueRelations(steps).map((relation) => ({
    ...relation,
    id: `${relation.from.tabId}-to-${relation.to.tabId}-${relation.technique}`,
    symbol: getLickTechniqueSymbol(relation.technique),
    label: getLickTechniqueLabel(relation.technique),
    isActive: Boolean(relation.from.isActive || relation.to.isActive),
  }));
}

function getTabStepDisplay(step) {
  if (isLickRestStep(step)) return "𝄽";
  if (isLickMuteStep(step)) return "x";
  return String(Number(step?.fretNumber));
}

function Fretboard({
  barres = [],
  className = "",
  editable = false,
  fretRange = [0, 12],
  mode = "notes",
  notes,
  rootNote = "",
  selectedNotes = [],
  showFingering = false,
  showFretNumbers = true,
  showOnlySelected = true,
  showStringNames = true,
  stringStates = {},
  tabSteps = [],
  notation = "notes",
  onBarreCreate,
  onBarreDelete,
  onEmptyPositionPress,
  onNoteDelete,
  onNotePress,
}) {
  const [deleteTargetKey, setDeleteTargetKey] = useState("");
  const [barreDeleteTargetKey, setBarreDeleteTargetKey] = useState("");
  const [barreDraft, setBarreDraft] = useState(null);
  const fretboardScrollerRef = useRef(null);
  const barreGestureRef = useRef(null);
  const barreLongPressTimerRef = useRef(null);
  const suppressedEditableClickRef = useRef(null);
  const [startFret, endFret] = normalizeFretRange(fretRange);
  const visualStartFret = Math.max(1, startFret);
  const visualEndFret = Math.max(visualStartFret, endFret);
  const fretNumbers = buildFretNumbers(visualStartFret, visualEndFret);
  const renderNotes = notes ?? buildGeneratedNotes({ fretRange, selectedNotes, showOnlySelected });
  const isTabMode = notation === "tab";
  const preparedTabSteps = isTabMode ? prepareLickTabSteps(tabSteps) : [];
  const tabConnections = isTabMode ? buildLickTabConnections(preparedTabSteps) : [];
  const tabSlotCount = Math.max(1, preparedTabSteps.length);
  const displayColumns = isTabMode ? preparedTabSteps : fretNumbers;
  const visibleNoteIds = new Set();
  const selected = new Set(selectedNotes);
  const openNotesByString = new Map();
  const occupiedPositions = editable ? new Set() : null;

  renderNotes.forEach((note) => {
    occupiedPositions?.add(`${Number(note.stringNumber)}-${Number(note.fretNumber)}`);
    if (Number(note.fretNumber) !== 0) return;
    if (openNotesByString.has(note.stringNumber)) return;
    openNotesByString.set(note.stringNumber, note);
  });

  const getXRatio = (fretNumber) => {
    return (fretNumber - visualStartFret + 0.5) / Math.max(1, fretNumbers.length);
  };
  const getTabXRatio = (tabIndex) => (Number(tabIndex) + 0.5) / tabSlotCount;
  const getEditablePosition = (stringInfo, fretNumber) => {
    const openMidi = pitchToMidi(stringInfo.pitch);
    const pitch = midiToPitch(openMidi + Number(fretNumber));
    return {
      id: `editable-s${stringInfo.stringNumber}-f${fretNumber}`,
      stringNumber: stringInfo.stringNumber,
      fretNumber: Number(fretNumber),
      pitch,
      octaveNote: pitch,
      noteName: getPitchClass(pitch),
    };
  };
  const getEditablePositionKey = (note) => `${Number(note?.stringNumber)}-${Number(note?.fretNumber)}`;
  const getBarreKey = (barre) => {
    const fromString = Number(barre?.fromString);
    const toString = Number(barre?.toString);
    return `${Number(barre?.fret)}-${Math.min(fromString, toString)}-${Math.max(fromString, toString)}`;
  };
  const clearBarreLongPressTimer = () => {
    if (barreLongPressTimerRef.current == null) return;
    window.clearTimeout(barreLongPressTimerRef.current);
    barreLongPressTimerRef.current = null;
  };
  const releaseBarrePointerCapture = (gesture) => {
    if (!gesture?.target?.hasPointerCapture?.(gesture.pointerId)) return;
    gesture.target.releasePointerCapture(gesture.pointerId);
  };
  const getClosestStringNumber = (clientY) => {
    const rows = fretboardScrollerRef.current?.querySelectorAll?.(".fretboardStringRow");
    if (!rows?.length) return null;
    let closestString = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    rows.forEach((row, index) => {
      const bounds = row.getBoundingClientRect();
      const distance = Math.abs(clientY - (bounds.top + bounds.height / 2));
      if (distance >= closestDistance) return;
      closestDistance = distance;
      closestString = index + 1;
    });
    return closestString;
  };
  const consumeSuppressedEditableClick = (event, note) => {
    const suppression = suppressedEditableClickRef.current;
    if (!suppression || suppression.until < Date.now()) {
      suppressedEditableClickRef.current = null;
      return false;
    }
    if (suppression.positionKey !== getEditablePositionKey(note)) return false;
    event.preventDefault();
    event.stopPropagation();
    suppressedEditableClickRef.current = null;
    return true;
  };
  const consumeSuppressedBarreClick = (event) => {
    const suppression = suppressedEditableClickRef.current;
    if (!suppression || suppression.until < Date.now()) {
      suppressedEditableClickRef.current = null;
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    suppressedEditableClickRef.current = null;
    return true;
  };
  const openDeleteMenu = (event, note) => {
    if (!editable || !note) return;
    if (consumeSuppressedEditableClick(event, note)) return;
    event.stopPropagation();
    setBarreDeleteTargetKey("");
    setDeleteTargetKey(getEditablePositionKey(note));
  };
  const addEditableNote = (event, note) => {
    if (!editable || !onEmptyPositionPress || !note) return;
    if (consumeSuppressedEditableClick(event, note)) return;
    event.stopPropagation();
    setDeleteTargetKey("");
    setBarreDeleteTargetKey("");
    onEmptyPositionPress(note);
  };
  const deleteEditableNote = (event, note) => {
    if (!editable || !onNoteDelete || !note) return;
    event.preventDefault();
    event.stopPropagation();
    setDeleteTargetKey("");
    setBarreDeleteTargetKey("");
    onNoteDelete(note);
  };
  const openBarreDeleteMenu = (event, barre) => {
    if (!editable || !onBarreDelete || !barre) return;
    if (consumeSuppressedBarreClick(event)) return;
    event.stopPropagation();
    setDeleteTargetKey("");
    setBarreDeleteTargetKey(getBarreKey(barre));
  };
  const deleteEditableBarre = (event, barre) => {
    if (!editable || !onBarreDelete || !barre) return;
    event.preventDefault();
    event.stopPropagation();
    setBarreDeleteTargetKey("");
    onBarreDelete(barre);
  };
  const handleBarreKeyDown = (event, barre) => {
    if (!editable || !onBarreDelete || !barre || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    openBarreDeleteMenu(event, barre);
  };
  const beginBarreGesture = (event, note) => {
    const fret = Number(note?.fretNumber);
    const fromString = Number(note?.stringNumber);
    if (
      !editable
      || !onBarreCreate
      || !Number.isFinite(fret)
      || fret <= 0
      || !Number.isInteger(fromString)
      || fromString < 1
      || fromString > 6
      || (event.pointerType === "mouse" && event.button !== 0)
      || event.target?.closest?.(".fretboardNoteDeleteButton, .fretboardBarreDeleteButton")
    ) return;

    clearBarreLongPressTimer();
    const pointerId = event.pointerId;
    const positionKey = getEditablePositionKey(note);
    const target = event.currentTarget;
    target.setPointerCapture?.(pointerId);
    barreGestureRef.current = {
      activated: false,
      cancelled: false,
      currentString: fromString,
      fret,
      fromString,
      pointerId,
      positionKey,
      startX: event.clientX,
      startY: event.clientY,
      target,
    };
    barreLongPressTimerRef.current = window.setTimeout(() => {
      const gesture = barreGestureRef.current;
      if (!gesture || gesture.pointerId !== pointerId || gesture.cancelled) return;
      gesture.activated = true;
      barreLongPressTimerRef.current = null;
      suppressedEditableClickRef.current = {
        positionKey,
        until: Date.now() + 900,
      };
      setDeleteTargetKey("");
      setBarreDeleteTargetKey("");
      setBarreDraft({
        fret,
        fromString,
        toString: fromString,
      });
    }, BARRE_LONG_PRESS_MS);
  };
  const moveBarreGesture = (event) => {
    const gesture = barreGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.cancelled) return;
    if (!gesture.activated) {
      const distance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
      if (distance > BARRE_MOVE_TOLERANCE_PX) {
        gesture.cancelled = true;
        clearBarreLongPressTimer();
        suppressedEditableClickRef.current = {
          positionKey: gesture.positionKey,
          until: Date.now() + 500,
        };
      }
      return;
    }
    event.preventDefault();
    const toString = getClosestStringNumber(event.clientY) ?? gesture.currentString;
    if (toString === gesture.currentString) return;
    gesture.currentString = toString;
    setBarreDraft({
      fret: gesture.fret,
      fromString: gesture.fromString,
      toString,
    });
  };
  const finishBarreGesture = (event, cancelled = false) => {
    const gesture = barreGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    clearBarreLongPressTimer();
    releaseBarrePointerCapture(gesture);
    barreGestureRef.current = null;
    setBarreDraft(null);
    if (!gesture.activated || gesture.cancelled || cancelled) return;
    event.preventDefault();
    event.stopPropagation();
    const toString = getClosestStringNumber(event.clientY) ?? gesture.currentString;
    suppressedEditableClickRef.current = {
      positionKey: gesture.positionKey,
      until: Date.now() + 900,
    };
    if (toString === gesture.fromString) return;
    onBarreCreate({
      fret: gesture.fret,
      fromString: gesture.fromString,
      toString,
    });
  };
  const preventEditableContextMenu = (event) => {
    if (!editable || !onBarreCreate) return;
    event.preventDefault();
  };
  const activateNote = (event, note) => {
    if (!onNotePress || !note) return;
    event.stopPropagation();
    triggerNotePressFeedback(event.currentTarget);
    onNotePress(note);
  };
  const handleNoteKeyDown = (event, note) => {
    if ((!onNotePress && !editable) || !note || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    if (editable) openDeleteMenu(event, note);
    else activateNote(event, note);
  };

  useEffect(() => {
    if (!editable || (!deleteTargetKey && !barreDeleteTargetKey) || typeof document === "undefined") return undefined;
    const closeDeleteMenu = (event) => {
      if (
        (deleteTargetKey && event.target?.closest?.(`[data-fretboard-delete-target="${deleteTargetKey}"]`))
        || (barreDeleteTargetKey && event.target?.closest?.(`[data-fretboard-barre-delete-target="${barreDeleteTargetKey}"]`))
      ) return;
      setDeleteTargetKey("");
      setBarreDeleteTargetKey("");
    };
    document.addEventListener("pointerdown", closeDeleteMenu);
    return () => document.removeEventListener("pointerdown", closeDeleteMenu);
  }, [barreDeleteTargetKey, deleteTargetKey, editable]);

  useEffect(() => () => {
    if (barreLongPressTimerRef.current != null) {
      window.clearTimeout(barreLongPressTimerRef.current);
    }
  }, []);

  return (
    <div
      className={`fretboardComponent fretboardComponent--${mode} ${isTabMode ? "fretboardComponent--tab" : ""} ${editable ? "fretboardComponent--editable" : ""} ${className}`}
      onClick={editable ? () => {
        setDeleteTargetKey("");
        setBarreDeleteTargetKey("");
      } : undefined}
      style={{
        "--fret-count": isTabMode ? tabSlotCount : Math.max(1, visualEndFret - visualStartFret + 1),
        "--fret-slot-count": isTabMode ? tabSlotCount : fretNumbers.length,
        "--lick-step-count": tabSlotCount,
      }}
    >
      <div className="fretboardComponentScroller" ref={fretboardScrollerRef}>
        <div className="fretboardNut" aria-hidden="true" />
        {showFretNumbers && (
          <div className="fretboardFretNumbers" style={{ gridTemplateColumns: `repeat(${displayColumns.length}, minmax(34px, 1fr))` }}>
            {displayColumns.map((item, index) => (
              <span className={isTabMode && item.isActive ? "active" : ""} key={isTabMode ? item.tabId : item}>
                {isTabMode ? item.order ?? index + 1 : item}
              </span>
            ))}
          </div>
        )}
        <div className="fretboardGrid" style={{ gridTemplateColumns: `repeat(${displayColumns.length}, minmax(34px, 1fr))` }}>
          {displayColumns.map((item, index) => (
            <i key={isTabMode ? `step-${item.tabId}` : `fret-${item ?? index}`} />
          ))}
        </div>
        <div className="fretboardStrings">
          {STANDARD_TUNING.map((stringInfo) => {
            const stringState = stringStates[stringInfo.stringNumber];
            const openNote = openNotesByString.get(stringInfo.stringNumber);
            const openLabel = openNote?.label ?? openNote?.noteName ?? getPitchClass(openNote?.pitch);
            const openAccessiblePitch = openNote?.displayPitch ?? openNote?.pitch ?? openLabel;
            const isOpenCurrent = Boolean(openNote?.isCurrent || openNote?.current || openNote?.isActive);
            const isOpenSelected = Boolean(openNote && (selected.size === 0 || selected.has(openNote.noteName)));
            return (
              <div className="fretboardStringRow" key={stringInfo.stringNumber}>
                {showStringNames && (
                  <span>
                    {stringInfo.stringNumber}번줄 {getPitchClass(stringInfo.pitch)}
                  </span>
                )}
                <i />
                {stringState && !(editable && !isTabMode) ? (
                  <em className={`fretboardStringState ${stringState}`}>
                    {String(stringState).toUpperCase()}
                  </em>
                ) : !isTabMode && openNote ? (
                  <em
                    aria-label={editable ? `${openAccessiblePitch}, ${stringInfo.stringNumber}번줄 개방현 삭제 메뉴 열기` : onNotePress ? `${openAccessiblePitch}, ${stringInfo.stringNumber}번줄 개방현 소리 듣기` : undefined}
                    className={`fretboardStringState noteOpen ${openNote.noteName === rootNote || openNote.isRoot ? "root" : ""} ${openNote.isActive ? "active" : ""} ${isOpenCurrent ? "current-note" : ""} ${isOpenSelected ? "selected" : ""} ${onNotePress || editable ? "is-interactive" : ""} ${deleteTargetKey === getEditablePositionKey(openNote) ? "delete-menu-open" : ""}`}
                    data-fretboard-delete-target={editable ? getEditablePositionKey(openNote) : undefined}
                    data-fret-number="0"
                    data-note-pitch={openNote.pitch}
                    data-string-number={stringInfo.stringNumber}
                    onClick={editable ? (event) => openDeleteMenu(event, openNote) : onNotePress ? (event) => activateNote(event, openNote) : undefined}
                    onKeyDown={onNotePress || editable ? (event) => handleNoteKeyDown(event, openNote) : undefined}
                    role={onNotePress || editable ? "button" : undefined}
                    tabIndex={onNotePress || editable ? 0 : undefined}
                  >
                    {openLabel}
                    {editable && deleteTargetKey === getEditablePositionKey(openNote) ? (
                      <button
                        aria-label={`${openAccessiblePitch}, ${stringInfo.stringNumber}번줄 개방현 삭제`}
                        className="fretboardNoteDeleteButton fretboardNoteDeleteButton--open"
                        onClick={(event) => deleteEditableNote(event, openNote)}
                        type="button"
                      >
                        ×
                      </button>
                    ) : null}
                  </em>
                ) : editable && !isTabMode && !openNote ? (
                  <button
                    aria-label={`${stringInfo.stringNumber}번줄 개방현 음 추가`}
                    className="fretboardOpenEditTarget"
                    onClick={(event) => addEditableNote(event, getEditablePosition(stringInfo, 0))}
                    type="button"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        {barres.map((barre, index) => {
          const fret = Number(barre.fret);
          if (!Number.isFinite(fret) || fret < visualStartFret || fret > visualEndFret) return null;
          const fromString = Number(barre.fromString);
          const toString = Number(barre.toString);
          const topString = Math.min(fromString, toString);
          const bottomString = Math.max(fromString, toString);
          const barreKey = getBarreKey(barre);
          const isDeleteMenuOpen = editable && barreDeleteTargetKey === barreKey;
          return (
            <span
              aria-label={editable ? `${fret}프렛 ${topString}번줄부터 ${bottomString}번줄 바레 삭제 메뉴 열기` : undefined}
              className={`fretboardBarre ${editable ? "fretboardBarre--editable" : ""} ${isDeleteMenuOpen ? "delete-menu-open" : ""}`}
              data-fretboard-barre-delete-target={editable ? barreKey : undefined}
              key={`barre-${fret}-${fromString}-${toString}-${index}`}
              onClick={editable ? (event) => openBarreDeleteMenu(event, barre) : undefined}
              onContextMenu={editable ? preventEditableContextMenu : undefined}
              onKeyDown={editable ? (event) => handleBarreKeyDown(event, barre) : undefined}
              onPointerCancel={editable ? (event) => finishBarreGesture(event, true) : undefined}
              onPointerDown={editable ? (event) => beginBarreGesture(event, {
                fretNumber: fret,
                stringNumber: getClosestStringNumber(event.clientY),
              }) : undefined}
              onPointerMove={editable ? moveBarreGesture : undefined}
              onPointerUp={editable ? finishBarreGesture : undefined}
              role={editable ? "button" : undefined}
              style={{
                "--fretboard-x-ratio": getXRatio(fret),
                "--fretboard-barre-top": (topString - 0.5) / 6,
                "--fretboard-barre-height": (bottomString - topString + 1) / 6,
              }}
              tabIndex={editable ? 0 : undefined}
            >
              {barre.label}
            </span>
          );
        })}
        {barreDraft ? (() => {
          const topString = Math.min(barreDraft.fromString, barreDraft.toString);
          const bottomString = Math.max(barreDraft.fromString, barreDraft.toString);
          return (
            <span
              aria-hidden="true"
              className="fretboardBarre fretboardBarre--preview"
              style={{
                "--fretboard-x-ratio": getXRatio(barreDraft.fret),
                "--fretboard-barre-top": (topString - 0.5) / 6,
                "--fretboard-barre-height": (bottomString - topString + 1) / 6,
              }}
            />
          );
        })() : null}
        {tabConnections.map((connection) => {
          const fromRatio = getTabXRatio(connection.fromIndex);
          const toRatio = getTabXRatio(connection.toIndex);
          const leftRatio = Math.min(fromRatio, toRatio);
          const widthRatio = Math.abs(toRatio - fromRatio);
          return (
            <span
              aria-label={`${connection.from.fretNumber}프렛에서 ${connection.to.fretNumber}프렛 ${connection.label}`}
              className={`fretboardTabConnection fretboardTabConnection--${connection.technique} ${connection.isActive ? "active" : ""}`}
              key={connection.id}
              role="img"
              style={{
                "--fretboard-tab-left-ratio": leftRatio,
                "--fretboard-tab-width-ratio": widthRatio,
                "--fretboard-tab-y-ratio": (Number(connection.from.stringNumber) - 0.5) / 6,
              }}
            >
              <i />
              <b>{connection.symbol}</b>
            </span>
          );
        })}
        {preparedTabSteps.map((step) => {
          const fretNumber = Number(step.fretNumber);
          const technique = normalizeLickTechnique(step.technique);
          const techniqueLabel = getLickTechniqueLabel(technique);
          const isRest = isLickRestStep(step);
          const isMute = isLickMuteStep(step);
          const isHarmonic = isLickHarmonicStep(step);
          const isBend = technique === LICK_TECHNIQUES.BEND;
          const isRelease = technique === LICK_TECHNIQUES.BEND_RELEASE;
          const isVibrato = technique === LICK_TECHNIQUES.VIBRATO;
          const displayValue = getTabStepDisplay(step);
          const stringLabel = isRest
            ? "휴지"
            : `${step.stringNumber}번줄 ${fretNumber === 0 ? "개방현" : `${fretNumber}프렛`}`;
          return (
            <span
              aria-label={`${step.order}번째 ${stringLabel}${techniqueLabel ? ` ${techniqueLabel}` : ""}`}
              className={`fretboardTabNote fretboardTabNote--${technique || "pick"} ${fretNumber === 0 ? "open" : ""} ${isRest ? "rest" : ""} ${isMute ? "mute" : ""} ${isHarmonic ? "harmonic" : ""} ${step.isActive ? "active current-note" : ""}`}
              data-lick-order={step.order}
              key={step.tabId}
              style={{
                "--fretboard-tab-x-ratio": getTabXRatio(step.tabIndex),
                "--fretboard-tab-y-ratio": isRest ? 0.5 : (Number(step.stringNumber) - 0.5) / 6,
              }}
            >
              <b><span>{displayValue}</span></b>
              {isVibrato ? <small className="fretboardTabLocalTechnique fretboardTabVibrato">~</small> : null}
              {isBend ? (
                <small className="fretboardTabLocalTechnique fretboardTabBend">
                  <i aria-hidden="true">↗</i>
                  <em>Bend {getLickBendAmountLabel(step)}</em>
                </small>
              ) : null}
              {isRelease ? (
                <small className="fretboardTabLocalTechnique fretboardTabRelease">
                  <i aria-hidden="true">↘</i>
                  <em>Release</em>
                </small>
              ) : null}
              {isHarmonic ? <small className="fretboardTabLocalTechnique fretboardTabHarmonicLabel">Harm.</small> : null}
            </span>
          );
        })}
        {editable && !isTabMode ? STANDARD_TUNING.flatMap((stringInfo) => fretNumbers.map((fretNumber) => {
          const positionKey = `${stringInfo.stringNumber}-${fretNumber}`;
          if (occupiedPositions.has(positionKey)) return null;
          const position = getEditablePosition(stringInfo, fretNumber);
          return (
            <button
              aria-label={`${position.pitch}, ${stringInfo.stringNumber}번줄 ${fretNumber}프렛 음 추가`}
              className="fretboardEditCell"
              data-fret-number={fretNumber}
              data-string-number={stringInfo.stringNumber}
              key={`editable-cell-${positionKey}`}
              onClick={(event) => addEditableNote(event, position)}
              onContextMenu={preventEditableContextMenu}
              onPointerCancel={(event) => finishBarreGesture(event, true)}
              onPointerDown={(event) => beginBarreGesture(event, position)}
              onPointerMove={moveBarreGesture}
              onPointerUp={finishBarreGesture}
              style={{
                "--fretboard-x-ratio": getXRatio(fretNumber),
                "--fretboard-y-ratio": (stringInfo.stringNumber - 0.5) / 6,
              }}
              type="button"
            />
          );
        })) : null}
        {!isTabMode && renderNotes.map((note, index) => {
          if (Number(note.fretNumber) <= 0) return null;
          if (note.fretNumber < visualStartFret || note.fretNumber > visualEndFret) return null;
          const noteName = note.noteName ?? getPitchClass(note.pitch);
          const noteId = note.id ?? `${note.stringNumber}-${note.fretNumber}-${noteName}-${index}`;
          if (visibleNoteIds.has(noteId)) return null;
          visibleNoteIds.add(noteId);
          const isRoot = noteName === rootNote || note.isRoot;
          const isSelected = selected.size === 0 || selected.has(noteName);
          const isCurrent = Boolean(note.isCurrent || note.current || note.isActive);
          const displayLabel = showFingering && note.finger ? note.finger : note.label ?? noteName;
          const accessiblePitch = note.displayPitch ?? note.pitch ?? noteName;
          return (
            <span
              aria-label={editable ? `${accessiblePitch}, ${note.stringNumber}번줄 ${note.fretNumber}프렛 삭제 메뉴 열기` : onNotePress ? `${accessiblePitch}, ${note.stringNumber}번줄 ${note.fretNumber}프렛 소리 듣기` : undefined}
              className={`fretboardNoteChip ${isRoot ? "root" : ""} ${note.isActive ? "active" : ""} ${isCurrent ? "current-note" : ""} ${isSelected ? "selected" : ""} ${onNotePress || editable ? "is-interactive" : ""} ${deleteTargetKey === getEditablePositionKey(note) ? "delete-menu-open" : ""}`}
              data-fretboard-delete-target={editable ? getEditablePositionKey(note) : undefined}
              data-fret-number={note.fretNumber}
              data-note-pitch={note.pitch}
              data-string-number={note.stringNumber}
              key={noteId}
              onClick={editable ? (event) => openDeleteMenu(event, note) : onNotePress ? (event) => activateNote(event, note) : undefined}
              onContextMenu={editable ? preventEditableContextMenu : undefined}
              onKeyDown={onNotePress || editable ? (event) => handleNoteKeyDown(event, note) : undefined}
              onPointerCancel={editable ? (event) => finishBarreGesture(event, true) : undefined}
              onPointerDown={editable ? (event) => beginBarreGesture(event, note) : undefined}
              onPointerMove={editable ? moveBarreGesture : undefined}
              onPointerUp={editable ? finishBarreGesture : undefined}
              role={onNotePress || editable ? "button" : undefined}
              style={{
                "--fretboard-x-ratio": getXRatio(Number(note.fretNumber)),
                "--fretboard-y-ratio": (Number(note.stringNumber) - 0.5) / 6,
                ...getNoteStyle(noteName),
              }}
              tabIndex={onNotePress || editable ? 0 : undefined}
              title={`${accessiblePitch} · ${note.stringNumber}번줄 ${note.fretNumber}프렛`}
            >
              <b>{displayLabel}</b>
              {editable && deleteTargetKey === getEditablePositionKey(note) ? (
                <button
                  aria-label={`${accessiblePitch}, ${note.stringNumber}번줄 ${note.fretNumber}프렛 삭제`}
                  className="fretboardNoteDeleteButton"
                  onClick={(event) => deleteEditableNote(event, note)}
                  type="button"
                >
                  ×
                </button>
              ) : null}
            </span>
          );
        })}
        {editable && !isTabMode ? barres.map((barre, index) => {
          const fret = Number(barre.fret);
          const fromString = Number(barre.fromString);
          const toString = Number(barre.toString);
          const topString = Math.min(fromString, toString);
          const bottomString = Math.max(fromString, toString);
          const barreKey = getBarreKey(barre);
          if (
            barreDeleteTargetKey !== barreKey
            || !Number.isFinite(fret)
            || fret < visualStartFret
            || fret > visualEndFret
          ) return null;
          return (
            <button
              aria-label={`${fret}프렛 ${topString}번줄부터 ${bottomString}번줄 바레 삭제`}
              className="fretboardBarreDeleteButton"
              data-fretboard-barre-delete-target={barreKey}
              key={`barre-delete-${barreKey}-${index}`}
              onClick={(event) => deleteEditableBarre(event, barre)}
              style={{
                "--fretboard-x-ratio": getXRatio(fret),
                "--fretboard-y-ratio": (topString - 0.5) / 6,
                "--fretboard-barre-delete-offset-x": getXRatio(fret) > 0.82 ? "-23px" : "23px",
              }}
              type="button"
            >
              ×
            </button>
          );
        }) : null}
      </div>
    </div>
  );
}

export default memo(Fretboard);
