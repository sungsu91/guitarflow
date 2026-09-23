import ko from "../i18n/locales/ko.js";
import { ETUDES, LEVELS } from './catalog.js';
import { TYPES } from './tracks.js';

export const DEFAULT_FILTERS = Object.freeze({type:ko["app.scales"], level:ko["etudes.beginner"], style:ko["app.all"]});

// Type and difficulty define the course. A style is only a refinement inside it.
export const filterEtudes = filters => ETUDES.filter(e => e.type===filters.type && e.level===filters.level && (filters.style===ko["app.all"] || e.style===filters.style));

export const availableStyles = filters => [ko["app.all"], ...new Set(ETUDES.filter(e =>
  e.type===filters.type && e.level===filters.level).map(e=>e.style))];

export const lessonCourse = (selected, filters) => selected ? filterEtudes({
  type:selected.type, level:selected.level, style:filters?.style ?? ko["app.all"],
}) : [];

export const canOpenLesson = (selected, lesson, filters) => Boolean(selected && lesson &&
  (!filters || (selected.type===filters.type && selected.level===filters.level)) &&
  lessonCourse(selected,filters).some(e=>e.id===lesson.id));

export function changeEtudeFilter(filters, key, value) {
  const next = {type:filters.type, level:filters.level, style:filters.style};
  if (['type','level','style'].includes(key)) next[key]=value;
  if (!TYPES.includes(next.type)) next.type=DEFAULT_FILTERS.type;
  if (!LEVELS.includes(next.level)) next.level=DEFAULT_FILTERS.level;
  // Never jump to another technique or difficulty to satisfy a genre selection.
  if (!availableStyles(next).includes(next.style)) next.style=ko["app.all"];
  return next;
}
