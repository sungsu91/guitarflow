export const DESKTOP_HORIZONTAL_MAP_BACKDROPS = Object.freeze({
  "coastal-cove": Object.freeze({
    id: "coastal-cove",
    src: "/assets/maps/desktop-horizontal/coast-horizontal.png",
  }),
  "river-garden": Object.freeze({
    id: "river-garden",
    src: "/assets/maps/desktop-horizontal/river-horizontal.png",
  }),
  park: Object.freeze({
    id: "park",
    src: "/assets/maps/desktop-horizontal/park-horizontal.png",
  }),
  "lava-canyon": Object.freeze({
    id: "lava-canyon",
    src: "/assets/maps/desktop-horizontal/lava-horizontal.png",
  }),
});

export function getDesktopHorizontalMapBackdrop(mapId) {
  return DESKTOP_HORIZONTAL_MAP_BACKDROPS[mapId] ?? null;
}
