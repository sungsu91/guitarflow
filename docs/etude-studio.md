# Etude Studio

Route: #etudes. Shared catalog, course/filter/selection state and metronome; separate MobileLayout and DesktopLayout.

## Type-first curriculum

65 original eight-bar studies, one fixed score per exercise. There is no key selection or runtime transposition. Each template has an authored key, pitch spelling and explicit string/fret route. All current notes stay within frets 0–9. This is a register constraint, not a difficulty score. Nine technique courses each contain beginner, intermediate and advanced stages with at least two studies per stage. See [curriculum and sources](etude-curriculum.md).

Arpeggio beginner: C x32010, then C/Am changes at frets 0–3. Intermediate: C–Am–F–G, then Bmaj7 x24342 → D#m x68876 → Emaj7 x79897 → Em7 x79787, with root/fifth bass and shape changes. Advanced reuses these same 2–9-fret grips while adding steady bass against sixteenth-note upper notes, pinches, rests and rhythmic changes. Higher frets do not determine level. Em7 is an intentional borrowed minor chord; spell D/G naturals in the B-major signature and validate against that chord, not just the home scale.

src/etudes/tracks.js is the single course-order registry. catalog.js builds and validates the scores; trackStudies.js adds graded technique and triad studies; openChordStudies.js authors the six accompaniment scores. Template ids remain stable; full score ids include their fixed key. trackLesson is local to type and level; lesson is the internal catalog ordering.

Type and difficulty have no All option. Previous/next and the dropdown use the same filtered course. Counters start at 1 within the chosen type/level/style. Changing type or difficulty opens its first study. Style options are derived from the current course; an incompatible style resets to All without relaxing type or level.

Mobile always shows the type selector and three level buttons; only style collapses. Desktop places controls beside the score (above it on narrow desktop). Course goals and prerequisite guidance explain what each stage teaches.

## Notation and sound

VexFlow SVG renders staff and TAB from shared sounding MIDI data; written guitar notation is an octave higher. All scores are 4/4. Explicit H/P/SL links are preserved for both complete eight-bar and expanded studies. Technique labels remain SVG text. Code-tone runs separate notes. The Arpeggio course holds a chord shape above each measure and uses simultaneous root/treble pinches with broken-chord picking. Each attack has one duration and optional tones for all simultaneous pitches; both staff keys and TAB positions come from these same tones. All tones are validated against the chord diagram, sounding pitch and actual chord tones, including borrowed chords. Let-ring guidance instructs resonance within a chord; this is not independent-voice sustain playback.

Scores retain the existing paper layout, responsive reader and 12-entry SVG cache. Tempo-only changes do not re-engrave. Shared metronome transport stops on course changes and unmount. The click is a metronome, not score playback.

## Verification

- node --test tests/etudes.test.mjs: course coverage, unique patterns, pitch/spelling/TAB, chord tones, rhythm, technique links, difficulty progression and navigation boundaries.
- scripts/verify-etude-tracks.mjs: 260 renders across desktop, mobile portrait, enlarged portrait and enlarged landscape; 27 course combinations per layout; navigation, style changes and absence of key controls, transport reset, TIP, chord diagrams and zoom/viewport checks.
- scripts/verify-etude-phrasing.mjs: rests, technique label spacing, chord labels and common TIP.
- The older verify-etudes-browser and verify-etude-filter-navigation entry points run the current course verification.

These checks validate data, navigation and rendering; they do not constitute an expert guitarist's performance review. Screenshots and JSON reports are written to artifacts/etude-tracks.
