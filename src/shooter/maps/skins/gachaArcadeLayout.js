export const GACHA_ARCADE_CLEAR_CORRIDOR = Object.freeze({ left: 460, right: 1076 });

export const GACHA_ARCADE_MACHINE_SLOTS = Object.freeze([
  { id: "left_1", side: "left", theme: "lavender", centerX: 245, baseY: 760, machineWidth: 339 },
  { id: "right_1", side: "right", theme: "mint", centerX: 1301, baseY: 880, machineWidth: 363 },
  { id: "left_2", side: "left", theme: "pink", centerX: 210, baseY: 1160, machineWidth: 454 },
  { id: "right_2", side: "right", theme: "lavender", centerX: 1331, baseY: 1390, machineWidth: 484 },
  { id: "left_3", side: "left", theme: "mint", centerX: 185, baseY: 1740, machineWidth: 532 },
  { id: "right_3", side: "right", theme: "pink", centerX: 1355, baseY: 2150, machineWidth: 557 },
  { id: "left_4", side: "left", theme: "lavender", centerX: 150, baseY: 2550, machineWidth: 569 },
].map((slot) => Object.freeze(slot)));

export function resolveGachaArcadeSlot(slot) {
  const machineHeight = Math.round(slot.machineWidth * 1.5);
  const platformWidth = Math.round(slot.machineWidth * 1.28);
  const platformHeight = Math.round(platformWidth / (640 / 240));
  const machineBaseY = slot.baseY + Math.round(slot.machineWidth * 0.16);
  return Object.freeze({
    ...slot,
    machine: Object.freeze({
      x: Math.round(slot.centerX - slot.machineWidth / 2),
      y: machineBaseY - machineHeight,
      width: slot.machineWidth,
      height: machineHeight,
    }),
    platform: Object.freeze({
      x: Math.round(slot.centerX - platformWidth / 2),
      y: Math.round(machineBaseY - platformHeight * 0.5),
      width: platformWidth,
      height: platformHeight,
    }),
  });
}

export const GACHA_ARCADE_RESOLVED_SLOTS = Object.freeze(
  GACHA_ARCADE_MACHINE_SLOTS.map(resolveGachaArcadeSlot),
);
