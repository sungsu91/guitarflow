export const TIME_SIGNATURE_OPTIONS = [
  { id: "1/4", label: "1/4", beats: 1, beatUnit: 4 },
  { id: "2/4", label: "2/4", beats: 2, beatUnit: 4 },
  { id: "3/4", label: "3/4", beats: 3, beatUnit: 4 },
  { id: "4/4", label: "4/4", beats: 4, beatUnit: 4 },
  { id: "3/8", label: "3/8", beats: 3, beatUnit: 8 },
  { id: "6/8", label: "6/8", beats: 6, beatUnit: 8 },
  { id: "9/8", label: "9/8", beats: 9, beatUnit: 8 },
  { id: "12/8", label: "12/8", beats: 12, beatUnit: 8 },
];

// Common rhythm sounds first; related variants stay adjacent in both selectors.
export const METRONOME_TONE_OPTIONS = [
  { id: "tick", label: "Tick" },
  { id: "kick", label: "Kick", src: "/sounds/kick.wav" },

  { id: "snare", label: "Snare", src: "/sounds/snare.wav" },
  { id: "electronicSnare", label: "Electronic Snare", src: "/sounds/electronic-snare.wav" },
  { id: "brushSnare", label: "Brush Snare", src: "/sounds/brushsnare.wav" },
  { id: "rim", label: "Rim", src: "/sounds/rim.wav" },
  { id: "stick", label: "Stick", src: "/sounds/stick.wav" },

  { id: "hihat", label: "Closed Hat", src: "/sounds/closed hihat.wav" },
  { id: "openHihat", label: "Open Hat", src: "/sounds/openhihat.wav" },
  { id: "pedalHihat", label: "Pedal Hi-Hat", src: "/sounds/pedal-hihat.wav" },

  { id: "crash", label: "Crash", src: "/sounds/crash.wav" },
  { id: "ride", label: "Ride", src: "/sounds/ride.wav" },
  { id: "rideBell", label: "Ride Bell", src: "/sounds/ride-bell.wav" },

  { id: "tomHigh", label: "High Tom", src: "/sounds/tom-high.wav" },
  { id: "tomMid", label: "Mid Tom", src: "/sounds/tom-mid.wav" },
  { id: "tomLow", label: "Low Tom", src: "/sounds/tom-low.wav" },

  { id: "clap", label: "Clap", src: "/sounds/clap.wav" },
  { id: "snap", label: "Snap", src: "/sounds/snap.wav" },
  { id: "fingerTap", label: "Finger Tap", src: "/sounds/fingertap.wav" },

  { id: "shaker", label: "Shaker", src: "/sounds/shaker.wav" },
  { id: "tambourine", label: "Tambourine", src: "/sounds/tambourine.wav" },
  { id: "cabasa", label: "Cabasa", src: "/sounds/cabasa.wav" },

  { id: "cowbell", label: "Cowbell", src: "/sounds/cowbell.wav" },
  { id: "agogo", label: "Agogo", src: "/sounds/agogobell.wav" },
  { id: "triangle", label: "Triangle", src: "/sounds/trangle.wav" },

  { id: "congaSlap", label: "Conga Slap", src: "/sounds/congaslap.wav" },
  { id: "clave", label: "Clave", src: "/sounds/clave.wav" },
  { id: "woodblock", label: "Woodblock", src: "/sounds/woodblock.wav" },
];
