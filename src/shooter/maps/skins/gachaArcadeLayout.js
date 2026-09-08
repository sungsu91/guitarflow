export const GACHA_ARCADE_CLEAR_CORRIDOR = Object.freeze({ left: 460, right: 1076 });

export const GACHA_ARCADE_MACHINE_SLOTS = Object.freeze([
  { id: "left_1", side: "left", centerX: 300, baseY: 760, machineWidth: 280 },
  { id: "right_1", side: "right", centerX: 1236, baseY: 880, machineWidth: 300 },
  { id: "left_2", side: "left", centerX: 245, baseY: 1160, machineWidth: 375 },
  { id: "right_2", side: "right", centerX: 1291, baseY: 1390, machineWidth: 400 },
  { id: "left_3", side: "left", centerX: 200, baseY: 1740, machineWidth: 440 },
  { id: "right_3", side: "right", centerX: 1331, baseY: 2150, machineWidth: 460 },
  { id: "left_4", side: "left", centerX: 150, baseY: 2550, machineWidth: 470 },
].map((slot) => Object.freeze(slot)));

export function resolveGachaArcadeSlot(slot) {
  const machineHeight = Math.round(slot.machineWidth * 1.5);
  const platformWidth = Math.round(slot.machineWidth * 1.12);
  const platformHeight = Math.round(platformWidth / (640 / 240));
  const machineInset = Math.round(platformHeight * 0.38);
  return Object.freeze({
    ...slot,
    machine: Object.freeze({
      x: Math.round(slot.centerX - slot.machineWidth / 2),
      y: slot.baseY + machineInset - machineHeight,
      width: slot.machineWidth,
      height: machineHeight,
    }),
    platform: Object.freeze({
      x: Math.round(slot.centerX - platformWidth / 2),
      y: slot.baseY,
      width: platformWidth,
      height: platformHeight,
    }),
  });
}

export const GACHA_ARCADE_RESOLVED_SLOTS = Object.freeze(
  GACHA_ARCADE_MACHINE_SLOTS.map(resolveGachaArcadeSlot),
);
