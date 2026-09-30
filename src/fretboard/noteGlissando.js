export function containsNotePoint(note, point) {
  return Math.hypot(point.x - note.x, point.y - note.y) <= note.radius;
}

// Intersect the entire pointer segment so a fast move cannot skip small notes.
export function notesAlongSegment(from, to, notes) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  return notes.flatMap(note => {
    const x = from.x - note.x, y = from.y - note.y;
    const c = x * x + y * y - note.radius * note.radius;
    if (!lengthSquared) return c <= 0 ? [{note, entry: 0}] : [];
    const b = 2 * (x * dx + y * dy);
    const discriminant = b * b - 4 * lengthSquared * c;
    if (discriminant < 0) return [];
    const root = Math.sqrt(discriminant);
    const entry = (-b - root) / (2 * lengthSquared);
    const exit = (-b + root) / (2 * lengthSquared);
    return exit < 0 || entry > 1 ? [] : [{note, entry: Math.max(0, entry)}];
  }).sort((a, b) => a.entry - b.entry).map(hit => hit.note);
}
