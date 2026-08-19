import { useMemo } from "react";

import { DEFAULT_PERSPECTIVE_CORNERS } from "../freeTransform.js";
import { FROG_MOVEMENT_MODES, MAP_EDIT_ANIMATION_TYPES } from "./editorState.js";

const SAVE_STATUS_LABELS = {
  dirty: "적용되지 않은 변경사항이 있습니다",
  error: "저장에 실패했습니다. 변경사항은 유지됩니다",
  idle: "편집 시작 상태",
  saved: "맵 배치를 적용했습니다",
  saving: "맵 배치를 적용하는 중…",
};

const AMBIENT_CREATURE_COLOR_PRESETS = Object.freeze([
  Object.freeze({ id: "jade", label: "비취", bodyColor: "#56b870", bubbleColor: "#a9edf0", bodySaturation: 1.05, bodyBrightness: 0.97 }),
  Object.freeze({ id: "deep-jade", label: "딥 제이드", bodyColor: "#2f7d66", bubbleColor: "#9fe7d8", bodySaturation: 0.95, bodyBrightness: 0.88 }),
  Object.freeze({ id: "sapphire", label: "사파이어", bodyColor: "#5278c9", bubbleColor: "#b9e8ff", bodySaturation: 0.92, bodyBrightness: 0.94 }),
  Object.freeze({ id: "amethyst", label: "자수정", bodyColor: "#8a68b8", bubbleColor: "#e1ccff", bodySaturation: 0.82, bodyBrightness: 0.96 }),
  Object.freeze({ id: "rose-bronze", label: "로즈 브론즈", bodyColor: "#b86f70", bubbleColor: "#ffd1dc", bodySaturation: 0.78, bodyBrightness: 0.95 }),
  Object.freeze({ id: "champagne", label: "샴페인 골드", bodyColor: "#ad9a56", bubbleColor: "#fff0bd", bodySaturation: 0.72, bodyBrightness: 1.02 }),
]);

const SLEEPING_FROG_PREVIEW_MODES = Object.freeze([
  Object.freeze({ id: "idle", label: "앉아 졸기" }),
  Object.freeze({ id: "open-mouth", label: "입 벌리고 자기" }),
  Object.freeze({ id: "flat", label: "철푸덕 자기" }),
  Object.freeze({ id: "cycle", label: "전체 동작" }),
]);

const BABY_DRAGON_PREVIEW_MODES = Object.freeze([
  Object.freeze({ id: "idle", label: "편하게 쉬기" }),
  Object.freeze({ id: "sleep", label: "엎드려 자기" }),
  Object.freeze({ id: "breath", label: "화염 브레스" }),
  Object.freeze({ id: "cycle", label: "전체 동작" }),
]);

function getReferenceViewport(editor) {
  return {
    height: editor.skin.referenceViewport?.deviceHeight || editor.skin.referenceViewport?.height || 844,
    width: editor.skin.referenceViewport?.deviceWidth || editor.skin.referenceViewport?.width || 390,
  };
}

function AssetPreview({ asset }) {
  if (asset?.eventActor?.readySrc) {
    return <img alt="" decoding="async" draggable="false" src={asset.eventActor.readySrc} />;
  }

  const sheet = asset?.spriteSheet;
  if (!sheet) {
    return asset?.src ? <img alt="" decoding="async" draggable="false" src={asset.src} /> : null;
  }

  const columns = Math.max(1, Number(sheet.columns) || 1);
  const rows = Math.max(1, Number(sheet.rows) || 1);
  const frameCount = Math.max(1, Number(sheet.frameCount) || columns * rows);
  const frame = Math.abs(Number(sheet.previewFrame) || 0) % frameCount;
  const column = frame % columns;
  const row = Math.floor(frame / columns) % rows;
  const backgroundX = columns === 1 ? 0 : (column / (columns - 1)) * 100;
  const backgroundY = rows === 1 ? 0 : (row / (rows - 1)) * 100;

  return (
    <span
      aria-hidden="true"
      className="mapEditSpriteSheetThumbnail"
      style={{
        backgroundImage: `url(${asset.src})`,
        backgroundPosition: `${backgroundX}% ${backgroundY}%`,
        backgroundSize: `${columns * 100}% ${rows * 100}%`,
      }}
    />
  );
}

function SelectedObjectSummary({ editor }) {
  const selected = editor.selectedPlacement;
  const asset = editor.selectedAsset;

  if (!selected || !asset) {
    return (
      <div className="mapEditSelectedCard mapEditSelectedCard--empty">
        <span className="mapEditSelectedPlaceholder" aria-hidden="true">◇</span>
        <span>
          <small>SELECTED OBJECT</small>
          <strong>조정할 오브젝트를 선택하세요</strong>
          <em>Preview 또는 아래 배치 목록에서 선택</em>
        </span>
      </div>
    );
  }

  const viewport = getReferenceViewport(editor);
  return (
    <div className="mapEditSelectedCard">
      <span className="mapEditSelectedPreview" aria-hidden="true">
        <AssetPreview asset={asset} />
      </span>
      <span>
        <small>SELECTED OBJECT</small>
        <strong>{asset.label}</strong>
        <em>X {Math.round(selected.x * viewport.width)}px · Y {Math.round(selected.y * viewport.height)}px · 크기 {Math.round(selected.scale * 100)}%</em>
      </span>
      <i>조정 중</i>
    </div>
  );
}

function EditorSection({ children, title, value }) {
  return (
    <section className="mapEditControlSection">
      <header>
        <strong>{title}</strong>
        {value ? <small>{value}</small> : null}
      </header>
      {children}
    </section>
  );
}

function EffectTuningControls({ effectEditor }) {
  if (!effectEditor) return null;

  const activeEffect = effectEditor.activeEffect;
  const activeTuning = effectEditor.activeTuning;
  const isEnabled = Boolean(activeEffect && activeEffect.id !== "none");
  const scalePercent = Math.round(activeTuning.scale * 100);
  const opacityPercent = Math.round(activeTuning.opacity * 100);
  const updateNumber = (key, value, divisor = 1) => {
    const number = Number(value);
    if (Number.isFinite(number)) effectEditor.updateActiveTuning({ [key]: number / divisor });
  };

  return (
    <EditorSection title="기타 이펙트 보정" value="FLOOR · AURA">
      <div aria-label="보정할 기타 이펙트 종류" className="mapEditEffectSlotTabs">
        {["floor", "aura"].map((slot) => (
          <button
            aria-pressed={effectEditor.activeSlot === slot}
            className={effectEditor.activeSlot === slot ? "is-selected" : ""}
            key={slot}
            onClick={() => effectEditor.selectSlot(slot)}
            type="button"
          >
            <b>{slot === "floor" ? "FLOOR" : "AURA"}</b>
            <small>{slot === "floor" ? "기타 받침·바닥" : "기타 주변 효과"}</small>
            <em>{effectEditor.activeSlot === slot ? "✓ 선택됨" : ""}</em>
          </button>
        ))}
      </div>

      <div aria-label={`${effectEditor.activeSlot === "floor" ? "FLOOR" : "AURA"} 스킨 선택`} className="mapEditEffectLibrary">
        {effectEditor.activeOptions.map((effect) => {
          const isSelected = activeEffect?.id === effect.id;
          return (
            <button
              aria-label={`${effect.label} ${isSelected ? "선택됨" : "선택"}`}
              aria-pressed={isSelected}
              className={isSelected ? "is-selected" : ""}
              key={effect.id}
              onClick={() => effectEditor.selectEffect(effectEditor.activeSlot, effect.id)}
              type="button"
            >
              <span aria-hidden="true">
                {effect.asset ? <img alt="" decoding="async" draggable="false" src={effect.asset} /> : <i>—</i>}
              </span>
              <b>{effect.label}</b>
              <em>{isSelected ? "✓" : ""}</em>
            </button>
          );
        })}
      </div>

      <div className={`mapEditEffectCurrent ${isEnabled ? "" : "is-disabled"}`}>
        <span aria-hidden="true">
          {activeEffect?.asset ? <img alt="" decoding="async" draggable="false" src={activeEffect.asset} /> : <i>—</i>}
        </span>
        <span><small>선택된 이펙트</small><strong>{activeEffect?.label ?? "없음"}</strong></span>
        <em>{isEnabled ? "실시간 보정" : "사용 안 함"}</em>
      </div>

      {isEnabled ? (
        <>
          <div className="mapEditPrecisionLayout mapEditPrecisionLayout--effect">
            <div className="mapEditNudgePad" aria-label="이펙트 1픽셀 위치 조정">
              <span />
              <button aria-label="이펙트 위로 1픽셀" onClick={() => effectEditor.nudgeActive(0, -1)} type="button">↑</button>
              <span />
              <button aria-label="이펙트 왼쪽으로 1픽셀" onClick={() => effectEditor.nudgeActive(-1, 0)} type="button">←</button>
              <i>1px</i>
              <button aria-label="이펙트 오른쪽으로 1픽셀" onClick={() => effectEditor.nudgeActive(1, 0)} type="button">→</button>
              <span />
              <button aria-label="이펙트 아래로 1픽셀" onClick={() => effectEditor.nudgeActive(0, 1)} type="button">↓</button>
              <span />
            </div>
            <div className="mapEditPixelFields">
              <label className="mapEditField">
                <span>X 보정 (px)</span>
                <input aria-label="이펙트 X 보정값" max="160" min="-160" onChange={(event) => updateNumber("offsetX", event.target.value)} step="1" type="number" value={Math.round(activeTuning.offsetX)} />
              </label>
              <label className="mapEditField">
                <span>Y 보정 (px)</span>
                <input aria-label="이펙트 Y 보정값" max="220" min="-180" onChange={(event) => updateNumber("offsetY", event.target.value)} step="1" type="number" value={Math.round(activeTuning.offsetY)} />
              </label>
            </div>
          </div>

          <div className="mapEditScaleEditor">
            <span><b>크기</b><strong>{scalePercent}%</strong></span>
            <div className="mapEditScaleQuickButtons">
              <button aria-label="이펙트 크기 5퍼센트 줄이기" onClick={() => effectEditor.resizeActive(-0.05)} type="button">−5</button>
              <button aria-label="이펙트 크기 1퍼센트 줄이기" onClick={() => effectEditor.resizeActive(-0.01)} type="button">−1</button>
              <input aria-label="이펙트 크기" max="250" min="25" onChange={(event) => updateNumber("scale", event.target.value, 100)} step="1" type="range" value={scalePercent} />
              <button aria-label="이펙트 크기 1퍼센트 키우기" onClick={() => effectEditor.resizeActive(0.01)} type="button">+1</button>
              <button aria-label="이펙트 크기 5퍼센트 키우기" onClick={() => effectEditor.resizeActive(0.05)} type="button">+5</button>
            </div>
          </div>

          <label className="mapEditRangeField mapEditEffectOpacity">
            <span><b>투명도</b><strong>{opacityPercent}%</strong></span>
            <input aria-label="이펙트 투명도" max="100" min="10" onChange={(event) => updateNumber("opacity", event.target.value, 100)} step="1" type="range" value={opacityPercent} />
          </label>
          <button className="mapEditRestoreButton" onClick={effectEditor.resetActive} type="button">이 이펙트 보정값만 기본으로</button>
        </>
      ) : (
        <p className="mapEditEffectEmpty">스킨 설정에서 이 슬롯의 이펙트를 고르면 위치·크기·투명도를 조절할 수 있습니다.</p>
      )}
    </EditorSection>
  );
}

function InstalledObjectSelector({ editor }) {
  const instanceOptions = useMemo(() => editor.placements.map((placement, index) => {
    const asset = editor.assetCatalog.find((candidate) => candidate.id === placement.assetId);
    return {
      asset,
      id: placement.instanceId,
      index,
      label: asset?.label ?? placement.assetId,
      scale: placement.scale,
    };
  }), [editor.assetCatalog, editor.placements]);

  return (
    <details className="mapEditAdvancedSection mapEditAdvancedSection--installed">
      <summary>
        <span>배치된 오브젝트</span>
        <small>{editor.placements.length} OBJECTS · 눌러서 열기</small>
      </summary>
      <div className="mapEditAdvancedSectionBody">
        <p className="mapEditPlacedHelp">이미 설치된 오브젝트를 고른 뒤 위치와 크기만 다듬으세요.</p>
        <label className="mapEditField mapEditField--wide">
          <span>빠른 선택</span>
          <select
            aria-label="편집할 배치 오브젝트"
            onChange={(event) => editor.selectInstance(event.target.value)}
            value={editor.selectedInstanceId}
          >
            <option value="">오브젝트를 선택하세요</option>
            {instanceOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.index + 1}. {option.label}</option>
            ))}
          </select>
        </label>
        <div aria-label="배치된 오브젝트 목록" className="mapEditPlacedObjectGrid">
          {instanceOptions.map((option) => (
            <button
              aria-label={`${option.label} 선택`}
              aria-pressed={editor.selectedInstanceId === option.id}
              className={editor.selectedInstanceId === option.id ? "is-selected" : ""}
              key={option.id}
              onClick={() => editor.selectInstance(option.id)}
              type="button"
            >
              <span aria-hidden="true">
                <AssetPreview asset={option.asset} />
              </span>
              <b>{option.label}</b>
              <small>#{String(option.index + 1).padStart(2, "0")} · {Math.round(option.scale * 100)}%</small>
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}

function PrecisionControls({ editor }) {
  const selected = editor.selectedPlacement;
  if (!selected) return null;

  const viewport = getReferenceViewport(editor);
  const xPixels = Math.round(selected.x * viewport.width);
  const yPixels = Math.round(selected.y * viewport.height);
  const scalePercent = Math.round(selected.scale * 100);
  const updatePixel = (key, value, dimension) => {
    const number = Number(value);
    if (Number.isFinite(number)) editor.updateSelected({ [key]: number / dimension });
  };
  const updateScalePercent = (value) => {
    const number = Number(value);
    if (Number.isFinite(number)) editor.updateSelected({ scale: number / 100 });
  };

  return (
    <EditorSection title="위치·크기 미세 조정" value="QUICK TUNE">
      <div className="mapEditPrecisionLayout">
        <div className="mapEditNudgePad" aria-label="1픽셀 위치 조정">
          <span />
          <button aria-label="위로 1픽셀" onClick={() => editor.nudgeSelected(0, -1)} title="위로 1px" type="button">↑</button>
          <span />
          <button aria-label="왼쪽으로 1픽셀" onClick={() => editor.nudgeSelected(-1, 0)} title="왼쪽으로 1px" type="button">←</button>
          <i>1px</i>
          <button aria-label="오른쪽으로 1픽셀" onClick={() => editor.nudgeSelected(1, 0)} title="오른쪽으로 1px" type="button">→</button>
          <span />
          <button aria-label="아래로 1픽셀" onClick={() => editor.nudgeSelected(0, 1)} title="아래로 1px" type="button">↓</button>
          <span />
        </div>
        <div className="mapEditPixelFields">
          <label className="mapEditField">
            <span>X 위치 (px)</span>
            <input aria-label="오브젝트 X 픽셀 좌표" onChange={(event) => updatePixel("x", event.target.value, viewport.width)} step="1" type="number" value={xPixels} />
          </label>
          <label className="mapEditField">
            <span>Y 위치 (px)</span>
            <input aria-label="오브젝트 Y 픽셀 좌표" onChange={(event) => updatePixel("y", event.target.value, viewport.height)} step="1" type="number" value={yPixels} />
          </label>
        </div>
      </div>
      <p className="mapEditKeyboardHint"><kbd>방향키</kbd> 1px 이동 · <kbd>Shift</kbd> + <kbd>방향키</kbd> 5px 이동</p>

      <div className="mapEditScaleEditor">
        <span><b>크기</b><strong>{scalePercent}%</strong></span>
        <div className="mapEditScaleQuickButtons">
          <button aria-label="크기 5퍼센트 줄이기" onClick={() => editor.resizeSelected(-0.05)} type="button">−5</button>
          <button aria-label="크기 1퍼센트 줄이기" onClick={() => editor.resizeSelected(-0.01)} type="button">−1</button>
          <input aria-label="오브젝트 크기" max="300" min="10" onChange={(event) => updateScalePercent(event.target.value)} step="1" type="range" value={scalePercent} />
          <button aria-label="크기 1퍼센트 키우기" onClick={() => editor.resizeSelected(0.01)} type="button">+1</button>
          <button aria-label="크기 5퍼센트 키우기" onClick={() => editor.resizeSelected(0.05)} type="button">+5</button>
        </div>
      </div>

      <button className="mapEditRestoreButton" onClick={editor.restoreSelected} type="button">선택 오브젝트를 편집 전 상태로</button>
    </EditorSection>
  );
}

function SleepingFrogControls({ creature, editor }) {
  const viewport = getReferenceViewport(editor);
  const anchor = creature.anchors[0];
  const updateNumber = (key, value) => {
    const number = Number(value);
    if (Number.isFinite(number)) editor.updateSelectedCreature({ [key]: number });
  };
  const updateAnchorPixel = (key, value) => {
    if (!anchor) return;
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    editor.updateSelectedCreatureAnchor(anchor.id, {
      [key]: number / (key === "x" ? viewport.width : viewport.height),
    });
  };
  const nudgeAnchor = (deltaX, deltaY) => {
    if (!anchor) return;
    editor.updateSelectedCreatureAnchor(anchor.id, {
      x: anchor.x + deltaX / viewport.width,
      y: anchor.y + deltaY / viewport.height,
    });
  };
  const applyColorPreset = (preset) => {
    editor.updateSelectedCreature({
      bodyColor: preset.bodyColor,
      bubbleColor: preset.bubbleColor,
      bodySaturation: preset.bodySaturation,
      bodyBrightness: preset.bodyBrightness,
    });
  };

  return (
    <EditorSection title="졸고 있는 개구리" value="AMBIENT CREATURE">
      <label className="mapEditCreatureToggle">
        <span><strong>졸음 애니메이션</strong><small>호흡·꾸벅임·철푸덕·기상을 자연스럽게 반복합니다</small></span>
        <input
          aria-label="졸고 있는 개구리 애니메이션"
          checked={creature.enabled}
          onChange={(event) => editor.updateSelectedCreature({ enabled: event.target.checked })}
          type="checkbox"
        />
      </label>

      <div className="mapEditCoordinateGrid">
        <label className="mapEditField">
          <span>평균 졸음 간격 (초)</span>
          <input aria-label="개구리 졸음 간격" max="30" min="3" onChange={(event) => updateNumber("sleepInterval", event.target.value)} step="0.1" type="number" value={creature.sleepInterval} />
        </label>
        <label className="mapEditField">
          <span>엎드림 유지 (초)</span>
          <input aria-label="개구리 엎드림 유지 시간" max="30" min="2" onChange={(event) => updateNumber("flatDuration", event.target.value)} step="0.1" type="number" value={creature.flatDuration} />
        </label>
      </div>
      <label className="mapEditRangeField">
        <span><b>철푸덕 확률</b><strong>{Math.round(creature.fallChance * 100)}%</strong></span>
        <input aria-label="개구리 철푸덕 확률" max="0.75" min="0" onChange={(event) => updateNumber("fallChance", event.target.value)} step="0.01" type="range" value={creature.fallChance} />
      </label>
      <label className="mapEditRangeField">
        <span><b>동작 속도</b><strong>{creature.animationSpeed.toFixed(2)}×</strong></span>
        <input aria-label="졸고 있는 개구리 동작 속도" max="2.5" min="0.35" onChange={(event) => updateNumber("animationSpeed", event.target.value)} step="0.05" type="range" value={creature.animationSpeed} />
      </label>
      <label className="mapEditRangeField">
        <span><b>입 벌리고 자기 유지</b><strong>{creature.openMouthDuration.toFixed(1)}초</strong></span>
        <input aria-label="개구리 입 벌리고 자기 유지 시간" max="8" min="0.3" onChange={(event) => updateNumber("openMouthDuration", event.target.value)} step="0.1" type="range" value={creature.openMouthDuration} />
      </label>

      <div className="mapEditCreaturePreview" aria-label="졸고 있는 개구리 동작 미리보기">
        <span><strong>동작·코방울 미리보기</strong><small>저장값은 바꾸지 않고 Preview에서만 재생합니다</small></span>
        <div>
          {SLEEPING_FROG_PREVIEW_MODES.map((mode) => (
            <button
              aria-pressed={editor.creaturePreviewMode === mode.id}
              className={editor.creaturePreviewMode === mode.id ? "active" : ""}
              key={mode.id}
              onClick={() => editor.previewSelectedCreature(mode.id)}
              type="button"
            >{mode.label}</button>
          ))}
          <button
            aria-label="개구리 동작 미리보기 끄기"
            className="mapEditCreaturePreviewStop"
            disabled={!editor.creaturePreviewMode}
            onClick={() => editor.previewSelectedCreature("")}
            type="button"
          >정지</button>
        </div>
      </div>

      <div className="mapEditColorGrid">
        <label className="mapEditColorField">
          <span><b>개구리 색상</b><small>원본 디테일을 유지하며 색조를 바꿉니다</small></span>
          <input aria-label="졸고 있는 개구리 몸 색상" onChange={(event) => editor.updateSelectedCreature({ bodyColor: event.target.value })} type="color" value={creature.bodyColor} />
        </label>
        <label className="mapEditColorField">
          <span><b>코방울 색상</b><small>방울 레이어에만 적용됩니다</small></span>
          <input aria-label="개구리 코방울 색상" onChange={(event) => editor.updateSelectedCreature({ bubbleColor: event.target.value })} type="color" value={creature.bubbleColor} />
        </label>
      </div>
      <div className="mapEditColorPresets" aria-label="개구리 고급 색상 빠른 선택">
        <span><strong>Curated Color</strong><small>톤·채도·밝기·코방울 조합을 한 번에 적용합니다</small></span>
        <div>
          {AMBIENT_CREATURE_COLOR_PRESETS.map((preset) => (
            <button
              aria-label={`${preset.label} 색상 적용`}
              className={creature.bodyColor === preset.bodyColor ? "active" : ""}
              key={preset.id}
              onClick={() => applyColorPreset(preset)}
              style={{ "--preset-body": preset.bodyColor, "--preset-bubble": preset.bubbleColor }}
              type="button"
            >
              <i aria-hidden="true" />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="mapEditRangeField">
        <span><b>몸 색상 강도</b><strong>{Math.round(creature.bodySaturation * 100)}%</strong></span>
        <input aria-label="졸고 있는 개구리 색상 강도" max="1.8" min="0.45" onChange={(event) => updateNumber("bodySaturation", event.target.value)} step="0.05" type="range" value={creature.bodySaturation} />
      </label>
      <label className="mapEditRangeField">
        <span><b>몸 밝기</b><strong>{Math.round(creature.bodyBrightness * 100)}%</strong></span>
        <input aria-label="졸고 있는 개구리 밝기" max="1.45" min="0.55" onChange={(event) => updateNumber("bodyBrightness", event.target.value)} step="0.05" type="range" value={creature.bodyBrightness} />
      </label>

      <div className="mapEditAnchorHeader">
        <span><strong>Sleeping Spot</strong><small>돌·연잎·돌다리·하단 선착장 위의 바닥 접점을 저장합니다</small></span>
      </div>
      {anchor ? (
        <div className="mapEditAnchorList">
          <div className="mapEditAnchorRow">
            <i>A</i>
            <label className="mapEditAnchorSurface">
              <span>착지</span>
              <select
                aria-label="졸고 있는 개구리 착지 오브젝트"
                onChange={(event) => editor.attachSelectedCreatureAnchor(anchor.id, event.target.value)}
                value={anchor.surfaceInstanceId ?? ""}
              >
                <option disabled value="">돌·연잎·돌다리·선착장 선택</option>
                {editor.landingSurfaces.map((surface) => (
                  <option key={surface.instanceId} value={surface.instanceId}>{surface.label}</option>
                ))}
              </select>
            </label>
            <label><span>X</span><input aria-label="졸고 있는 개구리 X 좌표" onChange={(event) => updateAnchorPixel("x", event.target.value)} step="1" type="number" value={Math.round(anchor.x * viewport.width)} /></label>
            <label><span>Y</span><input aria-label="졸고 있는 개구리 Y 좌표" onChange={(event) => updateAnchorPixel("y", event.target.value)} step="1" type="number" value={Math.round(anchor.y * viewport.height)} /></label>
            <span className="mapEditAnchorNudges" aria-label="졸고 있는 개구리 위치 미세 이동">
              <small>A 포인트 1px 이동</small>
              <button aria-label="졸고 있는 개구리 왼쪽으로 1픽셀" onClick={() => nudgeAnchor(-1, 0)} type="button">←</button>
              <button aria-label="졸고 있는 개구리 위로 1픽셀" onClick={() => nudgeAnchor(0, -1)} type="button">↑</button>
              <button aria-label="졸고 있는 개구리 아래로 1픽셀" onClick={() => nudgeAnchor(0, 1)} type="button">↓</button>
              <button aria-label="졸고 있는 개구리 오른쪽으로 1픽셀" onClick={() => nudgeAnchor(1, 0)} type="button">→</button>
            </span>
          </div>
        </div>
      ) : null}

      <label className="mapEditCreatureToggle">
        <span><strong>코방울</strong><small>개구리와 분리된 독립 레이어입니다</small></span>
        <input
          aria-label="개구리 코방울 표시"
          checked={creature.bubbleEnabled}
          onChange={(event) => editor.updateSelectedCreature({ bubbleEnabled: event.target.checked })}
          type="checkbox"
        />
      </label>
      <label className="mapEditRangeField">
        <span><b>코방울 기본 크기</b><strong>{creature.bubbleBaseScale.toFixed(2)}×</strong></span>
        <input aria-label="개구리 코방울 기본 크기" max="1.5" min="0.45" onChange={(event) => updateNumber("bubbleBaseScale", event.target.value)} step="0.05" type="range" value={creature.bubbleBaseScale} />
      </label>
      <label className="mapEditRangeField">
        <span><b>코방울 최대 크기</b><strong>{creature.bubbleMaxScale.toFixed(2)}×</strong></span>
        <input aria-label="개구리 코방울 최대 크기" max="3" min="1.2" onChange={(event) => updateNumber("bubbleMaxScale", event.target.value)} step="0.05" type="range" value={creature.bubbleMaxScale} />
      </label>
      <label className="mapEditRangeField">
        <span><b>코방울 호흡 속도</b><strong>{creature.bubbleSpeed.toFixed(2)}×</strong></span>
        <input aria-label="개구리 코방울 호흡 속도" max="2" min="0.4" onChange={(event) => updateNumber("bubbleSpeed", event.target.value)} step="0.05" type="range" value={creature.bubbleSpeed} />
      </label>
      <label className="mapEditRangeField">
        <span><b>코방울 투명도</b><strong>{Math.round(creature.bubbleOpacity * 100)}%</strong></span>
        <input aria-label="개구리 코방울 투명도" max="1" min="0.2" onChange={(event) => updateNumber("bubbleOpacity", event.target.value)} step="0.02" type="range" value={creature.bubbleOpacity} />
      </label>
    </EditorSection>
  );
}

function BabyDragonControls({ creature, editor }) {
  const updateNumber = (key, value) => {
    const number = Number(value);
    if (Number.isFinite(number)) editor.updateSelectedCreature({ [key]: number });
  };

  return (
    <EditorSection title="용암계곡 아기 용" value="AMBIENT CREATURE">
      <label className="mapEditCreatureToggle">
        <span><strong>환경 행동</strong><small>휴식·졸기·수면과 가끔 발생하는 화염 브레스를 재생합니다</small></span>
        <input
          aria-label="아기 용 환경 행동"
          checked={creature.enabled}
          onChange={(event) => editor.updateSelectedCreature({ enabled: event.target.checked })}
          type="checkbox"
        />
      </label>

      <div className="mapEditCoordinateGrid">
        <label className="mapEditField">
          <span>평균 행동 간격 (초)</span>
          <input aria-label="아기 용 행동 간격" max="20" min="3" onChange={(event) => updateNumber("idleInterval", event.target.value)} step="0.1" type="number" value={creature.idleInterval} />
        </label>
        <label className="mapEditField">
          <span>수면 유지 (초)</span>
          <input aria-label="아기 용 수면 유지 시간" max="24" min="2" onChange={(event) => updateNumber("sleepDuration", event.target.value)} step="0.1" type="number" value={creature.sleepDuration} />
        </label>
      </div>

      <label className="mapEditRangeField">
        <span><b>브레스 발생 확률</b><strong>{Math.round(creature.breathChance * 100)}%</strong></span>
        <input aria-label="아기 용 브레스 발생 확률" max="0.5" min="0.03" onChange={(event) => updateNumber("breathChance", event.target.value)} step="0.01" type="range" value={creature.breathChance} />
      </label>
      <label className="mapEditRangeField">
        <span><b>엎드려 잘 확률</b><strong>{Math.round(creature.sleepChance * 100)}%</strong></span>
        <input aria-label="아기 용 수면 발생 확률" max="0.75" min="0" onChange={(event) => updateNumber("sleepChance", event.target.value)} step="0.01" type="range" value={creature.sleepChance} />
      </label>
      <label className="mapEditRangeField">
        <span><b>동작 속도</b><strong>{creature.animationSpeed.toFixed(2)}×</strong></span>
        <input aria-label="아기 용 동작 속도" max="2.5" min="0.4" onChange={(event) => updateNumber("animationSpeed", event.target.value)} step="0.05" type="range" value={creature.animationSpeed} />
      </label>

      <div className="mapEditCreaturePreview" aria-label="아기 용 동작 미리보기">
        <span><strong>동작 미리보기</strong><small>저장값을 바꾸지 않고 Preview에서만 재생합니다</small></span>
        <div>
          {BABY_DRAGON_PREVIEW_MODES.map((mode) => (
            <button
              aria-pressed={editor.creaturePreviewMode === mode.id}
              className={editor.creaturePreviewMode === mode.id ? "active" : ""}
              key={mode.id}
              onClick={() => editor.previewSelectedCreature(mode.id)}
              type="button"
            >{mode.label}</button>
          ))}
          <button
            aria-label="아기 용 동작 미리보기 끄기"
            className="mapEditCreaturePreviewStop"
            disabled={!editor.creaturePreviewMode}
            onClick={() => editor.previewSelectedCreature("")}
            type="button"
          >정지</button>
        </div>
      </div>
    </EditorSection>
  );
}

function FrogCreatureControls({ editor }) {
  const creature = editor.selectedPlacement?.creature;
  if (!creature || !editor.selectedAsset?.creature) return null;
  if (editor.selectedAsset.creature.type === "baby-dragon") {
    return <BabyDragonControls creature={creature} editor={editor} />;
  }
  if (editor.selectedAsset.creature.type === "sleeping-frog") {
    return <SleepingFrogControls creature={creature} editor={editor} />;
  }
  const isDivingFrog = editor.selectedAsset.creature.type === "diving-frog";

  const viewport = getReferenceViewport(editor);
  const updateNumber = (key, value) => {
    const number = Number(value);
    if (Number.isFinite(number)) editor.updateSelectedCreature({ [key]: number });
  };
  const updateAnchorPixel = (anchor, key, value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    editor.updateSelectedCreatureAnchor(anchor.id, {
      [key]: number / (key === "x" ? viewport.width : viewport.height),
    });
  };
  const nudgeAnchor = (anchor, deltaX, deltaY) => {
    editor.updateSelectedCreatureAnchor(anchor.id, {
      x: anchor.x + deltaX / viewport.width,
      y: anchor.y + deltaY / viewport.height,
    });
  };

  return (
    <EditorSection title={isDivingFrog ? "다이빙 개구리 설정" : "개구리 이동 설정"} value="AMBIENT CREATURE">
      <label className="mapEditCreatureToggle">
        <span><strong>{isDivingFrog ? "다이빙 반복" : "폴짝 이동"}</strong><small>OFF일 때는 기본 위치에서 대기합니다</small></span>
        <input
          aria-label="개구리 이동 기능"
          checked={creature.enabled}
          onChange={(event) => editor.updateSelectedCreature({ enabled: event.target.checked })}
          type="checkbox"
        />
      </label>

      <div className="mapEditCoordinateGrid">
        {!isDivingFrog ? (
          <label className="mapEditField">
            <span>이동 순서</span>
            <select aria-label="개구리 점프 순서" onChange={(event) => editor.updateSelectedCreature({ mode: event.target.value })} value={creature.mode}>
              {FROG_MOVEMENT_MODES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        ) : null}
        <label className="mapEditField">
          <span>{isDivingFrog ? "다이빙 간격 (초)" : "점프 간격 (초)"}</span>
          <input aria-label={isDivingFrog ? "개구리 다이빙 간격" : "개구리 점프 간격"} max="20" min="1" onChange={(event) => updateNumber("jumpInterval", event.target.value)} step="0.1" type="number" value={creature.jumpInterval} />
        </label>
      </div>

      {!isDivingFrog ? (
        <label className="mapEditRangeField">
          <span><b>최대 이동 거리</b><strong>{Math.round(creature.jumpDistance * viewport.width)}px</strong></span>
          <input aria-label="개구리 점프 거리" max="1.5" min="0.04" onChange={(event) => updateNumber("jumpDistance", event.target.value)} step="0.01" type="range" value={creature.jumpDistance} />
        </label>
      ) : null}
      <label className="mapEditRangeField">
        <span><b>점프 높이</b><strong>{Math.round(creature.jumpHeight * viewport.height)}px</strong></span>
        <input aria-label="개구리 점프 높이" max="0.3" min="0.02" onChange={(event) => updateNumber("jumpHeight", event.target.value)} step="0.01" type="range" value={creature.jumpHeight} />
      </label>
      <label className="mapEditRangeField">
        <span><b>동작 속도</b><strong>{creature.animationSpeed.toFixed(2)}×</strong></span>
        <input aria-label="개구리 애니메이션 속도" max="3" min="0.25" onChange={(event) => updateNumber("animationSpeed", event.target.value)} step="0.05" type="range" value={creature.animationSpeed} />
      </label>

      <div className="mapEditAnchorHeader">
        <span><strong>{isDivingFrog ? "Dive Route Points" : "Frog Anchor Points"}</strong><small>Preview의 포인트를 직접 드래그할 수 있습니다</small></span>
        {!isDivingFrog ? <button disabled={creature.anchors.length >= 20} onClick={editor.addSelectedCreatureAnchor} type="button">+ 포인트</button> : null}
      </div>
      <div className="mapEditAnchorList">
        {creature.anchors.map((anchor, index) => {
          const isWaterPoint = isDivingFrog && anchor.kind === "water";
          return (
          <div className={`mapEditAnchorRow ${isWaterPoint ? "mapEditAnchorRow--water" : ""}`} key={anchor.id}>
            <i>{String.fromCharCode(65 + index)}</i>
            {isWaterPoint ? (
              <span className="mapEditAnchorSurface mapEditAnchorSurface--water"><span>입수</span><b>물 위 자유 좌표</b></span>
            ) : (
              <label className="mapEditAnchorSurface">
                <span>{isDivingFrog ? "출발" : "착지"}</span>
                <select
                  aria-label={`개구리 포인트 ${index + 1} 착지 오브젝트`}
                  onChange={(event) => editor.attachSelectedCreatureAnchor(anchor.id, event.target.value)}
                  value={anchor.surfaceInstanceId ?? ""}
                >
                  <option disabled value="">돌·연잎·돌다리 선택</option>
                  {editor.landingSurfaces.map((surface) => (
                    <option key={surface.instanceId} value={surface.instanceId}>{surface.label}</option>
                  ))}
                </select>
              </label>
            )}
            <label><span>X</span><input aria-label={`개구리 포인트 ${index + 1} X 좌표`} onChange={(event) => updateAnchorPixel(anchor, "x", event.target.value)} step="1" type="number" value={Math.round(anchor.x * viewport.width)} /></label>
            <label><span>Y</span><input aria-label={`개구리 포인트 ${index + 1} Y 좌표`} onChange={(event) => updateAnchorPixel(anchor, "y", event.target.value)} step="1" type="number" value={Math.round(anchor.y * viewport.height)} /></label>
            <button aria-label={`개구리 포인트 ${index + 1} 삭제`} disabled={isDivingFrog || creature.anchors.length <= 1} onClick={() => editor.removeSelectedCreatureAnchor(anchor.id)} type="button">×</button>
            <span className="mapEditAnchorNudges" aria-label={`개구리 포인트 ${index + 1} 미세 이동`}>
              <small>{String.fromCharCode(65 + index)} 포인트 1px 이동</small>
              <button aria-label={`${String.fromCharCode(65 + index)} 포인트 왼쪽으로 1픽셀`} onClick={() => nudgeAnchor(anchor, -1, 0)} type="button">←</button>
              <button aria-label={`${String.fromCharCode(65 + index)} 포인트 위로 1픽셀`} onClick={() => nudgeAnchor(anchor, 0, -1)} type="button">↑</button>
              <button aria-label={`${String.fromCharCode(65 + index)} 포인트 아래로 1픽셀`} onClick={() => nudgeAnchor(anchor, 0, 1)} type="button">↓</button>
              <button aria-label={`${String.fromCharCode(65 + index)} 포인트 오른쪽으로 1픽셀`} onClick={() => nudgeAnchor(anchor, 1, 0)} type="button">→</button>
            </span>
          </div>
        );})}
      </div>
    </EditorSection>
  );
}

function ObjectActionBar({ editor }) {
  return (
    <EditorSection title="선택 오브젝트 작업" value="OBJECT ACTIONS">
      <div className="mapEditObjectActionBar">
        <button onClick={() => editor.moveSelectedLayer("front")} type="button"><span aria-hidden="true">↑</span><b>앞으로</b></button>
        <button onClick={() => editor.moveSelectedLayer("back")} type="button"><span aria-hidden="true">↓</span><b>뒤로</b></button>
        <button disabled={!editor.canDuplicateSelected} onClick={editor.duplicateSelected} type="button"><span aria-hidden="true">⧉</span><b>복제</b></button>
        <button aria-label="선택 오브젝트 삭제" className="danger" onClick={editor.deleteSelected} type="button"><span aria-hidden="true">×</span><b>삭제</b></button>
      </div>
      <p className="mapEditDeleteHint"><kbd>Delete</kbd> 키로도 삭제할 수 있으며 <kbd>Ctrl</kbd>+<kbd>Z</kbd>로 복구됩니다.</p>
    </EditorSection>
  );
}

function AdvancedObjectTools({ editor }) {
  const selected = editor.selectedPlacement;
  if (!selected) return null;

  const updateNumber = (key, value) => {
    const number = Number(value);
    if (Number.isFinite(number)) editor.updateSelected({ [key]: number });
  };
  const updatePercent = (key, value) => {
    const number = Number(value);
    if (Number.isFinite(number)) editor.updateSelected({ [key]: number / 100 });
  };
  const resetCorners = () => editor.updateSelected({
    perspectiveCorners: DEFAULT_PERSPECTIVE_CORNERS.map((corner) => ({ ...corner })),
  });

  return (
    <details className="mapEditAdvancedSection" open>
      <summary><span>평면·원근 자유 변형</span><small>FREE TRANSFORM</small></summary>
      <div className="mapEditAdvancedSectionBody">
        <p className="mapEditPerspectiveHelp">왼쪽 Preview의 청록색 네 모서리를 드래그하면 PNG의 투명 영역을 유지한 채 바닥 평면에 맞게 자유 변형됩니다.</p>
        <label className="mapEditRangeField">
          <span><b>Rotation · 평면 회전</b><strong>{Math.round(selected.rotation)}°</strong></span>
          <span className="mapEditRangeControl">
            <input aria-label="오브젝트 회전" max="180" min="-180" onChange={(event) => updateNumber("rotation", event.target.value)} step="1" type="range" value={selected.rotation} />
            <input aria-label="오브젝트 회전 각도" max="180" min="-180" onChange={(event) => updateNumber("rotation", event.target.value)} step="1" type="number" value={selected.rotation} />
          </span>
        </label>
        <div className="mapEditTransformGrid">
          <label className="mapEditField">
            <span>Scale X · 가로</span>
            <input aria-label="오브젝트 가로 비율" max="300" min="-300" onChange={(event) => updatePercent("scaleX", event.target.value)} step="1" type="number" value={Math.round(selected.scaleX * 100)} />
          </label>
          <label className="mapEditField">
            <span>Scale Y · 세로</span>
            <input aria-label="오브젝트 세로 비율" max="300" min="-300" onChange={(event) => updatePercent("scaleY", event.target.value)} step="1" type="number" value={Math.round(selected.scaleY * 100)} />
          </label>
          <label className="mapEditField">
            <span>Skew X</span>
            <input aria-label="오브젝트 X 사선 기울기" max="60" min="-60" onChange={(event) => updateNumber("skewX", event.target.value)} step="1" type="number" value={selected.skewX} />
          </label>
          <label className="mapEditField">
            <span>Skew Y</span>
            <input aria-label="오브젝트 Y 사선 기울기" max="60" min="-60" onChange={(event) => updateNumber("skewY", event.target.value)} step="1" type="number" value={selected.skewY} />
          </label>
        </div>
        <div className="mapEditMirrorGrid">
          <button onClick={() => editor.updateSelected({ scaleX: selected.scaleX * -1 })} type="button">↔ 좌우 반전</button>
          <button onClick={() => editor.updateSelected({ scaleY: selected.scaleY * -1 })} type="button">↕ 상하 반전</button>
        </div>
        <label className="mapEditRangeField">
          <span><b>Tilt X · 앞뒤 눕힘</b><strong>{Math.round(selected.tiltX)}°</strong></span>
          <span className="mapEditRangeControl">
            <input aria-label="오브젝트 앞뒤 원근 기울기" max="88" min="-88" onChange={(event) => updateNumber("tiltX", event.target.value)} step="1" type="range" value={selected.tiltX} />
            <input aria-label="오브젝트 앞뒤 원근 각도" max="88" min="-88" onChange={(event) => updateNumber("tiltX", event.target.value)} step="1" type="number" value={selected.tiltX} />
          </span>
        </label>
        <label className="mapEditRangeField">
          <span><b>Tilt Y · 좌우 원근</b><strong>{Math.round(selected.tiltY)}°</strong></span>
          <span className="mapEditRangeControl">
            <input aria-label="오브젝트 좌우 원근 기울기" max="88" min="-88" onChange={(event) => updateNumber("tiltY", event.target.value)} step="1" type="range" value={selected.tiltY} />
            <input aria-label="오브젝트 좌우 원근 각도" max="88" min="-88" onChange={(event) => updateNumber("tiltY", event.target.value)} step="1" type="number" value={selected.tiltY} />
          </span>
        </label>
        <label className="mapEditRangeField">
          <span><b>Perspective · 원근 거리</b><strong>{Math.round(selected.perspective)}px</strong></span>
          <span className="mapEditRangeControl">
            <input aria-label="오브젝트 원근 거리" max="3000" min="80" onChange={(event) => updateNumber("perspective", event.target.value)} step="10" type="range" value={selected.perspective} />
            <input aria-label="오브젝트 원근 거리 수치" max="3000" min="80" onChange={(event) => updateNumber("perspective", event.target.value)} step="10" type="number" value={selected.perspective} />
          </span>
        </label>
        <div className="mapEditCornerSummary">
          <span><b>4-Corner Distort</b><small>TL · TR · BR · BL 개별 드래그</small></span>
          <button onClick={resetCorners} type="button">코너 초기화</button>
        </div>
        <div className="mapEditCoordinateGrid">
          <label className="mapEditField">
            <span>ANIMATION</span>
            <select aria-label="환경 애니메이션" onChange={(event) => editor.updateSelected({ animation: event.target.value })} value={selected.animation}>
              {MAP_EDIT_ANIMATION_TYPES.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="mapEditField">
            <span>SPEED</span>
            <input aria-label="환경 애니메이션 속도" max="5" min="0.1" onChange={(event) => updateNumber("animationSpeed", event.target.value)} step="0.1" type="number" value={selected.animationSpeed} />
          </label>
        </div>
      </div>
    </details>
  );
}

function AdvancedAssetLibrary({ editor }) {
  const instanceCounts = useMemo(() => editor.placements.reduce((counts, placement) => {
    counts.set(placement.assetId, (counts.get(placement.assetId) ?? 0) + 1);
    return counts;
  }, new Map()), [editor.placements]);

  return (
    <details className="mapEditAdvancedSection mapEditAdvancedSection--library">
      <summary><span>새 오브젝트 추가</span><small>필요할 때만</small></summary>
      <div className="mapEditAdvancedSectionBody">
        <p className="mapEditInlineLibraryHelp">기본 배치에 없는 오브젝트가 필요할 때만 사용하세요.</p>
        <div className="mapEditInlineLibraryGrid">
          {editor.assetCatalog.map((asset) => {
            const instanceCount = instanceCounts.get(asset.id) ?? 0;
            const reachedLimit = Number.isFinite(asset.maxInstances) && instanceCount >= asset.maxInstances;
            return (
              <button
                aria-label={reachedLimit ? `${asset.label} 배치 위치 선택` : `${asset.label} 오브젝트 추가`}
                className="mapEditInlineAssetCard"
                key={asset.id}
                onClick={() => editor.addAsset(asset.id)}
                type="button"
              >
                <span>
                  <AssetPreview asset={asset} />
                  <i>{reachedLimit ? "배치됨" : instanceCount}</i>
                </span>
                <strong>{asset.label}</strong>
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function MapEditControls({ editor, effectEditor }) {
  return (
    <div className="mapEditControls mapEditControls--desktop">
      <EffectTuningControls effectEditor={effectEditor} />
      <InstalledObjectSelector editor={editor} />
      <div className="mapEditHistoryToolbar" aria-label="편집 이력">
        <span><strong>편집 이력</strong><small><kbd>Ctrl</kbd>+<kbd>Z</kbd> 실행 취소 · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> 다시 실행</small></span>
        <button disabled={!editor.canUndo} onClick={editor.undoEditing} type="button">↶ 뒤로</button>
        <button disabled={!editor.canRedo} onClick={editor.redoEditing} type="button">↷ 앞으로</button>
      </div>
      <SelectedObjectSummary editor={editor} />
      {editor.selectedPlacement ? (
        <>
          <PrecisionControls editor={editor} />
          <ObjectActionBar editor={editor} />
          <FrogCreatureControls editor={editor} />
          <AdvancedObjectTools editor={editor} />
        </>
      ) : (
        <p className="mapEditEmptyState">왼쪽 Preview의 오브젝트를 클릭하거나 배치 목록에서 선택하세요.</p>
      )}
      <AdvancedAssetLibrary editor={editor} />
    </div>
  );
}

function MapEditSessionActions({ editor, effectEditor }) {
  const hasChanges = editor.hasChanges || Boolean(effectEditor?.hasChanges);
  const statusLabel = editor.saveStatus === "error" && editor.saveError
    ? editor.saveError
    : hasChanges
      ? editor.saveStatus === "saving" ? SAVE_STATUS_LABELS.saving : "적용하지 않은 변경사항이 있습니다"
      : "적용된 배치와 동일합니다";
  const closeEditing = () => {
    effectEditor?.cancelEditing();
    editor.closeEditing();
  };
  const applyEditing = () => editor.applyEditing(
    () => effectEditor?.applyEditing() ?? true,
  );
  return (
    <footer className="mapEditSessionActions">
      <span>
        <i className={hasChanges ? "dirty" : "clean"} aria-hidden="true" />
        <small className={`mapEditSaveStatus mapEditSaveStatus--${editor.saveStatus}`}>
          {statusLabel}
        </small>
      </span>
      <div>
        <button className="mapEditSelectionCancelButton" disabled={!editor.selectedPlacement || editor.saveStatus === "saving"} onClick={() => editor.selectInstance("")} type="button">선택 취소</button>
        <button aria-label="저장하지 않고 맵 편집기 닫기" className="mapEditCloseButton" disabled={editor.saveStatus === "saving"} onClick={closeEditing} type="button">닫기</button>
        <button className="mapEditApplyButton" disabled={editor.saveStatus === "saving"} onClick={applyEditing} type="button">
          {editor.saveStatus === "saving" ? "적용 중…" : "적용"}
        </button>
      </div>
    </footer>
  );
}

function MapEditMapSwitcher({ editor, mapOptions, onMapChange }) {
  const options = Array.isArray(mapOptions) ? mapOptions : [];
  const selectedIndex = Math.max(0, options.findIndex((map) => map.id === editor.skin.id));
  const switchBy = (offset) => {
    if (options.length < 2 || typeof onMapChange !== "function") return;
    const nextIndex = (selectedIndex + offset + options.length) % options.length;
    onMapChange(options[nextIndex].id);
  };

  return (
    <section className="mapEditMapSwitcher" aria-label="편집할 맵 변경">
      <span><small>EDITING MAP</small><strong>맵 비교 전환</strong><em>왕복해도 현재 세션의 임시 배치를 유지합니다.</em></span>
      <div>
        <button aria-label="이전 맵 편집" disabled={options.length < 2 || editor.saveStatus === "saving"} onClick={() => switchBy(-1)} type="button">‹</button>
        <select
          aria-label="편집할 슈팅 맵"
          disabled={editor.saveStatus === "saving"}
          onChange={(event) => onMapChange?.(event.target.value)}
          value={editor.skin.id}
        >
          {options.map((map) => <option key={map.id} value={map.id}>{map.label}</option>)}
        </select>
        <button aria-label="다음 맵 편집" disabled={options.length < 2 || editor.saveStatus === "saving"} onClick={() => switchBy(1)} type="button">›</button>
      </div>
    </section>
  );
}

function DesktopMapEditPanel({ editor, effectEditor, mapOptions, onMapChange }) {
  return (
    <aside className="mapEditPanel mapEditPanel--desktop" onClick={(event) => event.stopPropagation()}>
      <header className="mapEditPanelHeader">
        <span className="mapEditPanelBrand" aria-hidden="true">JP</span>
        <span className="mapEditPanelHeading"><span>JUST PLAY · MAP STUDIO</span><strong>{editor.skin.label}</strong><small>390 × 844 LIVE PREVIEW</small></span>
        <i className="mapEditDevBadge">TUNE</i>
      </header>
      <MapEditMapSwitcher editor={editor} mapOptions={mapOptions} onMapChange={onMapChange} />
      <div className="mapEditPanelScroll"><MapEditControls effectEditor={effectEditor} editor={editor} /></div>
      <MapEditSessionActions effectEditor={effectEditor} editor={editor} />
    </aside>
  );
}

export default function MapEditPanel({ effectEditor, editor, layout, mapOptions, onMapChange }) {
  if (!editor.enabled || layout !== "desktop") return null;
  return (
    <DesktopMapEditPanel
      effectEditor={effectEditor}
      editor={editor}
      mapOptions={mapOptions}
      onMapChange={onMapChange}
    />
  );
}
