import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const argumentsList = process.argv.slice(2);
const lobbyOnly = argumentsList.includes("--lobby-only");
const fullCycle = argumentsList.includes("--full-cycle");
const positionalArguments = argumentsList.filter((argument) => !argument.startsWith("--"));
const baseUrl = positionalArguments[0] ?? "http://127.0.0.1:5173";
const debuggerUrl = positionalArguments[1] ?? "http://127.0.0.1:9222";
const artifactDirectory = path.resolve("artifacts", "lava-dragon-runtime");
const shooterUrl = `${baseUrl}/?debugHitbox=1#shooter`;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

class CdpClient {
  constructor(socketUrl) {
    this.socket = new WebSocket(socketUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  async connect() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
  }

  call(method, params = {}, sessionId) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { reject, resolve });
      this.socket.send(JSON.stringify({
        id,
        method,
        params,
        ...(sessionId ? { sessionId } : {}),
      }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function poll(evaluate, expression, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await evaluate(expression);
    if (value) return value;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

const version = await fetch(`${debuggerUrl}/json/version`).then((response) => response.json());
const client = new CdpClient(version.webSocketDebuggerUrl);
await client.connect();
console.log("[runtime] connected");

const { targetId } = await client.call("Target.createTarget", { url: shooterUrl });
const { sessionId } = await client.call("Target.attachToTarget", { flatten: true, targetId });
await client.call("Page.enable", {}, sessionId);
await client.call("Runtime.enable", {}, sessionId);
console.log("[runtime] target attached");

const evaluate = async (expression) => {
  const response = await client.call("Runtime.evaluate", {
    awaitPromise: true,
    expression,
    returnByValue: true,
  }, sessionId);
  if (response.exceptionDetails) {
    const detail = response.exceptionDetails.exception?.description
      ?? response.exceptionDetails.exception?.value
      ?? response.exceptionDetails.text;
    throw new Error(detail || "Runtime evaluation failed");
  }
  return response.result?.value;
};

await poll(
  evaluate,
  `location.origin === ${JSON.stringify(new URL(baseUrl).origin)} && document.readyState === 'complete'`,
  15_000,
  "initial document load",
);
console.log("[runtime] initial page loaded");
await evaluate("localStorage.setItem('rifflabShooterMapV2', 'lava-canyon'); true");
await client.call("Page.reload", { ignoreCache: true }, sessionId);

await poll(
  evaluate,
  "Boolean(document.querySelector('[data-map-skin=\"lava-canyon\"]'))",
  20_000,
  "Lava Canyon arena",
);
console.log("[runtime] lava canyon mounted");
await poll(
  evaluate,
  "!document.documentElement.classList.contains('app-is-launching')",
  20_000,
  "launch splash exit",
);
console.log("[runtime] splash exited");

const readyState = await evaluate(`(() => {
  const actor = document.querySelector('.shooterMapSkinAsset--event-actor');
  const ready = actor?.querySelector('.shooterMapEventActorReady, .shooterMapSpriteSheetAsset');
  if (!actor || !ready) return null;
  const actorStyle = getComputedStyle(actor);
  const readyStyle = getComputedStyle(ready);
  const rect = actor.getBoundingClientRect();
  return {
    actorDisplay: actorStyle.display,
    actorOpacity: actorStyle.opacity,
    actorRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    readyImage: ready.currentSrc || ready.src || readyStyle.backgroundImage,
    readyVisible: actorStyle.display !== 'none' && actorStyle.visibility !== 'hidden' && Number(actorStyle.opacity) > 0 && rect.width > 0 && rect.height > 0,
  };
})()`);

const bannerSamples = [];
for (let sampleIndex = 0; sampleIndex < 6; sampleIndex += 1) {
  bannerSamples.push(await evaluate(`(() => {
    const banner = document.querySelector('.shooterMapSpriteSheetAsset--wind-flag');
    if (!banner) return null;
    const style = getComputedStyle(banner);
    const rect = banner.getBoundingClientRect();
    return {
      animationDuration: style.animationDuration,
      animationName: style.animationName,
      backgroundPosition: style.backgroundPosition,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0,
    };
  })()`));
  await wait(70);
}
const bannerPositions = [...new Set(bannerSamples.map((sample) => sample?.backgroundPosition).filter(Boolean))];
console.log("[runtime] animated banner sampled", JSON.stringify({ bannerPositions, bannerSamples }));

await mkdir(artifactDirectory, { recursive: true });
const readyScreenshot = await client.call("Page.captureScreenshot", { format: "png" }, sessionId);
await writeFile(path.join(artifactDirectory, "ready.png"), Buffer.from(readyScreenshot.data, "base64"));
console.log("[runtime] ready pose captured", JSON.stringify(readyState));

let startClicked = false;
if (lobbyOnly) {
  console.log("[runtime] observing lobby without Start");
} else {
  const startButtonFound = await evaluate(`(() => {
    const button = document.querySelector('button[aria-label="슈팅게임 시작"]');
    if (!button) return false;
    button.scrollIntoView({ block: 'center', inline: 'center' });
    return true;
  })()`);
  if (!startButtonFound) throw new Error("Shooter start button was not found");
  await wait(300);
  const startButton = await evaluate(`(() => {
    const button = document.querySelector('button[aria-label="슈팅게임 시작"]');
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    return { x, y, hitLabel: document.elementFromPoint(x, y)?.closest('button')?.getAttribute('aria-label') ?? '' };
  })()`);
  if (!startButton) throw new Error("Shooter start button was not found");
  if (startButton.hitLabel !== "슈팅게임 시작") {
    throw new Error(`Shooter start button is covered by ${startButton.hitLabel || "another element"}`);
  }
  await client.call("Input.dispatchMouseEvent", {
    button: "left",
    clickCount: 1,
    type: "mousePressed",
    x: startButton.x,
    y: startButton.y,
  }, sessionId);
  await client.call("Input.dispatchMouseEvent", {
    button: "left",
    clickCount: 1,
    type: "mouseReleased",
    x: startButton.x,
    y: startButton.y,
  }, sessionId);
  startClicked = true;
  console.log("[runtime] start clicked", JSON.stringify(startButton));

  await poll(
    evaluate,
    "document.querySelector('.shooterArena')?.classList.contains('shooterArena--session')",
    20_000,
    "shooter playing state",
  );
  console.log("[runtime] shooter entered playing state");
}

const phases = [];
const phaseTransitions = [];
const positionSamples = [];
let actionScreenshotSaved = false;
let outboundStartedAt = 0;
let lastPhase = null;
let restoredBetweenCycles = false;
let secondTakeoffObserved = false;
const actionDeadline = Date.now() + (fullCycle ? 40_000 : 22_000);
console.log("[runtime] waiting for flight event");
while (Date.now() < actionDeadline) {
  const sample = await evaluate(`(() => {
    const run = document.querySelector('.shooterMapFlyingDragonRun');
    const actor = document.querySelector('.shooterMapSkinAsset--event-actor');
    if (!run) return { actorOpacity: actor ? getComputedStyle(actor).opacity : null, phase: null };
    const rect = run.getBoundingClientRect();
    return {
      actorOpacity: actor ? getComputedStyle(actor).opacity : null,
      animationName: getComputedStyle(run).animationName,
      phase: run.dataset.phase,
      sequence: run.dataset.sequence,
      visibleInViewport: rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth,
      x: rect.x,
      y: rect.y,
    };
  })()`);
  if (sample?.phase) {
    if (!phases.includes(sample.phase)) phases.push(sample.phase);
    if (sample.phase !== lastPhase) {
      phaseTransitions.push(sample.phase);
      lastPhase = sample.phase;
    }
    if (restoredBetweenCycles && sample.phase === "takeoff") secondTakeoffObserved = true;
    if (positionSamples.length === 0) console.log("[runtime] first action frame", JSON.stringify(sample));
    if (positionSamples.length < 12) positionSamples.push(sample);
    if (sample.phase === "outbound" && !outboundStartedAt) outboundStartedAt = Date.now();
    if (!actionScreenshotSaved && outboundStartedAt && Date.now() - outboundStartedAt >= 1_500) {
      const actionScreenshot = await client.call("Page.captureScreenshot", { format: "png" }, sessionId);
      await writeFile(path.join(artifactDirectory, "outbound.png"), Buffer.from(actionScreenshot.data, "base64"));
      actionScreenshotSaved = true;
    }
  } else if (phases.includes("landing") && Number(sample?.actorOpacity) > 0) {
    restoredBetweenCycles = true;
    lastPhase = null;
  }
  const shortObservationComplete = phases.includes("takeoff") && phases.includes("outbound") && actionScreenshotSaved;
  const fullObservationComplete = shortObservationComplete
    && phases.includes("return")
    && phases.includes("landing")
    && restoredBetweenCycles
    && secondTakeoffObserved;
  if (fullCycle ? fullObservationComplete : shortObservationComplete) break;
  await wait(120);
}
console.log("[runtime] flight observation complete", JSON.stringify({
  phaseTransitions,
  phases,
  restoredBetweenCycles,
  sampleCount: positionSamples.length,
  secondTakeoffObserved,
}));

const result = {
  actionScreenshotSaved,
  bannerPositions,
  bannerSamples,
  phaseTransitions,
  phases,
  positionSamples,
  readyState,
  restoredBetweenCycles,
  secondTakeoffObserved,
  startClicked,
};

console.log(JSON.stringify(result, null, 2));

await client.call("Target.closeTarget", { targetId });
client.close();

if (!readyState?.readyVisible) process.exitCode = 1;
if (!bannerSamples.some((sample) => sample?.visible)) process.exitCode = 1;
if (!bannerSamples.every((sample) => sample?.animationName === "shooterMapWindFlagFrames")) process.exitCode = 1;
if (bannerPositions.length < 2) process.exitCode = 1;
if (!phases.includes("takeoff") || !phases.includes("outbound")) process.exitCode = 1;
if (fullCycle && (!phases.includes("return") || !phases.includes("landing") || !restoredBetweenCycles || !secondTakeoffObserved)) {
  process.exitCode = 1;
}
