export const GUITAR_HEADSTOCK_DESIGNS = Object.freeze([
  {
    id: "gold-inline",
    label: "골드 기타",
    headstockSrc: "/assets/tuner/just-play-gold-inline-headstock.png",
    headstockFit: "cover",
    // Six inline tuners, from low E near the nut to high E at the tip.
    headstockHotspots: {
      6: { left: 21.5, top: 61.5 },
      5: { left: 25.0, top: 51.5 },
      4: { left: 28.5, top: 41.0 },
      3: { left: 32.0, top: 30.5 },
      2: { left: 35.5, top: 20.0 },
      1: { left: 39.5, top: 9.5 },
    },
  },
  {
    id: "original",
    label: "블랙 기타",
    headstockSrc: "/assets/tuner/just-play-black-headstock.png",
    headstockFit: "cover",
    headstockHotspots: {
      6: { left: 19.5, top: 50.5 },
      5: { left: 19.5, top: 36.0 },
      4: { left: 19.5, top: 21.5 },
      3: { left: 80.5, top: 21.5 },
      2: { left: 80.5, top: 36.0 },
      1: { left: 80.5, top: 50.5 },
    },
  },
  {
    id: "classical",
    label: "클래식 기타",
    headstockSrc: "/assets/tuner/just-play-classical-headstock.png",
    // Cover trims only the square source's transparent side margins.
    headstockFit: "cover",
    externalStringButtons: true,
    // Separate string controls outside the head, independent of peg positions.
    headstockHotspots: {
      6: { left: 14.0, top: 61.0 },
      5: { left: 14.0, top: 43.0 },
      4: { left: 14.0, top: 25.0 },
      3: { left: 86.0, top: 25.0 },
      2: { left: 86.0, top: 43.0 },
      1: { left: 86.0, top: 61.0 },
    },
  },
]);

const VIOLIN_HEADSTOCK_HOTSPOTS = Object.freeze({
  4: { left: 18.0, top: 49.0 },
  3: { left: 19.0, top: 32.0 },
  2: { left: 81.0, top: 30.5 },
  1: { left: 82.0, top: 47.5 },
});

export const VIOLIN_HEADSTOCK_DESIGNS = Object.freeze([
  {
    id: "violin-red",
    label: "레드 바이올린",
    headstockSrc: "/assets/tuner/just-play-violin-red-headstock.png",
    headstockFit: "contain",
    headstockHotspots: VIOLIN_HEADSTOCK_HOTSPOTS,
  },
  {
    id: "violin-gold",
    label: "골드 바이올린",
    headstockSrc: "/assets/tuner/just-play-violin-gold-headstock.png",
    headstockFit: "contain",
    headstockHotspots: VIOLIN_HEADSTOCK_HOTSPOTS,
  },
  {
    id: "violin-wood",
    label: "우드 바이올린",
    headstockSrc: "/assets/tuner/just-play-violin-wood-headstock.png",
    headstockFit: "contain",
    headstockHotspots: VIOLIN_HEADSTOCK_HOTSPOTS,
  },
]);

export const UKULELE_HEADSTOCK_DESIGNS = Object.freeze([
  {
    id: "ukulele-original",
    label: "기본 우쿨렐레",
    headstockSrc: "/assets/tuner/just-play-ukulele-headstock.png",
    headstockFit: "contain",
    headstockHotspots: {
      4: { left: 12.5, top: 27.4 },
      3: { left: 12.5, top: 50.5 },
      2: { left: 87.5, top: 50.5 },
      1: { left: 87.5, top: 27.4 },
    },
  },
  {
    id: "ukulele-dark-gold",
    label: "다크 골드 우쿨렐레",
    headstockSrc: "/assets/tuner/just-play-ukulele-dark-gold-headstock.png",
    headstockFit: "cover",
    // Follow the new image's strings: G/A at the lower posts, C/E above.
    headstockHotspots: {
      4: { left: 12.5, top: 39.5 },
      3: { left: 12.5, top: 21.0 },
      2: { left: 87.5, top: 22.0 },
      1: { left: 87.5, top: 41.0 },
    },
  },
  {
    id: "ukulele-flower",
    label: "플라워 우쿨렐레",
    headstockSrc: "/assets/tuner/just-play-ukulele-flower-headstock.png",
    headstockFit: "cover",
    headstockHotspots: {
      4: { left: 12.0, top: 44.0 },
      3: { left: 12.0, top: 22.0 },
      2: { left: 88.0, top: 22.0 },
      1: { left: 88.0, top: 44.0 },
    },
  },
]);

// Five-string: B/E/A lower-to-upper left, D/G upper-to-lower right.
// Its square asset fills the frame height and extends into the side margins.
export const BASS_PRESET_HEADSTOCKS = Object.freeze({
  5: {
    designId: "bass-five",
    headstockSrc: "/assets/tuner/just-play-bass-5-headstock.png",
    headstockFit: "cover",
    headstockHotspots: {
      5: { left: 6.5, top: 55.0 },
      4: { left: 11.0, top: 35.3 },
      3: { left: 15.5, top: 17.5 },
      2: { left: 90.5, top: 34.3 },
      1: { left: 96.5, top: 53.0 },
    },
  },
  6: {
    headstockSrc: "/assets/tuner/just-play-bass-6-headstock.png",
    headstockFit: "cover",
    headstockHotspots: {
      6: { left: 16.5, top: 54.5 },
      5: { left: 20.0, top: 40.0 },
      4: { left: 23.5, top: 25.0 },
      3: { left: 77.0, top: 26.0 },
      2: { left: 80.0, top: 41.0 },
      1: { left: 83.0, top: 55.5 },
    },
  },
});

export const BASS_HEADSTOCK_DESIGNS = Object.freeze({
  4: [
    {
      designId: "bass-four",
      designLabel: "기본 4현 베이스",
      headstockSrc: "/assets/tuner/just-play-bass-headstock.png",
      headstockFit: "contain",
      headstockHotspots: {
        4: { left: 14.8, top: 67.3 },
        3: { left: 20.0, top: 50.0 },
        2: { left: 25.0, top: 32.8 },
        1: { left: 31.5, top: 15.1 },
      },
    },
    {
      designId: "bass-four-pink",
      designLabel: "핑크 4현 베이스",
      headstockSrc: "/assets/tuner/just-play-bass-4-pink-headstock.png",
      headstockFit: "cover",
      headstockHotspots: {
        4: { left: 14.0, top: 63.5 },
        3: { left: 17.5, top: 47.0 },
        2: { left: 22.0, top: 30.5 },
        1: { left: 28.5, top: 14.5 },
      },
    },
  ],
  5: [
    { ...BASS_PRESET_HEADSTOCKS[5], designLabel: "기본 5현 베이스" },
    {
      designId: "bass-five-pink",
      designLabel: "핑크 5현 베이스",
      headstockSrc: "/assets/tuner/just-play-bass-5-pink-headstock.png",
      headstockFit: "cover",
      headstockHotspots: {
        5: { left: 14.5, top: 43.0 },
        4: { left: 21.0, top: 30.0 },
        3: { left: 27.5, top: 17.5 },
        2: { left: 84.0, top: 30.0 },
        1: { left: 90.0, top: 44.5 },
      },
    },
  ],
  6: [
    { ...BASS_PRESET_HEADSTOCKS[6], designId: "bass-six", designLabel: "기본 6현 베이스" },
    {
      designId: "bass-six-pink",
      designLabel: "핑크 6현 베이스",
      headstockSrc: "/assets/tuner/just-play-bass-6-pink-headstock.png",
      headstockFit: "cover",
      headstockHotspots: {
        6: { left: 15.5, top: 53.5 },
        5: { left: 18.0, top: 41.0 },
        4: { left: 20.5, top: 28.0 },
        3: { left: 84.0, top: 28.5 },
        2: { left: 85.5, top: 41.0 },
        1: { left: 87.0, top: 53.5 },
      },
    },
  ],
});

export function isNextHeadstockSwipe(deltaX, deltaY) {
  return deltaY <= -48 && -deltaY > Math.abs(deltaX) * 1.5;
}
