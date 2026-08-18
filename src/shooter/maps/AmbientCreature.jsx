import { memo, useEffect, useRef } from "react";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function parseHexColor(value, fallback = "#86c92a") {
  const color = /^#[0-9a-f]{6}$/i.test(String(value ?? "")) ? String(value) : fallback;
  return [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
}

function colorHue(value, fallback) {
  const [red, green, blue] = parseHexColor(value, fallback).map((channel) => channel / 255);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  if (!delta) return 0;
  const rawHue = maximum === red
    ? ((green - blue) / delta) % 6
    : maximum === green
      ? ((blue - red) / delta) + 2
      : ((red - green) / delta) + 4;
  return (rawHue * 60 + 360) % 360;
}

function colorHueShift(value, reference = "#86c92a") {
  const difference = colorHue(value, reference) - colorHue(reference, reference);
  return ((difference + 540) % 360) - 180;
}

function randomWait(interval) {
  return Math.max(900, interval * 1000 * (0.72 + Math.random() * 0.58));
}

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function HoppingFrogCreature({ creature, editMode = false, placement }) {
  const rootRef = useRef(null);
  const imageRef = useRef(null);
  const motionRef = useRef(null);
  const frames = creature?.frames ?? {};
  const settings = creature?.settings ?? {};
  const frameSignature = Object.values(frames).join("|");
  const settingsSignature = JSON.stringify(settings);
  const placementSignature = [placement?.x, placement?.y, placement?.scale].join("|");

  useEffect(() => {
    const root = rootRef.current;
    const image = imageRef.current;
    const stage = root?.closest(".shooterMapSkinStage");
    if (!root || !image || !stage || typeof window === "undefined") return undefined;

    const anchors = (settings.anchors ?? []).filter((point) => (
      Number.isFinite(point?.x) && Number.isFinite(point?.y)
    ));
    const base = {
      x: Number.isFinite(placement?.x) ? placement.x : 0.5,
      y: Number.isFinite(placement?.y) ? placement.y : 0.5,
    };
    const scale = Math.max(0.1, Number(placement?.scale) || 1);
    const speed = clamp(Number(settings.animationSpeed) || 1, 0.25, 3);
    const jumpHeight = clamp(Number(settings.jumpHeight) || 0.1, 0.02, 0.3);
    const jumpDistance = clamp(Number(settings.jumpDistance) || 0.4, 0.04, 1.5);
    const jumpInterval = clamp(Number(settings.jumpInterval) || 4.8, 1, 20);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const animationAllowed = !editMode && settings.enabled !== false && anchors.length > 1 && !reducedMotion;
    const savedMotion = motionRef.current;
    const firstLanding = anchors[0] ?? base;
    let current = !editMode && savedMotion?.current
      ? { ...savedMotion.current }
      : { ...firstLanding };
    let currentAnchorIndex = savedMotion?.anchorId
      ? anchors.findIndex((point) => point.id === savedMotion.anchorId)
      : anchors.findIndex((point) => distance(point, current) < 0.001);
    let sequenceIndex = currentAnchorIndex >= 0
      ? currentAnchorIndex
      : savedMotion?.sequenceIndex ?? 0;
    let timer = 0;
    let animationFrame = 0;
    let active = true;
    let intersecting = true;
    let visible = document.visibilityState !== "hidden";
    let facing = savedMotion?.facing || 1;
    let pose = "";

    const setPose = (nextPose) => {
      if (pose === nextPose) return;
      pose = nextPose;
      image.src = frames[nextPose] || frames.idle || image.src;
      root.dataset.pose = nextPose;
    };

    const setPosition = (point, lift = 0, squash = 1, direction = facing) => {
      const rect = stage.getBoundingClientRect();
      const offsetX = ((point.x - base.x) * rect.width) / scale;
      const offsetY = (((point.y - base.y) * rect.height) - lift) / scale;
      facing = direction || facing;
      root.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
      root.style.setProperty("--frog-facing", String(facing));
      root.style.setProperty("--frog-squash", String(squash));
      motionRef.current = {
        ...(motionRef.current ?? {}),
        current: { ...point },
        facing,
        sequenceIndex,
      };
    };

    const clearWork = () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(animationFrame);
      timer = 0;
      animationFrame = 0;
    };

    const canAnimate = () => active && visible && intersecting && animationAllowed;
    let scheduleIdle;

    const pickDestination = () => {
      if (anchors.length < 2) return null;
      if (settings.mode === "sequence") {
        sequenceIndex = (sequenceIndex + 1) % anchors.length;
        return { index: sequenceIndex, point: anchors[sequenceIndex] };
      }

      const nearby = anchors
        .map((point, index) => ({ index, point }))
        .filter((candidate) => candidate.index !== currentAnchorIndex && distance(current, candidate.point) <= jumpDistance);
      const candidates = nearby.length
        ? nearby
        : anchors.map((point, index) => ({ index, point })).filter((candidate) => candidate.index !== currentAnchorIndex);
      return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
    };

    const startJump = () => {
      if (!canAnimate()) return;
      const destination = pickDestination();
      if (!destination) {
        scheduleIdle(randomWait(jumpInterval));
        return;
      }
      const origin = { ...current };
      const direction = destination.point.x < origin.x ? -1 : 1;
      const duration = 680 / speed;
      const startedAt = performance.now();

      const step = (now) => {
        if (!canAnimate()) return;
        const progress = clamp((now - startedAt) / duration, 0, 1);
        const travel = clamp((progress - 0.12) / 0.82, 0, 1);
        const easedTravel = travel < 0.5
          ? 2 * travel * travel
          : 1 - ((-2 * travel + 2) ** 2) / 2;
        const point = {
          x: origin.x + (destination.point.x - origin.x) * easedTravel,
          y: origin.y + (destination.point.y - origin.y) * easedTravel,
        };
        const lift = Math.sin(Math.PI * travel) * jumpHeight * stage.getBoundingClientRect().height;
        const squash = progress > 0.84
          ? 1 - Math.sin(((progress - 0.84) / 0.16) * Math.PI) * 0.14
          : 1;

        if (progress < 0.12) setPose("crouch");
        else if (progress < 0.28) setPose("takeoff");
        else if (progress < 0.78) setPose("air");
        else setPose("land");
        setPosition(point, lift, squash, direction);

        if (progress < 1) {
          animationFrame = window.requestAnimationFrame(step);
          return;
        }
        current = { ...destination.point };
        currentAnchorIndex = destination.index;
        sequenceIndex = destination.index;
        motionRef.current = {
          current: { ...current },
          anchorId: destination.point.id,
          facing: direction,
          sequenceIndex,
        };
        setPosition(current, 0, 1, direction);
        timer = window.setTimeout(() => {
          setPose("idle");
          scheduleIdle(randomWait(jumpInterval));
        }, 120 / speed);
      };

      animationFrame = window.requestAnimationFrame(step);
    };

    scheduleIdle = (delay) => {
      if (!canAnimate()) return;
      setPose("idle");
      setPosition(current);
      timer = window.setTimeout(() => {
        if (!canAnimate()) return;
        if (Math.random() < 0.42 && frames.blink) {
          setPose("blink");
          timer = window.setTimeout(() => {
            setPose("idle");
            timer = window.setTimeout(startJump, 110 / speed);
          }, 135 / speed);
          return;
        }
        startJump();
      }, delay);
    };

    const syncActivity = () => {
      visible = document.visibilityState !== "hidden";
      clearWork();
      if (!canAnimate()) {
        setPose("idle");
        setPosition(current);
        return;
      }
      scheduleIdle(320);
    };

    const observer = typeof IntersectionObserver === "function"
      ? new IntersectionObserver(([entry]) => {
        intersecting = Boolean(entry?.isIntersecting);
        syncActivity();
      }, { threshold: 0.01 })
      : null;
    observer?.observe(root);
    document.addEventListener("visibilitychange", syncActivity);

    setPose("idle");
    setPosition(current);
    if (animationAllowed) {
      scheduleIdle(randomWait(jumpInterval));
    }

    return () => {
      active = false;
      clearWork();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncActivity);
    };
  }, [creature?.type, editMode, frameSignature, placementSignature, settingsSignature]);

  return (
    <span className="shooterMapAmbientCreature" data-creature={creature?.type || "ambient"} ref={rootRef}>
      <img alt="" className="shooterMapAmbientCreatureFrame" decoding="async" draggable="false" ref={imageRef} src={frames.idle} />
    </span>
  );
}

function SleepingFrogCreature({ creature, editMode = false, placement }) {
  const rootRef = useRef(null);
  const imageRef = useRef(null);
  const personalityRef = useRef(null);
  if (!personalityRef.current) {
    personalityRef.current = {
      bubble: 0.88 + Math.random() * 0.22,
      fall: 0.78 + Math.random() * 0.46,
      tempo: 0.86 + Math.random() * 0.28,
    };
  }

  const frames = creature?.frames ?? {};
  const settings = creature?.settings ?? {};
  const previewMode = creature?.previewMode ?? "";
  const bubbleAnchors = creature?.bubbleAnchors ?? {};
  const frameSignature = Object.values(frames).join("|");
  const settingsSignature = JSON.stringify(settings);
  const placementSignature = [placement?.x, placement?.y, placement?.scale].join("|");
  const visualStyle = {
    "--sleep-frog-hue": `${colorHueShift(settings.bodyColor)}deg`,
    "--sleep-frog-saturation": String(clamp(Number(settings.bodySaturation) || 1, 0.45, 1.8)),
    "--sleep-frog-brightness": String(clamp(Number(settings.bodyBrightness) || 1, 0.55, 1.45)),
    "--sleep-bubble-color": /^#[0-9a-f]{6}$/i.test(String(settings.bubbleColor ?? ""))
      ? String(settings.bubbleColor)
      : "#8fe7ee",
    "--sleep-bubble-idle-x": `${bubbleAnchors.idle?.x ?? 49}%`,
    "--sleep-bubble-idle-y": `${bubbleAnchors.idle?.y ?? 37.5}%`,
    "--sleep-bubble-nod-x": `${bubbleAnchors.nod?.x ?? 49}%`,
    "--sleep-bubble-nod-y": `${bubbleAnchors.nod?.y ?? 39}%`,
    "--sleep-bubble-flat-x": `${bubbleAnchors.flat?.x ?? 50}%`,
    "--sleep-bubble-flat-y": `${bubbleAnchors.flat?.y ?? 76}%`,
  };

  useEffect(() => {
    const root = rootRef.current;
    const image = imageRef.current;
    if (!root || !image || typeof window === "undefined") return undefined;

    const personality = personalityRef.current;
    const speed = clamp(Number(settings.animationSpeed) || 1, 0.35, 2.5);
    const sleepInterval = clamp(Number(settings.sleepInterval) || 7.8, 3, 30);
    const fallChance = clamp((Number(settings.fallChance) || 0) * personality.fall, 0, 0.85);
    const flatDuration = clamp(Number(settings.flatDuration) || 8.5, 2, 30);
    const openMouthDuration = clamp(Number(settings.openMouthDuration) || 1.8, 0.3, 8);
    const bubbleBaseScale = clamp(Number(settings.bubbleBaseScale) || 0.82, 0.45, 1.5);
    const bubbleMaxScale = clamp(Number(settings.bubbleMaxScale) || 2.45, 1.2, 3);
    const bubbleSpeed = clamp(Number(settings.bubbleSpeed) || 1, 0.4, 2);
    const bubbleOpacity = clamp(Number(settings.bubbleOpacity) || 0.78, 0.2, 1);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const animationAllowed = !editMode && settings.enabled !== false && !reducedMotion;
    let timer = 0;
    let active = true;
    let intersecting = true;
    let visible = document.visibilityState !== "hidden";
    let pose = "";
    let scheduleNext;

    root.style.setProperty("--sleep-bubble-base-scale", String(bubbleBaseScale));
    root.style.setProperty("--sleep-bubble-max-scale", String(bubbleMaxScale * personality.bubble));
    root.style.setProperty("--sleep-bubble-duration", `${4.6 / bubbleSpeed}s`);
    root.style.setProperty("--sleep-bubble-opacity", String(bubbleOpacity));
    root.style.setProperty("--sleep-bubble-low-opacity", String(bubbleOpacity * 0.72));
    root.style.setProperty("--sleep-frog-breathe-duration", `${4.8 / speed}s`);
    root.style.setProperty("--sleep-frog-hue", `${colorHueShift(settings.bodyColor)}deg`);
    root.style.setProperty("--sleep-frog-saturation", String(clamp(Number(settings.bodySaturation) || 1, 0.45, 1.8)));
    root.style.setProperty("--sleep-frog-brightness", String(clamp(Number(settings.bodyBrightness) || 1, 0.55, 1.45)));
    root.style.setProperty("--sleep-bubble-color", /^#[0-9a-f]{6}$/i.test(String(settings.bubbleColor ?? ""))
      ? String(settings.bubbleColor)
      : "#8fe7ee");
    root.dataset.bubble = settings.bubbleEnabled === false ? "off" : "on";

    const randomDuration = (seconds, variance = 0.34) => (
      Math.max(250, seconds * 1000 * personality.tempo * (1 - variance + Math.random() * variance * 2))
    );

    const setPose = (nextPose) => {
      if (pose === nextPose) return;
      pose = nextPose;
      image.src = frames[nextPose] || frames.idle || image.src;
      root.dataset.pose = nextPose;
    };

    const setState = (state) => {
      root.dataset.state = state;
    };

    const clearWork = () => {
      window.clearTimeout(timer);
      timer = 0;
    };

    const canAnimate = () => active && visible && intersecting && animationAllowed;

    const wakeUp = () => {
      if (!canAnimate()) return;
      setPose("wakeup");
      setState("waking");
      timer = window.setTimeout(() => {
        setPose("idle");
        setState("idle");
        scheduleNext(randomDuration(sleepInterval));
      }, 520 / speed);
    };

    const fallAsleepFlat = () => {
      if (!canAnimate()) return;
      setPose("fall");
      setState("falling");
      timer = window.setTimeout(() => {
        setPose("flat");
        setState("landing");
        timer = window.setTimeout(() => {
          setPose("flatBreathe");
          setState("flat");
          root.style.setProperty(
            "--sleep-bubble-max-scale",
            String(bubbleMaxScale * personality.bubble * (0.92 + Math.random() * 0.16)),
          );
          timer = window.setTimeout(wakeUp, randomDuration(flatDuration, 0.28));
        }, 170 / speed);
      }, 430 / speed);
    };

    const nodOff = () => {
      if (!canAnimate()) return;
      setPose("nod");
      setState("nodding");
      timer = window.setTimeout(() => {
        setPose("idle");
        setState("startled");
        timer = window.setTimeout(() => {
          setState("idle");
          scheduleNext(randomDuration(sleepInterval));
        }, 155 / speed);
      }, (openMouthDuration * 1000) / speed);
    };

    scheduleNext = (delay) => {
      if (!canAnimate()) return;
      setPose("idle");
      setState("idle");
      root.style.setProperty(
        "--sleep-bubble-max-scale",
        String(bubbleMaxScale * personality.bubble * (0.9 + Math.random() * 0.2)),
      );
      timer = window.setTimeout(() => {
        if (!canAnimate()) return;
        if (Math.random() < fallChance) fallAsleepFlat();
        else nodOff();
      }, delay);
    };

    const runPreviewCycle = () => {
      if (!active || !editMode || previewMode !== "cycle") return;
      root.dataset.active = "true";
      setPose("idle");
      setState("idle");
      timer = window.setTimeout(() => {
        setPose("nod");
        setState("nodding");
        timer = window.setTimeout(() => {
          setPose("fall");
          setState("falling");
          timer = window.setTimeout(() => {
            setPose("flatBreathe");
            setState("flat");
            timer = window.setTimeout(() => {
              setPose("wakeup");
              setState("waking");
              timer = window.setTimeout(runPreviewCycle, 620 / speed);
            }, 1450 / speed);
          }, 520 / speed);
        }, Math.min(1800, (openMouthDuration * 1000) / speed));
      }, 900 / speed);
    };

    const showPreview = () => {
      clearWork();
      root.dataset.active = "true";
      if (previewMode === "cycle") {
        runPreviewCycle();
        return;
      }
      if (previewMode === "open-mouth") {
        setPose("nod");
        setState("nodding");
        return;
      }
      if (previewMode === "flat") {
        setPose("flatBreathe");
        setState("flat");
        return;
      }
      setPose("idle");
      setState("idle");
    };

    const syncActivity = () => {
      visible = document.visibilityState !== "hidden";
      if (editMode && previewMode) {
        if (visible) showPreview();
        else clearWork();
        return;
      }
      clearWork();
      root.dataset.active = canAnimate() ? "true" : "false";
      if (!canAnimate()) {
        setPose("idle");
        setState("idle");
        return;
      }
      scheduleNext(randomDuration(sleepInterval, 0.22));
    };

    const observer = !editMode && typeof IntersectionObserver === "function"
      ? new IntersectionObserver(([entry]) => {
        intersecting = Boolean(entry?.isIntersecting);
        syncActivity();
      }, { threshold: 0.01 })
      : null;
    observer?.observe(root);
    document.addEventListener("visibilitychange", syncActivity);

    if (editMode && previewMode) {
      showPreview();
    } else {
      setPose("idle");
      setState("idle");
      root.dataset.active = animationAllowed ? "true" : "false";
      if (animationAllowed) scheduleNext(randomDuration(sleepInterval));
    }

    return () => {
      active = false;
      clearWork();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncActivity);
    };
  }, [editMode, frameSignature, placementSignature, previewMode, settingsSignature]);

  return (
    <span
      className="shooterMapAmbientCreature shooterMapAmbientCreature--sleeping"
      data-active="false"
      data-bubble="on"
      data-creature="sleeping-frog"
      data-pose="idle"
      data-state="idle"
      ref={rootRef}
      style={visualStyle}
    >
      <img alt="" className="shooterMapAmbientCreatureFrame" decoding="async" draggable="false" ref={imageRef} src={frames.idle} />
      <span aria-hidden="true" className="shooterMapSleepingFrogBubble"><i /></span>
    </span>
  );
}

function DivingFrogCreature({ creature, editMode = false, placement }) {
  const rootRef = useRef(null);
  const imageRef = useRef(null);
  const frames = creature?.frames ?? {};
  const settings = creature?.settings ?? {};
  const frameSignature = Object.values(frames).join("|");
  const settingsSignature = JSON.stringify(settings);
  const placementSignature = [placement?.x, placement?.y, placement?.scale].join("|");

  useEffect(() => {
    const root = rootRef.current;
    const image = imageRef.current;
    const stage = root?.closest(".shooterMapSkinStage");
    if (!root || !image || !stage || typeof window === "undefined") return undefined;

    const anchors = (settings.anchors ?? []).filter((point) => (
      Number.isFinite(point?.x) && Number.isFinite(point?.y)
    ));
    const base = {
      x: Number.isFinite(placement?.x) ? placement.x : 0.5,
      y: Number.isFinite(placement?.y) ? placement.y : 0.5,
    };
    const origin = anchors[0] ?? base;
    const destination = anchors.find((point) => point.kind === "water") ?? anchors[1];
    const scale = Math.max(0.1, Number(placement?.scale) || 1);
    const speed = clamp(Number(settings.animationSpeed) || 1, 0.25, 3);
    const diveHeight = clamp(Number(settings.jumpHeight) || 0.07, 0.02, 0.3);
    const diveInterval = clamp(Number(settings.jumpInterval) || 7.2, 1, 20);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const animationAllowed = !editMode && settings.enabled !== false && Boolean(destination) && !reducedMotion;
    let timer = 0;
    let animationFrame = 0;
    let active = true;
    let intersecting = true;
    let visible = document.visibilityState !== "hidden";
    let pose = "";

    const setPose = (nextPose) => {
      if (pose === nextPose) return;
      pose = nextPose;
      image.src = frames[nextPose] || frames.idle || image.src;
      root.dataset.pose = nextPose;
    };

    const setPosition = (point, lift = 0, squash = 1, direction = 1, rotation = 0, opacity = 1) => {
      const rect = stage.getBoundingClientRect();
      const offsetX = ((point.x - base.x) * rect.width) / scale;
      const offsetY = (((point.y - base.y) * rect.height) - lift) / scale;
      root.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
      root.style.setProperty("--frog-facing", String(direction));
      root.style.setProperty("--frog-squash", String(squash));
      root.style.setProperty("--frog-rotation", `${rotation}deg`);
      root.style.setProperty("--frog-opacity", String(opacity));
    };

    const setSplash = (shown) => {
      root.dataset.splash = shown ? "active" : "idle";
    };

    const clearWork = () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(animationFrame);
      timer = 0;
      animationFrame = 0;
    };

    const canAnimate = () => active && visible && intersecting && animationAllowed;
    const direction = destination?.x < origin.x ? -1 : 1;
    let scheduleDive;

    const resetAtRock = (scheduleNext = false) => {
      setSplash(false);
      setPose("idle");
      setPosition(origin, 0, 1, direction, 0, 1);
      if (scheduleNext && canAnimate()) timer = window.setTimeout(scheduleDive, randomWait(diveInterval));
    };

    const animateDive = () => {
      if (!canAnimate() || !destination) return;
      const duration = 620 / speed;
      const startedAt = performance.now();

      const step = (now) => {
        if (!canAnimate()) return;
        const progress = clamp((now - startedAt) / duration, 0, 1);
        const eased = 1 - ((1 - progress) ** 2.35);
        const point = {
          x: origin.x + (destination.x - origin.x) * eased,
          y: origin.y + (destination.y - origin.y) * eased,
        };
        const lift = Math.sin(Math.PI * progress) * diveHeight * stage.getBoundingClientRect().height;
        const rotation = direction * (progress < 0.48
          ? -8 * Math.sin((progress / 0.48) * Math.PI)
          : 48 * ((progress - 0.48) / 0.52));
        const opacity = progress > 0.9 ? 1 - ((progress - 0.9) / 0.1) : 1;

        if (progress < 0.16) setPose("takeoff");
        else setPose("air");
        setPosition(point, lift, 1, direction, rotation, opacity);

        if (progress < 1) {
          animationFrame = window.requestAnimationFrame(step);
          return;
        }

        setPosition(destination, 0, 0.86, direction, direction * 48, 0);
        setSplash(true);
        timer = window.setTimeout(() => {
          setSplash(false);
          setPosition(origin, 0, 1, direction, 0, 0);
          setPose("idle");
          timer = window.setTimeout(() => {
            setPosition(origin, 0, 1, direction, 0, 1);
            if (canAnimate()) timer = window.setTimeout(scheduleDive, randomWait(diveInterval));
          }, 260 / speed);
        }, 1450 / speed);
      };

      animationFrame = window.requestAnimationFrame(step);
    };

    scheduleDive = () => {
      if (!canAnimate()) return;
      setPose("blink");
      timer = window.setTimeout(() => {
        setPose("crouch");
        setPosition(origin, 0, 0.88, direction, 0, 1);
        timer = window.setTimeout(animateDive, 155 / speed);
      }, 135 / speed);
    };

    const syncActivity = () => {
      visible = document.visibilityState !== "hidden";
      clearWork();
      resetAtRock(canAnimate());
    };

    const observer = typeof IntersectionObserver === "function"
      ? new IntersectionObserver(([entry]) => {
        intersecting = Boolean(entry?.isIntersecting);
        syncActivity();
      }, { threshold: 0.01 })
      : null;
    observer?.observe(root);
    document.addEventListener("visibilitychange", syncActivity);

    resetAtRock(animationAllowed);

    return () => {
      active = false;
      clearWork();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncActivity);
    };
  }, [editMode, frameSignature, placementSignature, settingsSignature]);

  return (
    <span className="shooterMapAmbientCreature shooterMapAmbientCreature--diving" data-creature="diving-frog" data-splash="idle" ref={rootRef}>
      <img alt="" className="shooterMapAmbientCreatureFrame" decoding="async" draggable="false" ref={imageRef} src={frames.idle} />
      <span aria-hidden="true" className="shooterMapWaterSplash shooterMapAmbientCreatureSplash">
        <i className="shooterMapWaterDroplet shooterMapWaterDroplet--one" />
        <i className="shooterMapWaterDroplet shooterMapWaterDroplet--two" />
        <i className="shooterMapWaterDroplet shooterMapWaterDroplet--three" />
        <b className="shooterMapWaterFoam" />
        <em className="shooterMapWaterRipple shooterMapWaterRipple--one" />
        <em className="shooterMapWaterRipple shooterMapWaterRipple--two" />
      </span>
    </span>
  );
}

function AmbientCreature(props) {
  if (props.creature?.type === "sleeping-frog") return <SleepingFrogCreature {...props} />;
  if (props.creature?.type === "diving-frog") return <DivingFrogCreature {...props} />;
  return <HoppingFrogCreature {...props} />;
}

export default memo(AmbientCreature);
