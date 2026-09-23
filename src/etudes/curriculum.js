import ko from "../i18n/locales/ko.js";
// Original exercises. Public syllabi inform the learning sequence, not the notes.
// -1 is a rest; rows are complete bars, never randomly selected fingering.
export function curriculumTemplates({major, connected, penta, blues, pentaIntervals, bluesIntervals}) {

  const lyrical = ['8','8','4','4','4'];
  const breath = ['8','8','8','8','4','4'];
  const space = ['4','4','2'];
  const eighth = Array(8).fill('8');
  const sixteenth = Array(16).fill('16');
  const burst = ['16','16','16','16','8','8','4','4'];
  const make = (id,level,name,english,type,style,bpm,shape,patterns,rhythm,purpose,goal,extra={}) => ({
    id, level, name, english, type, style, bpm, shape, patterns,
    family:'major', complete:true, rhythms:patterns.map((_,i)=>Array.isArray(rhythm[0])?rhythm[i]:rhythm),
    purpose, goal, difficultyReason:`${level} · ${goal}`, ...extra,
  });
  const minor = {family:'minor',intervals:pentaIntervals};
  const newBlues = {family:'minor',intervals:bluesIntervals};
  // Interleaved thirds keep the two melodic voices moving by step.
  const thirds = s => [s,s+2,s+1,s+3,s+2,s+4,s+3,s+5];
  const fourths = s => [s,s+3,s+1,s+4,s+2,s+5,s+3,s+6];
  const pivot = s => [s,s+1,s,s+2,s,s+3,s,s+4];
  const group4 = s => [s,s+1,s+2,s+3,s+1,s+2,s+3,s+4,s+2,s+3,s+4,s+5,s+3,s+4,s+5,s+6];
  const reverse = row => [...row].reverse();
  const twice = row => [...row,...row];
  return [
    make('two-note-answer',ko["etudes.beginner"],ko["etudes.twoNoteCallAndResponse"],'Two-note Call and Response',ko["etudes.licks"],ko["components.pop"],60,major,
      [[0,2,2],[2,0,0],[0,2,4],[2,0,0],[2,4,4],[4,2,2],[2,1,1],[1,0,0]],space,
      ko["etudes.holdALongNoteAndLetTheNextBarAnswerFeelThe"],
      ko["etudes.sustainedHalfNotesAndTwoBarPhrasesLearnOneRhythmAtA"]),
    make('penta-hook',ko["etudes.beginner"],ko["etudes.repeatingPentatonicHook"],'Pentatonic Hook',ko["app.pentatonics"],ko["etudes.rock"],68,penta,
      [[0,1,2,1,0,-1],[0,1,3,2,1,-1],[2,3,4,3,2,-1],[2,1,0,1,0,-1],[3,4,5,4,3,-1],[3,2,1,2,3,-1],[2,3,2,1,0,-1],[1,2,1,1,0,0]],breath,
      ko["etudes.repeatTheSameRhythmToBuildAMemorableHookMuteDuringRests"],
      ko["etudes.aSmallPentatonicRangeWithQuarterRestsKeepTheBeatThroughThe"],minor),
    make('major-landing',ko["etudes.beginner"],ko["etudes.popPhraseLandingOnTheThird"],'Third-tone Pop Phrases',ko["etudes.licks"],ko["components.pop"],70,major,
      [[0,1,2,4,2],[2,3,4,2,0],[2,3,4,5,4],[4,3,2,1,0],[4,5,6,7,9],[9,8,7,6,4],[4,3,2,1,2],[2,1,0,0,0]],lyrical,
      ko["etudes.letTheFirstPhraseRestBrieflyOnTheThirdThenResolveThe"],
      ko["etudes.aLateBeginnerExerciseForPlayersWhoKnowTheBasicScaleAnd"]),
    make('ballad-breath',ko["etudes.beginner"],ko["etudes.balladMelodyWithSpace"],'Ballad Breathing Phrases',ko["etudes.licks"],ko["etudes.ballad"],60,major,
      [[0,2,4,2,0,-1],[2,4,5,4,2,-1],[4,5,7,6,4,-1],[4,3,2,1,0,-1],[7,8,9,8,7,-1],[7,6,5,4,2,-1],[4,3,2,1,2,-1],[2,1,0,1,0,0]],breath,
      ko["etudes.restOnTheFinalBeatOfEachBarToLeaveSpaceBetween"],
      ko["etudes.practiceMutingOnQuarterRestsAlongsideEighthNotePhrasing"]),
    make('beginner-finale',ko["etudes.beginner"],ko["etudes.repeatAndVaryMiniSolo"],'Motif Mini Solo',ko["etudes.licks"],ko["metronome.blues"],72,blues,
      [[0,1,2,1,0,-1],[0,1,2,3,4,-1],[4,5,6,5,4,-1],[4,3,2,1,0,-1],[6,7,8,7,6,-1],[6,5,4,3,4,-1],[4,3,2,1,0,-1],[1,2,1,1,0,0]],breath,
      ko["etudes.repeatASlightlyVariedRhythmicQuestionThenResolveToALowTonic"],
      ko["etudes.beginnerFinalePassBrieflyThroughTheBlueNoteAndConnectEightBars"],newBlues),

    make('thirds-dialogue',ko["etudes.intermediate"],ko["etudes.alternatingThirds"],'Thirds Dialogue',ko["app.scales"],ko["etudes.basics"],72,major,
      [thirds(0),thirds(2),thirds(4),thirds(6),reverse(thirds(6)),reverse(thirds(4)),reverse(thirds(2)),reverse(thirds(0))],eighth,
      ko["etudes.alternateThirdsInsteadOfMovingStepwiseHearEachPairAsAUnit"],
      ko["etudes.controlThirdIntervalLeapsAndStringChangesInContinuousEighthNotes"]),
    make('pivot-return',ko["etudes.intermediate"],ko["etudes.returnToThePivotNote"],'Pivot Tone Return',ko["app.scales"],ko["etudes.rock"],76,major,
      [pivot(0),pivot(2),pivot(4),pivot(6),reverse(pivot(6)),reverse(pivot(4)),reverse(pivot(2)),reverse(pivot(0))],eighth,
      ko["etudes.keepTheRecurringPivotNoteSteadyWhileChangingThePitchesAroundIt"],
      ko["etudes.controlPickingThatReturnsToTheSameNoteAsTheIntervalsWiden"]),
    make('offbeat-hook',ko["etudes.intermediate"],ko["etudes.offbeatPentatonicEntry"],'Offbeat Pentatonic Hook',ko["app.pentatonics"],ko["etudes.rock"],78,penta,
      [[0,1,2,3,2,1,0,-1],[-1,1,2,3,4,3,2,1],[-1,2,3,4,5,4,3,2],[-1,3,4,5,4,3,2,0],[-1,4,5,6,5,4,3,2],[-1,3,4,5,4,3,2,1],[-1,2,3,4,3,2,1,0],[1,2,3,2,1,0,0,0]],eighth,
      ko["etudes.startOnTheOffbeatAfterTheOpeningEighthRestFeelBeat1"],
      ko["etudes.combineEntryAfterAnEighthRestWithConnectedPositions"],minor),
    make('fourth-crossing',ko["etudes.intermediate"],ko["etudes.stringSkippingInFourths"],'Fourth Interval Crossing',ko["app.scales"],ko["etudes.basics"],66,major,
      [fourths(0),fourths(2),fourths(4),fourths(6),reverse(fourths(6)),reverse(fourths(4)),reverse(fourths(2)),reverse(fourths(0))],eighth,
      ko["etudes.muteTheSkippedStringOnEachFourthIntervalLeapWiderIntervalsDo"],
      ko["etudes.requiresStringSkippingInFourthsAndMutingUnusedStrings"]),
    make('pop-chord-route',ko["etudes.intermediate"],ko["etudes.chordTonePositionLick"],'Chord-tone Position Lick',ko["etudes.chordToneRuns"],ko["components.pop"],72,connected,
      [[0,1,2,4,7,6,4,2],[5,6,7,9,12,11,9,7],[3,4,5,7,10,9,7,5],[4,5,6,8,11,10,8,6],[7,8,9,11,14,13,11,9],[9,8,7,5,7,9,12,9],[7,6,5,3,5,7,10,7],[7,6,5,4,2,1,0,0]],burst,
      ko["etudes.startEachBarOnAChordToneThenConnectSixteenthNoteApproach"],
      ko["etudes.combineChordToneChoicesWithDiagonalPositionShiftsLeapsAndTransitionsFrom"],
      {harmony:[[0,''],[5,'m'],[3,''],[4,''],[0,''],[5,'m'],[3,''],[0,'']]}),
    make('speed-window',ko["etudes.intermediate"],ko["etudes.shortRunLongLanding"],'Short Burst Long Landing',ko["etudes.licks"],ko["etudes.rock"],64,connected,
      [[0,1,2,3,4,3,2,0],[2,3,4,5,6,5,4,2],[4,5,6,7,8,7,6,4],[6,7,8,9,10,9,8,7],[8,9,10,11,12,11,10,9],[10,11,12,13,14,13,12,11],[8,7,6,5,4,3,2,1],[4,3,2,1,2,1,0,0]],burst,
      ko["etudes.playFourNotesOnTheFirstBeatThenReduceTheDensityAnd"],
      ko["etudes.practiceSwitchingBetweenOneBeatOfSixteenthsAndEighthOrQuarterNotes"]),
    make('intermediate-finale',ko["etudes.intermediate"],ko["etudes.callOffbeatAndResponseSolo"],'Question Offbeat Answer',ko["etudes.licks"],ko["components.pop"],80,connected,
      [[0,1,2,4,2,0,1,2],[-1,4,3,2,3,4,5,4],[4,5,6,7,6,5,4,2],[-1,6,7,8,7,6,5,4],[7,8,9,11,9,8,7,6],[-1,9,10,11,12,11,10,9],[7,6,5,4,5,4,3,2],[2,3,4,3,2,1,0,0]],eighth,
      ko["etudes.evenNumberedBarsAnswerTheOddNumberedBarsOnTheOffbeatShape"],
      ko["etudes.connectPositionShiftsOffbeatEntriesAndRepeatedPatternsWithinAnEightBar"]),

    make('thirds-drive',ko["etudes.advanced"],ko["etudes.continuousSixteenthNoteThirds"],'Continuous Thirds Drive',ko["app.scales"],ko["etudes.basics"],76,connected,
      [[...thirds(0),...thirds(1)],[...thirds(2),...thirds(3)],[...thirds(4),...thirds(5)],[...thirds(6),...thirds(7)],reverse([...thirds(6),...thirds(7)]),reverse([...thirds(4),...thirds(5)]),reverse([...thirds(2),...thirds(3)]),reverse([...thirds(0),...thirds(1)])],sixteenth,
      ko["etudes.playThirdsInFourNoteGroupsWithoutAddingTensionAtStringChanges"],
      ko["etudes.combinesContinuousSixteenthsLeapsInThirdsAndDiagonalPositionShifts"]),
    make('fourths-drive',ko["etudes.advanced"],ko["etudes.crossStringSixteenthNoteFourths"],'Fourth Crossing Drive',ko["app.scales"],ko["etudes.rock"],72,connected,
      [[...fourths(0),...fourths(1)],[...fourths(2),...fourths(3)],[...fourths(4),...fourths(5)],[...fourths(6),...fourths(7)],reverse([...fourths(6),...fourths(7)]),reverse([...fourths(4),...fourths(5)]),reverse([...fourths(2),...fourths(3)]),reverse([...fourths(0),...fourths(1)])],sixteenth,
      ko["etudes.connectFastFourthIntervalLeapsWhileMutingSkippedStringsKeepAllFour"],
      ko["etudes.sustainStringSkippingFourthsInSixteenthNotes"]),
    make('pivot-drive',ko["etudes.advanced"],ko["etudes.sixteenthNotePivotExpansion"],'Sixteenth Pivot Expansion',ko["app.scales"],ko["etudes.rock"],80,connected,
      [[...pivot(0),...pivot(1)],[...pivot(2),...pivot(3)],[...pivot(4),...pivot(5)],[...pivot(6),...pivot(7)],reverse([...pivot(6),...pivot(7)]),reverse([...pivot(4),...pivot(5)]),reverse([...pivot(2),...pivot(3)]),reverse([...pivot(0),...pivot(1)])],sixteenth,
      ko["etudes.listenSeparatelyToTheRecurringPivotAndTheMovingMelodyKeepPicking"],
      ko["etudes.combineARepeatedSixteenthNotePivotWithWideIntervalsAndPositionShifts"]),
    make('penta-groups',ko["etudes.advanced"],ko["etudes.fourNotePentatonicSequence"],'Four-note Pentatonic Sequence',ko["app.pentatonics"],ko["etudes.rock"],84,penta,
      [group4(0),group4(1),group4(2),group4(3),reverse(group4(3)),reverse(group4(2)),reverse(group4(1)),reverse(group4(0))],sixteenth,
      ko["etudes.overlapFourNotePentatonicGroupsAccentOnlyTheFirstNoteOfEach"],
      ko["etudes.maintainContinuousSixteenthNoteSequencesThroughWidePentatonicIntervals"],minor),
    make('triad-engine',ko["etudes.advanced"],ko["etudes.triadsInReverse"],'Triad Direction Engine',ko["etudes.chordToneRuns"],ko["etudes.rock"],76,connected,
      [twice([0,2,4,2,4,7,4,2]),twice([4,7,9,7,9,11,9,7]),twice([7,9,11,9,11,14,11,9]),twice([11,9,7,9,7,4,7,9]),twice([7,9,11,14,11,9,7,4]),twice([4,7,9,11,9,7,4,2]),twice([2,4,7,9,7,4,2,4]),[4,7,4,2,4,2,0,2,4,2,0,2,4,2,1,0]],sixteenth,
      ko["etudes.ascendAndDescendThroughTriadsInSixteenthsSweepPickingIsOptionalCoordinate"],
      ko["etudes.controlFastArpeggioLeapsDirectionChangesAndStringMutingTogether"]),
    make('seventh-weave',ko["etudes.advanced"],ko["etudes.majorSeventhZigzag"],'Major Seventh Weave',ko["etudes.chordToneRuns"],ko["metronome.jazz"],76,connected,
      [twice([0,2,4,6,4,2,4,6]),twice([7,6,4,6,7,9,11,13]),twice([14,13,11,9,11,13,11,9]),twice([7,9,11,13,11,9,7,6]),twice([6,7,9,11,9,7,6,4]),twice([4,6,7,9,7,6,4,2]),twice([2,4,6,7,6,4,2,0]),[0,2,4,6,7,6,4,2,4,6,4,2,4,2,1,0]],sixteenth,
      ko["etudes.zigzagBetweenThe1st3rd5thAnd7thThisIsATechnique"],
      ko["etudes.connectMajorSeventhLeapsInSixteenthsWhileShiftingPositionsAcrossTwoOctaves"]),
    make('blues-burst',ko["etudes.advanced"],ko["etudes.fastBlueNoteResponse"],'Blue-note Burst Response',ko["etudes.licks"],ko["metronome.blues"],82,blues,
      [group4(0),group4(2),group4(4),group4(6),reverse(group4(6)),reverse(group4(4)),reverse(group4(2)),reverse(group4(0))],sixteenth,
      ko["etudes.treatTheBlueNoteSequenceAsBriefPassingTonesUseEvenSixteenths"],
      ko["etudes.maintainSixteenthsWhileAlternatingChromaticPassingTonesAndWideBluesIntervals"],newBlues),
    make('density-switch',ko["etudes.advanced"],ko["etudes.eighthAndSixteenthNoteDensity"],'Rhythmic Density Switch',ko["etudes.licks"],ko["etudes.rock"],92,connected,
      [group4(0),[6,7,8,7,6,5,4,2],group4(4),[10,11,12,11,10,9,8,7],reverse(group4(7)),[7,8,9,8,7,6,5,4],reverse(group4(3)),[4,3,2,3,2,1,0,0]],
      [sixteenth,eighth,sixteenth,eighth,sixteenth,eighth,sixteenth,eighth],
      ko["etudes.alternateBusyBarsWithSpaciousOnesKeepTheMetronomeBeatUnchangedWhen"],
      ko["etudes.switchBothNoteDensityAndPositionAtAHighTempo"]),
    make('offbeat-drive',ko["etudes.advanced"],ko["etudes.offbeatSixteenthNoteSequence"],'Offbeat Sixteenth Sequence',ko["app.scales"],ko["etudes.rock"],80,connected,
      [group4(0),[-1,...group4(2).slice(1)],group4(4),[-1,...group4(6).slice(1)],reverse(group4(7)),[-1,...reverse(group4(5)).slice(1)],reverse(group4(3)),reverse(group4(0))],sixteenth,
      ko["etudes.inBarsThatStartWithASixteenthRestEnterOneSubdivisionAfter"],
      ko["etudes.requiresAccurateEntryAfterASixteenthRestAndASteadyInternalPulse"]),
    make('legato-drive',ko["etudes.advanced"],ko["etudes.threeTechniqueLegato"],'Continuous Mixed Legato',ko["etudes.legato"],ko["etudes.rock"],76,connected,
      [twice([0,1,2,1,3,4,5,4]),twice([6,7,8,7,9,10,11,10]),twice([12,13,14,13,12,13,14,12]),twice([11,10,9,10,8,7,6,7]),twice([6,7,8,7,9,10,11,10]),twice([8,7,6,7,5,4,3,4]),twice([3,4,5,4,2,1,0,1]),[2,1,0,1,3,4,5,4,2,1,0,1,2,1,1,0]],sixteenth,
      ko["etudes.connectConsecutiveNotesOnTheSameStringWithHPAndSl"],
      ko["etudes.sustainTechniqueChangesStringChangesAndPositionShiftsInSixteenthNotes"],{autoTechnique:true}),
    make('advanced-finale',ko["etudes.advanced"],ko["etudes.sequencesAndLeapsCompleteSolo"],'Sequence and Leap Finale',ko["etudes.licks"],ko["etudes.rock"],88,connected,
      [group4(0),[...thirds(2),...thirds(3)],group4(5),[...fourths(6),...reverse(fourths(6))],reverse(group4(7)),[...pivot(4),...reverse(pivot(4))],reverse(group4(3)),[4,3,2,1,2,3,4,3,2,1,0,1,2,1,0,0]],sixteenth,
      ko["etudes.connectStepwiseMotionThirdsFourthsAndPivotPatternsIntoOnePhraseHear"],
      ko["etudes.advancedSynthesisMaintainAFastRhythmWhileChangingTheIntervalPatternIn"]),
  ];
}
