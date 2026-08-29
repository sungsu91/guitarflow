import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";

import {
  DEFAULT_THREE_D_LAB_SETTINGS,
  createThreeDLabViewProjection,
  normalizeThreeDLabSettings,
} from "./threeDLabProjection.js";
import "./three-d-lab.css";

const CONTROL_GROUPS = Object.freeze([
  Object.freeze({
    id: "camera",
    label: "PERSPECTIVE CAMERA",
    controls: Object.freeze([
      Object.freeze({ key: "cameraFov", label: "Camera FOV", min: 36, max: 82, step: 1 }),
      Object.freeze({ key: "cameraHeight", label: "Camera Height", min: 1.8, max: 5.4, step: 0.1 }),
      Object.freeze({ key: "cameraPitch", label: "Camera Pitch", min: -15, max: 6, step: 0.5 }),
      Object.freeze({ key: "horizonPosition", label: "Horizon Position", min: 0.2, max: 0.43, step: 0.01 }),
    ]),
  }),
  Object.freeze({
    id: "world",
    label: "GROUND / RAIL",
    controls: Object.freeze([
      Object.freeze({ key: "groundWidth", label: "Ground Width", min: 18, max: 52, step: 1 }),
      Object.freeze({ key: "railWidth", label: "Rail Width", min: 4.2, max: 13, step: 0.1 }),
      Object.freeze({ key: "railLength", label: "Rail Length", min: 48, max: 128, step: 1 }),
    ]),
  }),
  Object.freeze({
    id: "enemy",
    label: "BILLBOARD ENEMY",
    controls: Object.freeze([
      Object.freeze({ key: "enemySpawnZ", label: "Enemy Spawn Z", min: 42, max: 112, step: 1 }),
      Object.freeze({ key: "enemyHitZ", label: "Enemy Hit Z", min: 3.8, max: 11, step: 0.1 }),
      Object.freeze({ key: "enemyApproachSpeed", label: "Enemy Approach Speed", min: 0.62, max: 1.7, step: 0.01 }),
      Object.freeze({ key: "enemyFarVisibility", label: "Enemy Far Visibility", min: 0.08, max: 0.42, step: 0.01 }),
      Object.freeze({ key: "enemyNearSize", label: "Enemy Near Size", min: 0.72, max: 1.65, step: 0.01 }),
    ]),
  }),
  Object.freeze({
    id: "guitar",
    label: "GUITAR SLASH",
    controls: Object.freeze([
      Object.freeze({ key: "guitarIdleX", label: "Guitar Idle X", min: 0.34, max: 0.66, step: 0.01 }),
      Object.freeze({ key: "guitarIdleY", label: "Guitar Idle Y", min: 0.76, max: 0.94, step: 0.01 }),
      Object.freeze({ key: "guitarIdleScale", label: "Guitar Idle Scale", min: 0.68, max: 1.42, step: 0.01 }),
      Object.freeze({ key: "guitarDashDuration", label: "Guitar Dash Speed", min: 40, max: 80, step: 1, suffix: "ms" }),
      Object.freeze({ key: "guitarSlashDuration", label: "Guitar Slash Duration", min: 80, max: 120, step: 1, suffix: "ms" }),
      Object.freeze({ key: "guitarReturnDuration", label: "Guitar Return Duration", min: 100, max: 160, step: 1, suffix: "ms" }),
      Object.freeze({ key: "slashRotation", label: "Slash Rotation", min: -105, max: -34, step: 1, suffix: "°" }),
      Object.freeze({ key: "slashArcSize", label: "Slash Arc Size", min: 12, max: 64, step: 1 }),
    ]),
  }),
  Object.freeze({
    id: "effects",
    label: "IMPACT EFFECTS",
    controls: Object.freeze([
      Object.freeze({ key: "afterimageStrength", label: "Afterimage Strength", min: 0, max: 1, step: 0.01 }),
      Object.freeze({ key: "hitParticleStrength", label: "Hit Particle Strength", min: 0, max: 1, step: 0.01 }),
      Object.freeze({ key: "cameraShakeStrength", label: "Camera Shake Strength", min: 0, max: 1, step: 0.01 }),
    ]),
  }),
]);

const VERTEX_SHADER = `
  attribute vec3 aPosition;
  attribute vec4 aColor;
  uniform mat4 uViewProjection;
  varying vec4 vColor;
  void main() {
    gl_Position = uViewProjection * vec4(aPosition, 1.0);
    vColor = aColor;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec4 vColor;
  void main() {
    gl_FragColor = vColor;
  }
`;

function pushVertex(list, x, y, z, color) {
  list.push(x, y, z, color[0], color[1], color[2], color[3] ?? 1);
}

function pushTriangle(list, a, b, c, color) {
  pushVertex(list, ...a, color);
  pushVertex(list, ...b, color);
  pushVertex(list, ...c, color);
}

function pushQuad(list, a, b, c, d, color) {
  pushTriangle(list, a, b, c, color);
  pushTriangle(list, a, c, d, color);
}

function pushLine(list, a, b, color) {
  pushVertex(list, ...a, color);
  pushVertex(list, ...b, color);
}

function pushBillboardQuad(list, x, y, z, width, height, color) {
  pushQuad(
    list,
    [x - width * 0.5, y, z],
    [x + width * 0.5, y, z],
    [x + width * 0.5, y + height, z],
    [x - width * 0.5, y + height, z],
    color,
  );
}

function buildSceneGeometry(settings) {
  const safe = normalizeThreeDLabSettings(settings);
  const triangles = [];
  const lines = [];
  const nearZ = 3.4;
  const farZ = -safe.railLength;
  const halfGround = safe.groundWidth * 0.5;
  const halfRail = safe.railWidth * 0.5;

  pushQuad(
    triangles,
    [-halfGround, 0, nearZ],
    [halfGround, 0, nearZ],
    [halfGround, 0, farZ],
    [-halfGround, 0, farZ],
    [0.24, 0.61, 0.23, 1],
  );

  const railSegments = 20;
  for (let index = 0; index < railSegments; index += 1) {
    const startRatio = index / railSegments;
    const endRatio = (index + 1) / railSegments;
    const startZ = nearZ + (farZ - nearZ) * startRatio;
    const endZ = nearZ + (farZ - nearZ) * endRatio;
    const color = index % 2 === 0
      ? [0.24, 0.35, 0.25, 1]
      : [0.29, 0.41, 0.29, 1];
    pushQuad(
      triangles,
      [-halfRail, 0.025, startZ],
      [halfRail, 0.025, startZ],
      [halfRail, 0.025, endZ],
      [-halfRail, 0.025, endZ],
      color,
    );
    pushLine(lines, [-halfRail, 0.04, endZ], [halfRail, 0.04, endZ], [0.8, 0.9, 0.65, 0.34]);
  }
  pushLine(lines, [-halfRail, 0.05, nearZ], [-halfRail, 0.05, farZ], [0.93, 0.92, 0.7, 0.72]);
  pushLine(lines, [halfRail, 0.05, nearZ], [halfRail, 0.05, farZ], [0.93, 0.92, 0.7, 0.72]);
  pushLine(lines, [0, 0.045, nearZ], [0, 0.045, farZ], [0.82, 0.9, 0.64, 0.25]);

  const mountainZ = farZ + 3;
  [
    [-17, 4.6, 9.5, [0.25, 0.43, 0.31, 1]],
    [-7, 6.2, 12, [0.3, 0.49, 0.34, 1]],
    [5, 5.2, 11, [0.27, 0.46, 0.31, 1]],
    [15, 7.1, 13, [0.23, 0.4, 0.29, 1]],
  ].forEach(([x, height, width, color]) => {
    pushTriangle(
      triangles,
      [x - width * 0.5, 0.02, mountainZ],
      [x, height, mountainZ],
      [x + width * 0.5, 0.02, mountainZ],
      color,
    );
  });

  const treeRows = [0.22, 0.38, 0.58, 0.77];
  treeRows.forEach((ratio, rowIndex) => {
    const z = nearZ + (farZ - nearZ) * ratio;
    const side = rowIndex % 2 === 0 ? -1 : 1;
    [-1, 1].forEach((direction, index) => {
      const x = direction * (halfRail + 2.6 + rowIndex * 0.9 + index * 0.45) + side * 0.35;
      const size = 1.18 - ratio * 0.28;
      pushBillboardQuad(triangles, x, 0, z, 0.38 * size, 1.28 * size, [0.34, 0.2, 0.08, 1]);
      pushTriangle(
        triangles,
        [x - 0.86 * size, 0.76 * size, z - 0.02],
        [x, 2.72 * size, z - 0.02],
        [x + 0.86 * size, 0.76 * size, z - 0.02],
        [0.12, 0.45 + index * 0.04, 0.17, 1],
      );
    });
  });

  const flowerColors = [
    [1, 0.78, 0.22, 1],
    [1, 0.45, 0.58, 1],
    [0.92, 0.91, 0.96, 1],
  ];
  for (let index = 0; index < 18; index += 1) {
    const ratio = 0.08 + (index % 9) * 0.075;
    const z = nearZ + (farZ - nearZ) * ratio;
    const direction = index % 2 === 0 ? -1 : 1;
    const x = direction * (halfRail + 1.2 + (index % 4) * 0.62);
    const size = 0.17 + (1 - ratio) * 0.08;
    pushBillboardQuad(triangles, x, 0.08, z, size, size, flowerColors[index % flowerColors.length]);
  }

  [
    [-7.5, 7.4, -safe.railLength * 0.42, 5.2, 0.72],
    [7.2, 8.5, -safe.railLength * 0.62, 6.1, 0.62],
    [1.8, 10.2, -safe.railLength * 0.82, 4.2, 0.5],
  ].forEach(([x, y, z, width, alpha]) => {
    pushBillboardQuad(triangles, x, y, z, width, 0.86, [1, 1, 1, alpha]);
    pushBillboardQuad(triangles, x - width * 0.16, y + 0.36, z - 0.03, width * 0.45, 0.72, [1, 1, 1, alpha * 0.9]);
    pushBillboardQuad(triangles, x + width * 0.18, y + 0.24, z - 0.04, width * 0.52, 0.82, [1, 1, 1, alpha * 0.92]);
  });

  return {
    lines: new Float32Array(lines),
    triangles: new Float32Array(triangles),
  };
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "3D LAB shader compile failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "3D LAB program link failed";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function ThreeDLabControlPanel({ defaults, onSettingsChange, settings }) {
  const [open, setOpen] = useState(false);

  return (
    <aside className={`threeDLabDevPanel ${open ? "is-open" : ""}`}>
      <button
        aria-expanded={open}
        className="threeDLabDevPanelToggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <SlidersHorizontal aria-hidden="true" size={14} />
        <span>3D LAB 설정</span>
        <ChevronDown aria-hidden="true" size={13} />
      </button>
      {open ? (
        <div className="threeDLabDevPanelBody">
          <div className="threeDLabDevPanelHeading">
            <span><i />DEV ONLY</span>
            <strong>Perspective Scene Tuning</strong>
          </div>
          {CONTROL_GROUPS.map((group) => (
            <section className="threeDLabControlGroup" key={group.id}>
              <h4>{group.label}</h4>
              {group.controls.map((control) => (
                <label className="threeDLabDevControl" key={control.key}>
                  <span>
                    {control.label}
                    <output>
                      {Number(settings[control.key]).toFixed(control.step >= 1 ? 0 : 2)}{control.suffix ?? ""}
                    </output>
                  </span>
                  <input
                    aria-label={control.label}
                    max={control.max}
                    min={control.min}
                    onChange={(event) => onSettingsChange({
                      ...settings,
                      [control.key]: Number(event.target.value),
                    })}
                    step={control.step}
                    type="range"
                    value={settings[control.key]}
                  />
                </label>
              ))}
            </section>
          ))}
          <button className="threeDLabResetButton" onClick={() => onSettingsChange(defaults)} type="button">
            <RotateCcw aria-hidden="true" size={13} />
            RESET 3D LAB
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function ThreeDLabRenderer({
  active = true,
  developer = false,
  onSettingsChange,
  settings = DEFAULT_THREE_D_LAB_SETTINGS,
  skin,
  stage = "underlay",
}) {
  const canvasRef = useRef(null);
  const [webGlFailed, setWebGlFailed] = useState(false);
  const safeSettings = useMemo(() => normalizeThreeDLabSettings(settings), [settings]);
  const geometry = useMemo(() => buildSceneGeometry(safeSettings), [safeSettings]);
  const defaults = useMemo(
    () => normalizeThreeDLabSettings(skin?.threeD ?? DEFAULT_THREE_D_LAB_SETTINGS),
    [skin?.threeD],
  );

  useEffect(() => {
    if (stage !== "underlay") return undefined;
    const canvas = canvasRef.current;
    const gl = canvas?.getContext?.("webgl", {
      alpha: true,
      antialias: true,
      depth: true,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
    });
    if (!canvas || !gl) {
      setWebGlFailed(true);
      return undefined;
    }

    let program;
    try {
      program = createProgram(gl);
    } catch (error) {
      console.error(error);
      setWebGlFailed(true);
      return undefined;
    }
    setWebGlFailed(false);
    const triangleBuffer = gl.createBuffer();
    const lineBuffer = gl.createBuffer();
    const positionLocation = gl.getAttribLocation(program, "aPosition");
    const colorLocation = gl.getAttribLocation(program, "aColor");
    const matrixLocation = gl.getUniformLocation(program, "uViewProjection");
    let frameId = 0;
    let stopped = false;

    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.triangles, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.lines, gl.STATIC_DRAW);

    const syncSize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      return { height, width };
    };

    const bindAttributes = (buffer) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(colorLocation);
      gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 28, 12);
    };

    const render = () => {
      if (stopped) return;
      const viewport = syncSize();
      gl.viewport(0, 0, viewport.width, viewport.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.uniformMatrix4fv(matrixLocation, false, createThreeDLabViewProjection(safeSettings, viewport));

      bindAttributes(triangleBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, geometry.triangles.length / 7);
      bindAttributes(lineBuffer);
      gl.lineWidth(1);
      gl.drawArrays(gl.LINES, 0, geometry.lines.length / 7);

      if (active) frameId = window.requestAnimationFrame(render);
    };

    render();
    const handleResize = () => {
      if (!active) render();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      gl.deleteBuffer(triangleBuffer);
      gl.deleteBuffer(lineBuffer);
      gl.deleteProgram(program);
    };
  }, [active, geometry, safeSettings, stage]);

  if (stage !== "underlay") return null;

  return (
    <div aria-hidden="true" className="threeDLabScene">
      <div className="threeDLabSkyGlow" />
      <canvas className="threeDLabCanvas" ref={canvasRef} />
      <div className="threeDLabHorizonMark"><span>HORIZON</span></div>
      <div className="threeDLabRailBadge"><i />PERSPECTIVE CAMERA</div>
      {webGlFailed ? <div className="threeDLabFallback">WebGL을 사용할 수 없어 3D LAB 장면을 표시할 수 없습니다.</div> : null}
      {developer && typeof onSettingsChange === "function" ? (
        <ThreeDLabControlPanel
          defaults={defaults}
          onSettingsChange={(next) => onSettingsChange(normalizeThreeDLabSettings(next))}
          settings={safeSettings}
        />
      ) : null}
    </div>
  );
}

export default memo(ThreeDLabRenderer);
