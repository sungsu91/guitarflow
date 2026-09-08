export const GACHA_ARCADE_CLEAR_CORRIDOR = Object.freeze({ left: 460, right: 1076 });

export const GACHA_ARCADE_MACHINE_SLOTS = Object.freeze([
  { id: "left_1", side: "left", centerX: 310, baseY: 760, machineWidth: 220 },
  { id: "right_1", side: "right", centerX: 1226, baseY: 880, machineWidth: 240 },
  { id: "left_2", side: "left", centerX: 270, baseY: 1160, machineWidth: 270 },
  { id: "right_2", side: "right", centerX: 1266, baseY: 1390, machineWidth: 290 },
  { id: "left_3", side: "left", centerX: 220, baseY: 1740, machineWidth: 320 },
  { id: "right_3", side: "right", centerX: 1316, baseY: 2150, machineWidth: 350 },
  { id: "left_4", side: "left", centerX: 170, baseY: 2550, machineWidth: 380 },
].map((slot) => Object.freeze(slot)));

export function resolveGachaArcadeSlot(slot) {
  const machineHeight = Math.round(slot.machineWidth * 1.5);
  const platformWidth = Math.round(slot.machineWidth * 1.18);
  const platformHeight = Math.round(platformWidth / 3.35);
  return Object.freeze({
    ...slot,
    machine: Object.freeze({
      x: Math.round(slot.centerX - slot.machineWidth / 2),
      y: slot.baseY - machineHeight,
      width: slot.machineWidth,
      height: machineHeight,
    }),
    platform: Object.freeze({
      x: Math.round(slot.centerX - platformWidth / 2),
      y: Math.round(slot.baseY - platformHeight * 0.48),
      width: platformWidth,
      height: platformHeight,
    }),
  });
}

export const GACHA_ARCADE_RESOLVED_SLOTS = Object.freeze(
  GACHA_ARCADE_MACHINE_SLOTS.map(resolveGachaArcadeSlot),
);
