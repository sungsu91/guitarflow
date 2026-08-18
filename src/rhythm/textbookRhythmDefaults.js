export const TEXTBOOK_RHYTHM_DEFAULTS = Object.freeze({
  drum: Object.freeze({
    kick: Object.freeze([0, 8]),
    snare: Object.freeze([4, 12]),
    closedHat: Object.freeze([0, 2, 4, 6, 8, 10, 12, 14]),
    shaker: Object.freeze([]),
  }),
  bass: Object.freeze([
    Object.freeze({ index: 0, value: "root" }),
    Object.freeze({ index: 4, value: "root" }),
    Object.freeze({ index: 8, value: "root" }),
    Object.freeze({ index: 12, value: "root" }),
  ]),
  piano: Object.freeze([
    Object.freeze({ index: 0, style: "chord" }),
    Object.freeze({ index: 6, style: "stab" }),
    Object.freeze({ index: 8, style: "chord" }),
    Object.freeze({ index: 14, style: "stab" }),
  ]),
});
