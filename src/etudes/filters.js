import { ETUDES } from './catalog.js';

export const filterEtudes = filters => ETUDES.filter(e => e.root === filters.root &&
  ['level', 'style', 'type'].every(key => filters[key] === '전체' || e[key] === filters[key]));

export const lessonCourse = (selected, filters) => selected ? ETUDES.filter(e =>
  e.root === selected.root && e.level === selected.level &&
  ['style','type'].every(key=>!filters || filters[key] === '전체' || e[key] === filters[key])) : [];

export const canOpenLesson = (selected, lesson, filters) => Boolean(lesson && lessonCourse(selected, filters).some(e=>e.id===lesson.id));

// The last chosen facet wins. Relax conflicting older selections instead of
// presenting a selectable exercise type with no playable score.
export function changeEtudeFilter(filters, key, value) {
  const next = { ...filters, [key]: value };
  const priorities = key === 'type' ? ['style', 'level'] : key === 'style' ? ['type', 'level'] : ['style', 'type'];
  for (const other of priorities) {
    if (filterEtudes(next).length) break;
    next[other] = '전체';
  }
  return next;
}
