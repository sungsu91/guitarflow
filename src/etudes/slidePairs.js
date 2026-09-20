// Match a whole slide by physical string, never by chord array order.
export function slidePairs(first, next) {
  if (!first || !next || first.rest || next.rest || first.dead || next.dead) return [];
  const from = first.notes ?? first.tones ?? [first], to = next.notes ?? next.tones ?? [next];
  if (!from.length || from.length !== to.length) return [];
  const pairs = from.map((tone, index) => ({ first: index, last: to.findIndex(other => other.string === tone.string) }));
  if (pairs.some(({first: i, last: j}) => j < 0 || from[i].dead || to[j].dead || from[i].unplaced || to[j].unplaced || from[i].fret === to[j].fret)) return [];
  return pairs;
}
