import { memo } from "react";
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

const CHROMATIC_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_INDEX = Object.fromEntries(CHROMATIC_NOTES.map((note, index) => [note, index]));

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
}) {
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

  renderNotes.forEach((note) => {
    if (Number(note.fretNumber) !== 0) return;
    if (openNotesByString.has(note.stringNumber)) return;
    openNotesByString.set(note.stringNumber, note);
  });

  const getXRatio = (fretNumber) => {
    return (fretNumber - visualStartFret + 0.5) / Math.max(1, fretNumbers.length);
  };
  const getTabXRatio = (tabIndex) => (Number(tabIndex) + 0.5) / tabSlotCount;

  return (
    <div
      className={`fretboardComponent fretboardComponent--${mode} ${isTabMode ? "fretboardComponent--tab" : ""} ${className}`}
      style={{
        "--fret-count": isTabMode ? tabSlotCount : Math.max(1, visualEndFret - visualStartFret + 1),
        "--fret-slot-count": isTabMode ? tabSlotCount : fretNumbers.length,
        "--lick-step-count": tabSlotCount,
      }}
    >
      <div className="fretboardComponentScroller">
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
                {stringState ? (
                  <em className={`fretboardStringState ${stringState}`}>
                    {String(stringState).toUpperCase()}
                  </em>
                ) : !isTabMode && openNote ? (
                  <em className={`fretboardStringState noteOpen ${openNote.noteName === rootNote || openNote.isRoot ? "root" : ""} ${openNote.isActive ? "active" : ""} ${isOpenCurrent ? "current-note" : ""} ${isOpenSelected ? "selected" : ""}`}>
                    {openLabel}
                  </em>
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
          return (
            <span
              className="fretboardBarre"
              key={`barre-${fret}-${fromString}-${toString}-${index}`}
              style={{
                "--fretboard-x-ratio": getXRatio(fret),
                "--fretboard-barre-top": (topString - 0.5) / 6,
                "--fretboard-barre-height": (bottomString - topString + 1) / 6,
              }}
            >
              {barre.label}
            </span>
          );
        })}
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
          return (
            <span
              className={`fretboardNoteChip ${isRoot ? "root" : ""} ${note.isActive ? "active" : ""} ${isCurrent ? "current-note" : ""} ${isSelected ? "selected" : ""}`}
              key={noteId}
              style={{
                "--fretboard-x-ratio": getXRatio(Number(note.fretNumber)),
                "--fretboard-y-ratio": (Number(note.stringNumber) - 0.5) / 6,
                ...getNoteStyle(noteName),
              }}
              title={`${note.pitch ?? noteName} · ${note.stringNumber}번줄 ${note.fretNumber}프렛`}
            >
              <b>{displayLabel}</b>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default memo(Fretboard);
