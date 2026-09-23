import ko from "../i18n/locales/ko.js";
// Course order is explicit: each technique has its own three-stage syllabus.
export const TRACKS = Object.freeze([
 {type:ko["etudes.bending"],summary:ko["etudes.fromHalfAndWholeStepBendsToReleasesAndCombinedPhrases"],prerequisite:ko["etudes.listenToTheTargetPitchFirstAndSupportTheStringWithSeveral"],stages:[[ko["etudes.targetNotesAndBends"],['bend-target']],[ko["etudes.mixedRhythmsAndReleases"],['bend-release-mixed']],[ko["etudes.connectingBendsLegatoAndSlides"],['bend-legato-phrase']]]},
  { type: ko["app.scales"], summary: ko["etudes.fromFingerSpacingToScalesAndPositionShifts"], prerequisite: ko["etudes.startWhenYouCanReadTabStringFretNumbersAndQuarterNotes"],
    stages: [
      [ko["etudes.twoNotesOnOneStringQuarterEighthTransitionsAdjacentStringRoundTrips"], ['triad-start', 'scale-rhythm-bridge', 'first-path']],
      [ko["etudes.thirdsAndPivotsFourthIntervalLeapsAndMuting"], ['thirds-dialogue', 'pivot-return', 'fourth-crossing']],
      [ko["etudes.continuousSixteenthsLeapsOffbeatsAndConnectedPositions"], ['diagonal-sequence', 'thirds-drive', 'fourths-drive', 'pivot-drive', 'offbeat-drive']],
    ] },
  { type: ko["app.pentatonics"], summary: ko["etudes.learnShortPatternsAndConnectedPhrasesWithFiveNotes"], prerequisite: ko["etudes.startByAlternatingIndexRingAndLittleFingersOnOneString"],
    stages: [
      [ko["etudes.twoNoteSpacingRepeatingHooksWithRests"], ['penta-pairs', 'penta-landing', 'penta-hook']],
      [ko["etudes.positionRoundTripsOffbeatEntriesStringSkipping"], ['rock-penta', 'offbeat-hook', 'penta-string-skip']],
      [ko["etudes.fourNoteSequencesContinuousPatternsWithDirectionChanges"], ['penta-groups', 'penta-turns', 'penta-rhythm-application']],
    ] },
  { type: ko["etudes.licks"], summary: ko["etudes.developShortCallsAndResponsesIntoMusicalPhrases"], prerequisite: ko["etudes.itHelpsToLearnBasicScaleFingeringsFirst"],
    stages: [
      [ko["etudes.phraseEndingsRestsAndReEntryCallAndResponseFurtherApplications"], ['major-landing', 'ballad-breath', 'two-note-answer', 'ballad-line', 'pop-answer', 'blue-turn', 'beginner-finale']],
      [ko["etudes.offbeatResponsesHPConnectionsTwoConnectedPositions"], ['intermediate-finale', 'lick-legato-answer', 'speed-window']],
      [ko["etudes.chordTargetNotesMotifDevelopmentShortSolo"], ['blues-burst', 'density-switch', 'advanced-finale']],
    ] },
  { type: ko["etudes.chordToneRuns"], summary: ko["etudes.singleNoteLeadPracticeFollowingChordTones"], prerequisite: ko["etudes.thisCourseDevelopsLeadPlayingWithSeparateNotesForAccompanimentThatHolds"],
    stages: [
      [ko["etudes.135AcrossThreeStringsSlowEighthNotes"], ['triad-three-strings', 'triad-eighth-answer', 'triad-major-minor']],
      [ko["etudes.twoOctavesConnectedChordTonesAndMajorSevenths"], ['triad-cross', 'pop-chord-route', 'jazz-seventh']],
      [ko["etudes.sixteenthNoteTriadsMajorSevenths3rdsAnd7thsThroughChordChanges"], ['triad-engine', 'seventh-weave', 'codetone-guide-tones']],
    ] },
  { type: ko["etudes.arpeggios"], summary: ko["etudes.brokenChordAccompanimentHoldTheChordPluckBassAndTrebleTogetherThen"], prerequisite: ko["etudes.beginnersStartWithBasicOpenChordsAtFrets030Means"],
    stages: [
      [ko["etudes.basicOpenChordsTwoChordAccompanimentSmallFBarre"], ['chord-three-strings', 'chord-two-grips', 'chord-small-barre']],
      [ko["etudes.cAmFGBmaj7DMEmaj7Em7ChordShifts"], ['chord-accompaniment', 'chord-moving-preparation', 'chord-bass-answer','chord-g-alternating','chord-am-triplet','chord-g-triplet']],
      [ko["etudes.familiarChordShiftsIndependentBassPinchesOffbeatsAndRhythmicVariations"], ['chord-sixteenths', 'chord-density', 'chord-melody-response','chord-am-circle','chord-em-offbeat','chord-c-response']],
    ] },
  { type: ko["etudes.hammerOn"], summary: ko["etudes.pickOnceThenSoundAHigherNoteWithTheFrettingHand"], prerequisite: ko["etudes.fretTheLowerNoteCleanlyAndPrepareTheFingerForTheHigher"],
    stages: [
      [ko["etudes.twoNotesOnOneStringTwoNoteConnectionsAcrossStrings"], ['hammer-single', 'hammer-contrast', 'hammer-start']],
      [ko["etudes.threeNoteHammerOnsStringChanges"], ['hammer-three', 'hammer-crossing', 'hammer-handoff','hammer-mixed']],
      [ko["etudes.continuousSixteenthNoteHammerOnsPatternAndPositionChanges"], ['hammer-drive', 'hammer-sequence', 'hammer-phrasing']],
    ] },
  { type: ko["etudes.pullOff"], summary: ko["etudes.liftTheHigherNoteFingerToConnectToALowerNote"], prerequisite: ko["etudes.fretTheLowerDestinationNoteInAdvanceLiftOnlyTheHigherFinger"],
    stages: [
      [ko["etudes.twoNotesOnOneStringDescendingPhrases"], ['pull-single', 'pull-contrast', 'pull-return']],
      [ko["etudes.threeNotePullOffsStringChanges"], ['pull-three', 'pull-crossing', 'pull-handoff','pull-mixed']],
      [ko["etudes.continuousSixteenthNotePullOffsPatternsThatChangeDirection"], ['pull-drive', 'pull-sequence', 'pull-phrasing']],
    ] },
  { type: ko["etudes.slide"], summary: ko["etudes.reachTheNextFretWhileKeepingYourFingerOnTheString"], prerequisite: ko["etudes.useTheSameFingerForBothNotesCheckBothTheDestinationFret"],
    stages: [
      [ko["etudes.twoFretsOnOneStringRoundTripsAcrossTwoStrings"], ['slide-single', 'slide-contrast', 'slide-pairs']],
      [ko["etudes.connectSeveralPositionsControlEighthNoteArrivals"], ['slide-path', 'slide-crossing', 'slide-handoff','slide-slur-mixed']],
      [ko["etudes.sixteenthNoteSlidesChangesInDirectionAndPosition"], ['slide-drive', 'slide-sequence', 'slide-phrasing']],
    ] },
  { type: ko["etudes.legato"], summary: ko["etudes.connectHammerOnsAndPullOffsToPlayWithFewerPickStrokes"], prerequisite: ko["etudes.learnBeginnerHammerOnsAndPullOffsFirstBeginnerHereMeansAn"],
    stages: [
      [ko["etudes.hPConnectionsAndRestsOnOneStringApplyToTwoStrings"], ['legato-single', 'legato-contrast', 'legato-pairs']],
      [ko["etudes.threeNoteHPConnectionsPhrasesWithSlides"], ['legato-three', 'legato-phrase', 'legato-handoff','legato-hph-mixed']],
      [ko["etudes.sixteenthNoteHPCombinedHPSlConnections"], ['legato-chain', 'legato-drive', 'legato-phrasing','legato-slide-mixed']],
    ] },
]);

export const TYPES = Object.freeze(TRACKS.map(track => track.type));
export const TRACK_ORDER = TRACKS.flatMap(track => track.stages.flatMap(([, ids]) => ids));
export const getTrack = type => TRACKS.find(track => track.type === type);
