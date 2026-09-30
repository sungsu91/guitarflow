export const PRACTICE_SELECTION_KEY = 'fretiva.score.last-open.v1';

const id = value => typeof value === 'string' && value.length <= 512 ? value : '';
const normalize = value => ({
  lessonId: id(value?.lessonId),
  savedId: id(value?.savedId),
  pdfId: id(value?.pdfId),
});

// Only identifiers belong here. Score documents and PDF blobs stay in their
// existing libraries, and playback is never resumed automatically.
export function readPracticeSelection(storage) {
  try {
    return normalize(JSON.parse((storage ?? globalThis.localStorage).getItem(PRACTICE_SELECTION_KEY) || 'null'));
  } catch {
    return normalize(null);
  }
}

export function writePracticeSelection(selection, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(PRACTICE_SELECTION_KEY, JSON.stringify(normalize(selection)));
    return true;
  } catch {
    return false;
  }
}

export function resolveLessonSelection(selection, lessons, records, fallbackId) {
  const lessonId = lessons.some(lesson => lesson.id === selection.lessonId)
    ? selection.lessonId
    : lessons.find(lesson => lesson.id === fallbackId)?.id ?? lessons[0]?.id ?? '';
  const record = Object.hasOwn(records, selection.savedId) ? records[selection.savedId] : null;
  return {lessonId, savedId: record && record.status !== 'unreadable' ? selection.savedId : ''};
}
