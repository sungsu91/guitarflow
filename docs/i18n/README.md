# FRETIVA LAB language migration inventory

Baseline: 2026-09-23. Inventory was generated **before** translation changes.

- 366 production JS/JSX files, including 98 JSX files.
- 294 named component candidates (AST: uppercase functions returning/containing JSX).
- 15 hash routes: `#etudes`, `#main`, `#fretboard`, `#rhythm-training`, `#tutorial`, `#stage1`, `#stage2`, `#stage3`, `#stage4`, `#metronome`, `#tuner`, `#shooter`, `#mini-chord`, `#design-lab`, `#audio-studio`.
- 6,431 Korean string occurrences; 4,846 distinct strings; 2,435 distinct strings in JSX presentation contexts. These counts are candidates, not a claim that every string should be translated.
- `inventory.json` records source positions, surrounding code, component candidates, string kinds, and presentation/data classification. Test, script, experiment, and root JS files were scanned separately from production sources.

## Surfaces to cover

| Area | Sources and conditional surfaces |
| --- | --- |
| Navigation/settings | App, DesktopSidebarNavigation, BottomNavigation, UtilityMenuSurface, mobile menu, theme, sound, help, PRO/DEV/SOLO labels |
| Practice | App single-note, scale/pentatonic, rhythm/chord, fretboard, progressions, saved items, edit dialogs |
| Score practice | etudes components: library, picker, score editor, keyboard/drum input, transport, floating tools, mobile sheets, settings, save/export dialogs |
| PDF | PdfStudio/Practice, library tabs, folders, mobile library/chrome, annotations, toolbar, page/error/empty views |
| Tuner | TunerMode, instrument/tuning presets, input permissions and pitch status |
| Metronome | App controls, groove packs/editor/tone picker, settings, volume controls |
| Backing tracks | Mini-chord UI, arrangement, BackingLoop, groove picker, playlist, imports, errors |
| Audio studio | AudioStudio, recording, playback, export and save errors |
| Shooter | App game UI, settings, progress, results/share, pitch monitor, recording, maps, DEV map editor, desktop horizontal and mobile surfaces |
| Startup | main load error, splash, document language |

## Preservation rules

Only presentation text is localized. User-entered titles, imported filenames/content, note/chord names, persisted default values, route IDs, storage keys, and musical data must retain their original values. Comments and test fixtures are not UI translations. Any remaining UI candidates must be reported as unfinished, never classified as exceptions merely because they have not been translated.

The baseline working tree already contained edits to App, desktop navigation, PdfStudio, several score data/print files, tests, and recording artifacts. `work/i18n-baseline/src` is the pre-migration source snapshot for isolating this task's changes from those edits.
