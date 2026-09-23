import ko from "../i18n/locales/ko.js";
export const PICKING_EXAMPLES = [
  { rhythm: ko["etudes.steadyEighthNotes"], count: '1 & 2 &', strokes: 'D U D U' },
  { rhythm: ko["etudes.steadySixteenthNotes"], count: '1 e & a', strokes: 'D U D U' },
  { rhythm: ko["etudes.enterAfterAnEighthRest"], count: '(1) & 2 &', strokes: ko["etudes.restUDU"] },
];

export const FINGERSTYLE_EXAMPLES = [
  {rhythm:ko["etudes.beginnerQuarterNotes"],count:'1 2 3 4',strokes:'p+m · i · a · i'},
  {rhythm:ko["etudes.intermediateEighthNotes"],count:'1 & 2 & 3 & 4 &',strokes:'p+m · i · m · i · p+a · m · i · p'},
  {rhythm:ko["etudes.advancedFourSubdivisionsOnBeat1"],count:'1 e & a',strokes:'p+i+a · i · m · a'},
];

export const FINGERSTYLE_PRACTICE_TIPS = [
  {title:ko["etudes.setTheChordShapeFirst"],text:ko["etudes.followTheChordDiagramAboveTheBarAndHoldYourFingersIn"]},
  {title:ko["etudes.pluckStackedNumbersTogether"],text:ko["etudes.tabNumbersStackedVerticallyAtTheSameHorizontalPositionSoundTogetherStart"]},
  {title:ko["etudes.giveTheThumbAndTrebleFingersSeparateRoles"],text:ko["etudes.pMeansThumbIIndexMMiddleAndARingFingerStart"]},
  {title:ko["etudes.letNotesRingWithinTheSameChord"],text:ko["etudes.letRingMeansAllowingEarlierNotesToOverlapNaturallyWithTheNext"]},
  {title:ko["etudes.distinguishRootAndFifthInTheBass"],text:ko["etudes.theLowestNoteOnBeat1IsTheRootOfThatBar"]},
  {title:ko["etudes.muteTogetherAtRests"],text:ko["etudes.atRestsInThisIntroductoryScoreLightlyMuteTheRingingStringsAnd"]},
  {title:ko["etudes.balanceSimultaneousAndSeparateNotes"],text:ko["etudes.doNotPullHardWhenPluckingSeveralNotesTogetherKeepTheThumb"]},
];

export const COMMON_PRACTICE_TIPS = [
  { title: ko["etudes.downAndUpDescribePickDirectionNotPitch"], text: ko["etudes.dDownMovesFromString6TowardString1UUpMoves"] },
  { title: ko["etudes.tryStartingWithADownstroke"], text: ko["etudes.startingContinuousEighthsOrSixteenthsWithADownstrokeGivesPracticeAClear"] },
  { title: ko["etudes.restsOccupySubdivisionsToo"], text: ko["etudes.theChartBelowDemonstratesPickingDirectionsAlignedWithSteadySubdivisionsInEighth"] },
  { title: ko["etudes.doNotPickAgainAtHPOrSl"], text: ko["etudes.inThisScoreTheDestinationNotesOfHHammerOnPPull"] },
  { title: ko["etudes.evenLengthAndVolumeBeforeSpeed"], text: ko["etudes.keepThePickShallowAgainstTheStringAndUseOnlyTheMovement"] },
  { title: ko["etudes.restsAndLongNotesShapeThePhrase"], text: ko["etudes.afterShortNotesHoldLongNotesForTheirWrittenDurationAndStop"] },
  { title: ko["etudes.practiceDifficultTransitionsSeparately"], text: ko["etudes.slowlyRepeatTheTwoToFourNotesAroundAMistakeThenReconnect"] },
];
