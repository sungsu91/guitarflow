// Visual-only observer: these values never flow back into combat or audio.
export function getPetReaction(previous, current) {
  if (!previous || current.score < previous.score || current.hits < previous.hits) return null;
  const hit = current.hits > previous.hits || current.score > previous.score;
  if (!hit) return null;
  return Math.floor(current.combo / 5) > Math.floor(previous.combo / 5) ? 2 : 1;
}

export function createPetAnimation(actions) {
  const names = Object.keys(actions);
  let actionIndex = 0;
  let frame = 0;
  let elapsed = 0;
  let queuedReaction = 0;

  return {
    react(index) {
      // One bounded queue; a combo celebration wins over repeated hits.
      if (index === 1 || index === 2) queuedReaction = Math.max(queuedReaction, index);
    },
    advance(deltaMs = 0) {
      elapsed += Math.max(0, deltaMs);
      let action = actions[names[actionIndex]];
      while (elapsed + 0.0001 >= 1000 / action.fps) {
        elapsed = Math.max(0, elapsed - 1000 / action.fps);
        frame += 1;
        if (frame >= action.frameCount) {
          frame = 0;
          if (actionIndex === 0) {
            actionIndex = queuedReaction;
            queuedReaction = 0;
          } else {
            // Every event plays all eight frames once and returns to idle.
            actionIndex = 0;
          }
          action = actions[names[actionIndex]];
        }
      }
      return { name: names[actionIndex], ...action, frame, nextFrameMs: 1000 / action.fps - elapsed };
    },
  };
}

export function drawPetFrame(context, atlas, geometry, frame, size, facing = "right") {
  const { cellWidth, cellHeight, anchor } = geometry;
  const scale = size / cellWidth;
  const petX = Math.round(anchor.x * scale);
  const petY = Math.round(anchor.y * scale);
  // Clear the entire separate surface: transparent pixels must never retain a prior pose.
  context.clearRect(0, 0, size, size);
  if (facing === "left") {
    context.save();
    context.translate(size, 0);
    context.scale(-1, 1);
  }
  context.drawImage(atlas, frame.frame * cellWidth, frame.row * cellHeight, cellWidth, cellHeight,
    petX - Math.round(anchor.x * scale), petY - Math.round(anchor.y * scale), size, size);
  if (facing === "left") context.restore();
}
