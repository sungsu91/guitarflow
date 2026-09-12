import { ETUDES, LEVELS, ROOTS } from './catalog.js';
import { TYPES } from './tracks.js';

export const DEFAULT_FILTERS = Object.freeze({type:'스케일', level:'초급', root:'C', style:'전체'});

// Type and difficulty define the course. A style is only a refinement inside it.
export const filterEtudes = filters => ETUDES.filter(e => e.root===filters.root &&
  e.type===filters.type && e.level===filters.level && (filters.style==='전체' || e.style===filters.style));

export const availableStyles = filters => ['전체', ...new Set(ETUDES.filter(e =>
  e.root===filters.root && e.type===filters.type && e.level===filters.level).map(e=>e.style))];
export const availableRoots = filters => ROOTS.filter(root=>ETUDES.some(e=>e.root===root&&e.type===filters.type&&e.level===filters.level));

export const lessonCourse = (selected, filters) => selected ? filterEtudes({
  root:selected.root, type:selected.type, level:selected.level, style:filters?.style ?? '전체',
}) : [];

export const canOpenLesson = (selected, lesson, filters) => Boolean(selected && lesson &&
  (!filters || (selected.root===filters.root && selected.type===filters.type && selected.level===filters.level)) &&
  lessonCourse(selected,filters).some(e=>e.id===lesson.id));

export function changeEtudeFilter(filters, key, value) {
  const next = { ...filters, [key]: value };
  if (!TYPES.includes(next.type)) next.type=DEFAULT_FILTERS.type;
  if (!LEVELS.includes(next.level)) next.level=DEFAULT_FILTERS.level;
  const roots=availableRoots(next);
  if (!roots.includes(next.root)) next.root=roots[0];
  // Never jump to another technique or difficulty to satisfy a genre selection.
  if (!availableStyles(next).includes(next.style)) next.style='전체';
  return next;
}
