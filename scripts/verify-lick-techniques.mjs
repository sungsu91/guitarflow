import { createServer } from "vite";

const LICK_FAMILIES = ["intro-lick", "blues-lick", "rock-lick", "jazz-lick", "country-lick"];
const RELATION_TECHNIQUES = new Set(["hammer-on", "pull-off", "slide-up", "slide-down"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const { buildScaleLickPractice } = await server.ssrLoadModule("/src/App.jsx");
  const { prepareLickTabSteps, buildLickTabConnections } = await server.ssrLoadModule("/src/components/Fretboard.jsx");
  const {
    buildLickTechniqueRelations,
    getLickTechniqueSymbol,
    isLickHarmonicStep,
    isLickMuteStep,
    isLickRestStep,
  } = await server.ssrLoadModule("/src/music/lickTechniques.js");

  let lickCount = 0;
  let stepCount = 0;
  let relationCount = 0;

  for (const familyId of LICK_FAMILIES) {
    for (let number = 1; number <= 5; number += 1) {
      const lickId = `${familyId}-lick-${number}`;
      const context = `${familyId} LICK${number}`;
      const practice = buildScaleLickPractice(familyId, lickId);
      const preparedSteps = prepareLickTabSteps(practice.orderedSteps);
      const connections = buildLickTabConnections(preparedSteps);

      assert(preparedSteps.length === practice.sequence.length, `${context}: every sounding/rest step must be in PLAY sequence`);
      assert(preparedSteps.length > 0, `${context}: empty LICK`);
      assert(
        preparedSteps.every((step, index) => step.tabIndex === index && step.order === index + 1),
        `${context}: TAB columns are not strict left-to-right performance order`,
      );
      assert(new Set(preparedSteps.map((step) => step.tabIndex)).size === preparedSteps.length, `${context}: notes share a TAB time column`);
      assert(
        connections.length === practice.techniqueRelations.length,
        `${context}: data and renderer disagree about technique relationships`,
      );

      for (const connection of connections) {
        const fromFret = Number(connection.from.fretNumber);
        const toFret = Number(connection.to.fretNumber);
        assert(connection.toIndex === connection.fromIndex + 1, `${context}: relationship skips a performance step`);
        assert(connection.from.stringNumber === connection.to.stringNumber, `${context}: relationship crosses guitar strings`);
        assert(fromFret !== toFret, `${context}: identical-fret ${connection.technique} was generated`);
        assert(RELATION_TECHNIQUES.has(connection.technique), `${context}: unsupported relationship ${connection.technique}`);
        if (connection.technique === "hammer-on" || connection.technique === "slide-up") {
          assert(fromFret < toFret, `${context}: ${connection.technique} does not ascend`);
        }
        if (connection.technique === "pull-off" || connection.technique === "slide-down") {
          assert(fromFret > toFret, `${context}: ${connection.technique} does not descend`);
        }
        assert(getLickTechniqueSymbol(connection.technique), `${context}: connection symbol missing`);
      }

      lickCount += 1;
      stepCount += preparedSteps.length;
      relationCount += connections.length;
    }
  }

  const syntheticSteps = prepareLickTabSteps([
    { id: "pick", stringNumber: 5, fretNumber: 5 },
    { id: "hammer", stringNumber: 5, fretNumber: 7, technique: "hammer-on" },
    { id: "invalid-hammer", stringNumber: 5, fretNumber: 7, technique: "hammer-on" },
    { id: "pull", stringNumber: 5, fretNumber: 5, technique: "pull-off" },
    { id: "slide-up", stringNumber: 5, fretNumber: 7, technique: "slide" },
    { id: "slide-down", stringNumber: 5, fretNumber: 5, technique: "slide" },
    { id: "vibrato", stringNumber: 4, fretNumber: 7, technique: "vibrato" },
    { id: "bend", stringNumber: 3, fretNumber: 7, technique: "bend", targetFret: 9 },
    { id: "release", stringNumber: 3, fretNumber: 7, technique: "bend-release" },
    { id: "mute", stringNumber: 2, fretNumber: 5, technique: "mute" },
    { id: "harmonic", stringNumber: 1, fretNumber: 12, technique: "natural-harmonic" },
    { id: "rest", technique: "rest", rest: true },
  ]);
  const syntheticRelations = buildLickTechniqueRelations(syntheticSteps);

  assert(syntheticRelations.some((relation) => relation.technique === "hammer-on" && relation.from.tabId === "pick" && relation.to.tabId === "hammer"), "5h7 relationship missing");
  assert(!syntheticRelations.some((relation) => relation.techniqueIndex === 2), "7h7 identical-fret hammer-on was not rejected");
  assert(syntheticRelations.some((relation) => relation.technique === "pull-off" && relation.from.tabId === "invalid-hammer" && relation.to.tabId === "pull"), "7p5 relationship missing");
  assert(syntheticRelations.some((relation) => relation.technique === "slide-up"), "5/7 slide relationship missing");
  assert(syntheticRelations.some((relation) => relation.technique === "slide-down"), "7\\5 slide relationship missing");
  assert(isLickMuteStep(syntheticSteps[9]), "mute step normalization failed");
  assert(isLickHarmonicStep(syntheticSteps[10]), "natural harmonic normalization failed");
  assert(isLickRestStep(syntheticSteps[11]), "rest normalization failed");

  console.log(`Verified ${lickCount} LICKs and ${stepCount} left-to-right performance steps.`);
  console.log(`Validated ${relationCount} real adjacent-note technique connections.`);
  console.log("Synthetic coverage: Pick, Hammer-on, Pull-off, Slide ↑/↓, Vibrato, Bend, Release, Mute, Harmonic, Rest.");
} finally {
  await server.close();
}
