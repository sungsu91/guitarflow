import ko from "../../../i18n/locales/ko.js";
import { localizeUi } from "./../../../i18n/core.js";
import { t as translateUi } from "./../../../i18n/core.js";
import { Translation, useLanguage } from "./../../../i18n/react.jsx";
import { useMemo } from "react";
import { isEditableShooterMap } from "../registry.js";

import {
  getShooterNoteMonsterLabelLayout,
  getShooterNoteMonsterLabelPalette,
  getShooterNoteMonsterRenderScale,
  getShooterNoteMonsterSkinRenderScale,
} from "../../noteMonsterAssets.js";
import {
  getShooterNoteMonsterLabelPosition,
  getShooterNoteMonsterRenderedScales,
} from "../../noteMonsterTuning.js";
import { DEFAULT_PERSPECTIVE_CORNERS } from "../freeTransform.js";
import { FROG_MOVEMENT_MODES, MAP_EDIT_ANIMATION_TYPES } from "./editorState.js";

const SAVE_STATUS_LABELS = {
  dirty: ko["shooter.youHaveUnappliedChanges"],
  error: ko["shooter.couldNotSaveYourChangesArePreserved"],
  idle: ko["shooter.initialEditingState"],
  saved: ko["shooter.mapLayoutApplied"],
  saving: ko["shooter.applyingMapLayout"],
};

const AMBIENT_CREATURE_COLOR_PRESETS = Object.freeze([
  Object.freeze({ id: "jade", label: ko["shooter.jade"], bodyColor: "#56b870", bubbleColor: "#a9edf0", bodySaturation: 1.05, bodyBrightness: 0.97 }),
  Object.freeze({ id: "deep-jade", label: ko["shooter.deepJade"], bodyColor: "#2f7d66", bubbleColor: "#9fe7d8", bodySaturation: 0.95, bodyBrightness: 0.88 }),
  Object.freeze({ id: "sapphire", label: ko["shooter.sapphire"], bodyColor: "#5278c9", bubbleColor: "#b9e8ff", bodySaturation: 0.92, bodyBrightness: 0.94 }),
  Object.freeze({ id: "amethyst", label: ko["shooter.amethyst"], bodyColor: "#8a68b8", bubbleColor: "#e1ccff", bodySaturation: 0.82, bodyBrightness: 0.96 }),
  Object.freeze({ id: "rose-bronze", label: ko["shooter.roseBronze"], bodyColor: "#b86f70", bubbleColor: "#ffd1dc", bodySaturation: 0.78, bodyBrightness: 0.95 }),
  Object.freeze({ id: "champagne", label: ko["shooter.champagneGold"], bodyColor: "#ad9a56", bubbleColor: "#fff0bd", bodySaturation: 0.72, bodyBrightness: 1.02 }),
]);

const SLEEPING_FROG_PREVIEW_MODES = Object.freeze([
  Object.freeze({ id: "idle", label: ko["shooter.dozingWhileSeated"] }),
  Object.freeze({ id: "open-mouth", label: ko["shooter.sleepingWithMouthOpen"] }),
  Object.freeze({ id: "flat", label: ko["shooter.sprawledSleeping"] }),
  Object.freeze({ id: "cycle", label: ko["shooter.allAnimations"] }),
]);

const BABY_DRAGON_PREVIEW_MODES = Object.freeze([
  Object.freeze({ id: "idle", label: ko["shooter.relaxing"] }),
  Object.freeze({ id: "sleep", label: ko["shooter.sleepingOnBelly"] }),
  Object.freeze({ id: "breath", label: ko["shooter.fireBreath"] }),
  Object.freeze({ id: "cycle", label: ko["shooter.allAnimations"] }),
]);

function getReferenceViewport(editor) {
  return {
    height: editor.skin.referenceViewport?.height || editor.skin.referenceViewport?.deviceHeight || 756,
    width: editor.skin.referenceViewport?.width || editor.skin.referenceViewport?.deviceWidth || 390,
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
  useLanguage();
  const selected = editor.selectedPlacement;
  const asset = editor.selectedAsset;

  if (!selected || !asset) {
    return (
      <div className="mapEditSelectedCard mapEditSelectedCard--empty">
        <span className="mapEditSelectedPlaceholder" aria-hidden="true">◇</span>
        <span>
          <small><Translation id="originalUi.selectedObject" /></small>
          <strong><Translation id="shooter.chooseAnObjectToAdjust" /></strong>
          <em><Translation id="shooter.selectInPreviewOrThePlacementListBelow" /></em>
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
        <small><Translation id="originalUi.selectedObject" /></small>
        <strong>{localizeUi(asset.label)}</strong>
        <em><Translation id="originalUi.xMapeditpanel" />{Math.round(selected.x * viewport.width)}<Translation id="originalUi.pxY" />{Math.round(selected.y * viewport.height)}<Translation id="shooter.pxScale" />{Math.round(selected.scale * 100)}%</em>
      </span>
      <i><Translation id="shooter.adjusting" /></i>
    </div>
  );
}

function EditorSection({ children, title, value }) {
  return (
    <section className="mapEditControlSection">
      <header>
        <strong>{localizeUi(title)}</strong>
        {value ? <small>{value}</small> : null}
      </header>
      {children}
    </section>
  );
}

function CollapsibleEditorSection({ children, title, value, variant = "effects" }) {
  if (variant === "effects") {
    return (
      <details className="mapEditAdvancedSection mapEditAdvancedSection--effects">
        <summary>
          <span>{localizeUi(title)}</span>
          <small>{value}</small>
        </summary>
        <div className="mapEditAdvancedSectionBody">{children}</div>
      </details>
    );
  }
  return (
    <details className={`mapEditAdvancedSection mapEditAdvancedSection--${variant}`}>
      <summary>
        <span>{localizeUi(title)}</span>
        <small>{value}</small>
      </summary>
      <div className="mapEditAdvancedSectionBody">{children}</div>
    </details>
  );
}

function MonsterTuningControls({ monsterEditor }) {
  useLanguage();
  if (!monsterEditor) return null;

  const noteName = `${monsterEditor.activeRoot}#4`;
  const activeTuning = monsterEditor.activeTuning;
  const labelLayout = getShooterNoteMonsterLabelLayout(noteName, monsterEditor.activeSkin.id);
  const labelPalette = getShooterNoteMonsterLabelPalette(noteName, monsterEditor.activeSkin.id);
  const labelColor = activeTuning.labelColor || labelPalette.color;
  const labelOutline = activeTuning.labelOutline || labelPalette.outline;
  const renderedScales = getShooterNoteMonsterRenderedScales(activeTuning);
  const labelPosition = getShooterNoteMonsterLabelPosition(labelLayout, activeTuning);
  const renderScale = renderedScales.monsterScale * getShooterNoteMonsterRenderScale(
    noteName,
    monsterEditor.activeSkin.id,
  );
  const skinRenderScale = getShooterNoteMonsterSkinRenderScale(monsterEditor.activeSkin.id);
  const pitchText = monsterEditor.activeSkin.pitchText;
  const previewLabelSize = pitchText?.renderedByApp
    ? 86.4 * renderScale * pitchText.fontSizeRatio * activeTuning.labelScale
    : 13 * renderedScales.labelScale * skinRenderScale;
  const previewLabelOutlineWidth = pitchText?.renderedByApp
    ? Math.max(0.8, 86.4 * renderScale * pitchText.outlineWidthRatio)
    : 0.9 * skinRenderScale;
  const jointScalePercent = Math.round(activeTuning.jointScale * 100);
  const labelScalePercent = Math.round(activeTuning.labelScale * 100);
  const scalePercent = Math.round(activeTuning.scale * 100);
  const updateNumber = (key, value, divisor = 1) => {
    const number = Number(value);
    if (Number.isFinite(number)) monsterEditor.updateActiveTuning({ [key]: number / divisor });
  };

  return (
    <CollapsibleEditorSection
      title={translateUi("shooter.targetSkinAndTextAlignment")}
      value={`${monsterEditor.activeSkin.label} · ${monsterEditor.activeRoot}`}
      variant="monster"
    >
      <div className="mapEditMonsterSkinSummary">
        <span>
          <small><Translation id="shooter.currentTargetSkin" /></small>
          <strong>{localizeUi(monsterEditor.activeSkin.label)}</strong>
        </span>
        <em><Translation id="shooter.savePerNote" /></em>
      </div>

      <div aria-label={translateUi("shooter.chooseTargetNoteToAdjust")} className="mapEditMonsterRootTabs">
        {monsterEditor.roots.map((noteRoot) => {
          const isSelected = monsterEditor.activeRoot === noteRoot;
          return (
            <button
              aria-label={translateUi("shooter.adjustValue1Target", { value1: noteRoot })}
              aria-pressed={isSelected}
              className={isSelected ? "is-selected" : ""}
              key={noteRoot}
              onClick={() => monsterEditor.selectRoot(noteRoot)}
              type="button"
            >
              <img alt="" decoding="async" draggable="false" src={monsterEditor.activeSkin.assets[noteRoot][0]} />
              <b>{noteRoot}</b>
            </button>
          );
        })}
      </div>

      <div className="mapEditMonsterPreview" aria-label={translateUi("shooter.value1TargetLivePreview", { value1: noteName })}>
        <div
          className="mapEditMonsterPreviewTarget"
          style={{
            "--monster-preview-label-color": labelColor,
            "--monster-preview-label-glow": labelPalette.glow,
            "--monster-preview-label-outline": labelOutline,
            "--monster-preview-label-max-width": `${(pitchText?.textMaxWidthRatio ?? 1) * 100}%`,
            "--monster-preview-label-outline-width": `${previewLabelOutlineWidth}px`,
            "--monster-preview-label-size": `${previewLabelSize}px`,
            "--monster-preview-label-x": `${labelPosition.x}%`,
            "--monster-preview-label-y": `${labelPosition.y}%`,
            "--monster-preview-size": `${86.4 * renderScale}px`,
          }}
        >
          <img alt="" decoding="async" draggable="false" src={monsterEditor.activeFrames[0]} />
          <span className="mapEditMonsterPreviewLabel">
            <b>{noteName}</b>
          </span>
        </div>
        <span><b>{noteName}</b><small><Translation id="shooter.previewActualGamePositionAndSize" /></small></span>
      </div>

      <div className="mapEditPrecisionLayout mapEditPrecisionLayout--monster">
        <div className="mapEditNudgePad" aria-label={translateUi("shooter.targetTextMoveBy1Pixel")}>
          <span />
          <button aria-label={translateUi("shooter.targetTextUp1Pixel")} onClick={() => monsterEditor.nudgeLabel(0, -1)} type="button">↑</button>
          <span />
          <button aria-label={translateUi("shooter.targetTextLeft1Pixel")} onClick={() => monsterEditor.nudgeLabel(-1, 0)} type="button">←</button>
          <i><Translation id="shooter.text" /></i>
          <button aria-label={translateUi("shooter.targetTextRight1Pixel")} onClick={() => monsterEditor.nudgeLabel(1, 0)} type="button">→</button>
          <span />
          <button aria-label={translateUi("shooter.targetTextDown1Pixel")} onClick={() => monsterEditor.nudgeLabel(0, 1)} type="button">↓</button>
          <span />
        </div>
        <div className="mapEditPixelFields">
          <label className="mapEditField">
            <span><Translation id="shooter.textHorizontalOffsetReferencePx" /></span>
            <input aria-label={translateUi("shooter.targetTextHorizontalOffset")} max="80" min="-80" onChange={(event) => updateNumber("labelOffsetX", event.target.value)} step="1" type="number" value={Math.round(activeTuning.labelOffsetX)} />
          </label>
          <label className="mapEditField">
            <span><Translation id="shooter.textVerticalOffsetReferencePx" /></span>
            <input aria-label={translateUi("shooter.targetTextVerticalOffset")} max="80" min="-80" onChange={(event) => updateNumber("labelOffsetY", event.target.value)} step="1" type="number" value={Math.round(activeTuning.labelOffsetY)} />
          </label>
        </div>
      </div>

      <div className="mapEditMonsterColorEditor">
        <header>
          <span><b><Translation id="shooter.textColor" /></b><small><Translation id="shooter.chooseAColorToMatchOrbBrightness" /></small></span>
          <button onClick={monsterEditor.resetActiveColors} type="button"><Translation id="shooter.autoColor" /></button>
        </header>
        <div>
          <label>
            <span><Translation id="shooter.textColorMapEditPanel" /></span>
            <span className="mapEditMonsterColorField">
              <input aria-label={translateUi("shooter.targetTextColor")} onChange={(event) => monsterEditor.updateActiveTuning({ labelColor: event.target.value })} type="color" value={labelColor} />
              <input aria-label={translateUi("shooter.targetTextColorHex")} className="mapEditMonsterColorHex" maxLength="7" onChange={(event) => monsterEditor.updateActiveTuning({ labelColor: event.target.value })} spellCheck="false" type="text" value={labelColor.toUpperCase()} />
            </span>
          </label>
          <label>
            <span><Translation id="shooter.outlineColor" /></span>
            <span className="mapEditMonsterColorField">
              <input aria-label={translateUi("shooter.targetTextOutlineColor")} onChange={(event) => monsterEditor.updateActiveTuning({ labelOutline: event.target.value })} type="color" value={labelOutline} />
              <input aria-label={translateUi("shooter.targetTextOutlineColorHex")} className="mapEditMonsterColorHex" maxLength="7" onChange={(event) => monsterEditor.updateActiveTuning({ labelOutline: event.target.value })} spellCheck="false" type="text" value={labelOutline.toUpperCase()} />
            </span>
          </label>
        </div>
      </div>

      <div className="mapEditScaleEditor mapEditScaleEditor--monsterLabel">
        <span><b><Translation id="shooter.textSize" /></b><strong>{labelScalePercent}%</strong></span>
        <div className="mapEditScaleQuickButtons">
          <button aria-label={translateUi("shooter.reduceTargetTextSizeBy5")} onClick={() => monsterEditor.resizeActiveLabel(-0.05)} type="button">−5</button>
          <button aria-label={translateUi("shooter.reduceTargetTextSizeBy1")} onClick={() => monsterEditor.resizeActiveLabel(-0.01)} type="button">−1</button>
          <input aria-label={translateUi("shooter.targetTextSize")} max="200" min="50" onChange={(event) => monsterEditor.setActiveLabelScale(Number(event.target.value) / 100)} step="1" type="range" value={labelScalePercent} />
          <button aria-label={translateUi("shooter.increaseTargetTextSizeBy1")} onClick={() => monsterEditor.resizeActiveLabel(0.01)} type="button">+1</button>
          <button aria-label={translateUi("shooter.increaseTargetTextSizeBy5")} onClick={() => monsterEditor.resizeActiveLabel(0.05)} type="button">+5</button>
        </div>
      </div>

      <div className="mapEditScaleEditor mapEditScaleEditor--monster">
        <span><b><Translation id="shooter.targetSkinSize" /></b><strong>{scalePercent}%</strong></span>
        <div className="mapEditScaleQuickButtons">
          <button aria-label={translateUi("shooter.reduceTargetSizeBy5")} onClick={() => monsterEditor.resizeActive(-0.05)} type="button">−5</button>
          <button aria-label={translateUi("shooter.reduceTargetSizeBy1")} onClick={() => monsterEditor.resizeActive(-0.01)} type="button">−1</button>
          <input aria-label={translateUi("shooter.targetSkinSize")} max="250" min="50" onChange={(event) => updateNumber("scale", event.target.value, 100)} step="1" type="range" value={scalePercent} />
          <button aria-label={translateUi("shooter.increaseTargetSizeBy1")} onClick={() => monsterEditor.resizeActive(0.01)} type="button">+1</button>
          <button aria-label={translateUi("shooter.increaseTargetSizeBy5")} onClick={() => monsterEditor.resizeActive(0.05)} type="button">+5</button>
        </div>
      </div>

      <div className="mapEditScaleEditor mapEditScaleEditor--monsterJoint">
        <span><b><Translation id="shooter.scaleTextAndTargetTogether" /></b><strong>{jointScalePercent}%</strong></span>
        <div className="mapEditScaleQuickButtons">
          <button aria-label={translateUi("shooter.reduceTextAndTargetSizeBy5")} onClick={() => monsterEditor.resizeActiveJoint(-0.05)} type="button">−5</button>
          <button aria-label={translateUi("shooter.reduceTextAndTargetSizeBy1")} onClick={() => monsterEditor.resizeActiveJoint(-0.01)} type="button">−1</button>
          <input aria-label={translateUi("shooter.textAndTargetSize")} max="200" min="50" onChange={(event) => monsterEditor.setActiveJointScale(Number(event.target.value) / 100)} step="1" type="range" value={jointScalePercent} />
          <button aria-label={translateUi("shooter.increaseTextAndTargetSizeBy1")} onClick={() => monsterEditor.resizeActiveJoint(0.01)} type="button">+1</button>
          <button aria-label={translateUi("shooter.increaseTextAndTargetSizeBy5")} onClick={() => monsterEditor.resizeActiveJoint(0.05)} type="button">+5</button>
        </div>
      </div>

      <p className="mapEditMonsterTuningHelp"><Translation id="shooter.textMovesOnAFixedLayerMatchingTheTargetSSizeBrowser" /></p>
      <button className="mapEditRestoreButton" onClick={monsterEditor.resetActive} type="button"><Translation id="shooter.resetThisNoteSTargetAdjustments" /></button>
    </CollapsibleEditorSection>
  );
}

function EffectTuningControls({ effectEditor }) {
  useLanguage();
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
    <CollapsibleEditorSection title={translateUi("shooter.guitarEffectAlignment")} value={ko["shooter.floorAuraAsNeeded"]}>
      <div aria-label={translateUi("shooter.guitarEffectTypeToAdjust")} className="mapEditEffectSlotTabs">
        {["floor", "aura"].map((slot) => (
          <button
            aria-pressed={effectEditor.activeSlot === slot}
            className={effectEditor.activeSlot === slot ? "is-selected" : ""}
            key={slot}
            onClick={() => effectEditor.selectSlot(slot)}
            type="button"
          >
            <b>{slot === "floor" ? "FLOOR" : "AURA"}</b>
            <small>{slot === "floor" ? translateUi("shooter.guitarStandFloor") : translateUi("shooter.guitarAura")}</small>
            <em>{effectEditor.activeSlot === slot ? translateUi("shooter.selected") : ""}</em>
          </button>
        ))}
      </div>

      <div aria-label={translateUi("shooter.chooseValue1Skin", { value1: effectEditor.activeSlot === "floor" ? "FLOOR" : "AURA" })} className="mapEditEffectLibrary">
        {effectEditor.activeOptions.map((effect) => {
          const isSelected = activeEffect?.id === effect.id;
          return (
            <button
              aria-label={localizeUi(`${effect.label} ${isSelected ? translateUi("app.selected") : translateUi("app.select")}`)}
              aria-pressed={isSelected}
              className={isSelected ? "is-selected" : ""}
              key={effect.id}
              onClick={() => effectEditor.selectEffect(effectEditor.activeSlot, effect.id)}
              type="button"
            >
              <span aria-hidden="true">
                {effect.asset ? <img alt="" decoding="async" draggable="false" src={effect.asset} /> : <i>—</i>}
              </span>
              <b>{localizeUi(effect.label)}</b>
              <em>{isSelected ? "✓" : ""}</em>
            </button>
          );
        })}
      </div>

      <div className={`mapEditEffectCurrent ${isEnabled ? "" : "is-disabled"}`}>
        <span aria-hidden="true">
          {activeEffect?.asset ? <img alt="" decoding="async" draggable="false" src={activeEffect.asset} /> : <i>—</i>}
        </span>
        <span><small><Translation id="shooter.selectedEffect" /></small><strong>{localizeUi(activeEffect?.label ?? translateUi("app.none"))}</strong></span>
        <em>{isEnabled ? translateUi("shooter.liveAdjustment") : translateUi("shooter.disabled")}</em>
      </div>

      {isEnabled ? (
        <>
          <div className="mapEditPrecisionLayout mapEditPrecisionLayout--effect">
            <div className="mapEditNudgePad" aria-label={translateUi("shooter.effectMoveBy1Pixel")}>
              <span />
              <button aria-label={translateUi("shooter.effectUp1Pixel")} onClick={() => effectEditor.nudgeActive(0, -1)} type="button">↑</button>
              <span />
              <button aria-label={translateUi("shooter.effectLeft1Pixel")} onClick={() => effectEditor.nudgeActive(-1, 0)} type="button">←</button>
              <i><Translation id="originalUi.1px" /></i>
              <button aria-label={translateUi("shooter.effectRight1Pixel")} onClick={() => effectEditor.nudgeActive(1, 0)} type="button">→</button>
              <span />
              <button aria-label={translateUi("shooter.effectDown1Pixel")} onClick={() => effectEditor.nudgeActive(0, 1)} type="button">↓</button>
              <span />
            </div>
            <div className="mapEditPixelFields">
              <label className="mapEditField">
                <span><Translation id="shooter.xOffsetPx" /></span>
                <input aria-label={translateUi("shooter.effectXOffset")} max="160" min="-160" onChange={(event) => updateNumber("offsetX", event.target.value)} step="1" type="number" value={Math.round(activeTuning.offsetX)} />
              </label>
              <label className="mapEditField">
                <span><Translation id="shooter.yOffsetPx" /></span>
                <input aria-label={translateUi("shooter.effectYOffset")} max="220" min="-180" onChange={(event) => updateNumber("offsetY", event.target.value)} step="1" type="number" value={Math.round(activeTuning.offsetY)} />
              </label>
            </div>
          </div>

          <div className="mapEditScaleEditor">
            <span><b><Translation id="pdf.size" /></b><strong>{scalePercent}%</strong></span>
            <div className="mapEditScaleQuickButtons">
              <button aria-label={translateUi("shooter.reduceEffectSizeBy5")} onClick={() => effectEditor.resizeActive(-0.05)} type="button">−5</button>
              <button aria-label={translateUi("shooter.reduceEffectSizeBy1")} onClick={() => effectEditor.resizeActive(-0.01)} type="button">−1</button>
              <input aria-label={translateUi("shooter.effectSize")} max="250" min="25" onChange={(event) => updateNumber("scale", event.target.value, 100)} step="1" type="range" value={scalePercent} />
              <button aria-label={translateUi("shooter.increaseEffectSizeBy1")} onClick={() => effectEditor.resizeActive(0.01)} type="button">+1</button>
              <button aria-label={translateUi("shooter.increaseEffectSizeBy5")} onClick={() => effectEditor.resizeActive(0.05)} type="button">+5</button>
            </div>
          </div>

          <label className="mapEditRangeField mapEditEffectOpacity">
            <span><b><Translation id="shooter.opacity" /></b><strong>{opacityPercent}%</strong></span>
            <input aria-label={translateUi("shooter.effectOpacity")} max="100" min="10" onChange={(event) => updateNumber("opacity", event.target.value, 100)} step="1" type="range" value={opacityPercent} />
          </label>
          <button className="mapEditRestoreButton" onClick={effectEditor.resetActive} type="button"><Translation id="shooter.resetThisEffectSAdjustments" /></button>
        </>
      ) : (
        <p className="mapEditEffectEmpty"><Translation id="shooter.chooseAnEffectForThisSlotInChangeSkinToAdjustIts" /></p>
      )}
    </CollapsibleEditorSection>
  );
}

function InstalledObjectSelector({ editor }) {
  useLanguage();
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
        <span><Translation id="shooter.placedObjects" /></span>
        <small>{editor.placements.length}<Translation id="shooter.objectsTapToOpen" /></small>
      </summary>
      <div className="mapEditAdvancedSectionBody">
        <p className="mapEditPlacedHelp"><Translation id="shooter.selectAnExistingObjectAndAdjustItsPositionAndSize" /></p>
        <label className="mapEditField mapEditField--wide">
          <span><Translation id="shooter.quickSelect" /></span>
          <select
            aria-label={translateUi("shooter.placedObjectToEdit")}
            onChange={(event) => editor.selectInstance(event.target.value)}
            value={editor.selectedInstanceId}
          >
            <option value=""><Translation id="shooter.chooseAnObject" /></option>
            {instanceOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.index + 1}. {localizeUi(option.label)}</option>
            ))}
          </select>
        </label>
        <div aria-label={translateUi("shooter.placedObjectList")} className="mapEditPlacedObjectGrid">
          {instanceOptions.map((option) => (
            <button
              aria-label={localizeUi(translateUi("components.selectValue1", { value1: option.label }))}
              aria-pressed={editor.selectedInstanceId === option.id}
              className={editor.selectedInstanceId === option.id ? "is-selected" : ""}
              key={option.id}
              onClick={() => editor.selectInstance(option.id)}
              type="button"
            >
              <span aria-hidden="true">
                <AssetPreview asset={option.asset} />
              </span>
              <b>{localizeUi(option.label)}</b>
              <small>#{String(option.index + 1).padStart(2, "0")} · {Math.round(option.scale * 100)}%</small>
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}

function PrecisionControls({ editor }) {
  useLanguage();
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
    <EditorSection title={translateUi("shooter.fineTunePositionAndSize")} value="QUICK TUNE">
      <div className="mapEditPrecisionLayout">
        <div className="mapEditNudgePad" aria-label={translateUi("shooter.moveBy1Pixel")}>
          <span />
          <button aria-label={translateUi("shooter.up1Pixel")} onClick={() => editor.nudgeSelected(0, -1)} title={translateUi("shooter.up1Px")} type="button">↑</button>
          <span />
          <button aria-label={translateUi("shooter.left1Pixel")} onClick={() => editor.nudgeSelected(-1, 0)} title={translateUi("shooter.left1Px")} type="button">←</button>
          <i><Translation id="originalUi.1px" /></i>
          <button aria-label={translateUi("shooter.right1Pixel")} onClick={() => editor.nudgeSelected(1, 0)} title={translateUi("shooter.right1Px")} type="button">→</button>
          <span />
          <button aria-label={translateUi("shooter.down1Pixel")} onClick={() => editor.nudgeSelected(0, 1)} title={translateUi("shooter.down1Px")} type="button">↓</button>
          <span />
        </div>
        <div className="mapEditPixelFields">
          <label className="mapEditField">
            <span><Translation id="shooter.xPositionPx" /></span>
            <input aria-label={translateUi("shooter.objectXCoordinateInPixels")} onChange={(event) => updatePixel("x", event.target.value, viewport.width)} step="1" type="number" value={xPixels} />
          </label>
          <label className="mapEditField">
            <span><Translation id="shooter.yPositionPx" /></span>
            <input aria-label={translateUi("shooter.objectYCoordinateInPixels")} onChange={(event) => updatePixel("y", event.target.value, viewport.height)} step="1" type="number" value={yPixels} />
          </label>
        </div>
      </div>
      <p className="mapEditKeyboardHint"><kbd><Translation id="shooter.arrowKeys" /></kbd><Translation id="shooter.move1Px" /><kbd><Translation id="originalUi.shift" /></kbd> + <kbd><Translation id="shooter.arrowKeys" /></kbd><Translation id="shooter.move5Px" /></p>

      <div className="mapEditScaleEditor">
        <span><b><Translation id="pdf.size" /></b><strong>{scalePercent}%</strong></span>
        <div className="mapEditScaleQuickButtons">
          <button aria-label={translateUi("shooter.reduceSizeBy5")} onClick={() => editor.resizeSelected(-0.05)} type="button">−5</button>
          <button aria-label={translateUi("shooter.reduceSizeBy1")} onClick={() => editor.resizeSelected(-0.01)} type="button">−1</button>
          <input aria-label={translateUi("shooter.objectSize")} max="300" min="10" onChange={(event) => updateScalePercent(event.target.value)} step="1" type="range" value={scalePercent} />
          <button aria-label={translateUi("shooter.increaseSizeBy1")} onClick={() => editor.resizeSelected(0.01)} type="button">+1</button>
          <button aria-label={translateUi("shooter.increaseSizeBy5")} onClick={() => editor.resizeSelected(0.05)} type="button">+5</button>
        </div>
      </div>

      <button className="mapEditRestoreButton" onClick={editor.restoreSelected} type="button"><Translation id="shooter.restoreSelectedObjectToPreEditState" /></button>
    </EditorSection>
  );
}

function SleepingFrogControls({ creature, editor }) {
  useLanguage();
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
    <EditorSection title={translateUi("shooter.sleepyFrog")} value="AMBIENT CREATURE">
      <label className="mapEditCreatureToggle">
        <span><strong><Translation id="shooter.dozingAnimation" /></strong><small><Translation id="shooter.cyclesThroughBreathingNoddingFloppingAndWaking" /></small></span>
        <input
          aria-label={translateUi("shooter.sleepyFrogAnimation")}
          checked={creature.enabled}
          onChange={(event) => editor.updateSelectedCreature({ enabled: event.target.checked })}
          type="checkbox"
        />
      </label>

      <div className="mapEditCoordinateGrid">
        <label className="mapEditField">
          <span><Translation id="shooter.averageDozeIntervalS" /></span>
          <input aria-label={translateUi("shooter.frogDozeInterval")} max="30" min="3" onChange={(event) => updateNumber("sleepInterval", event.target.value)} step="0.1" type="number" value={creature.sleepInterval} />
        </label>
        <label className="mapEditField">
          <span><Translation id="shooter.lyingDurationS" /></span>
          <input aria-label={translateUi("shooter.frogLyingDuration")} max="30" min="2" onChange={(event) => updateNumber("flatDuration", event.target.value)} step="0.1" type="number" value={creature.flatDuration} />
        </label>
      </div>
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.flopProbability" /></b><strong>{Math.round(creature.fallChance * 100)}%</strong></span>
        <input aria-label={translateUi("shooter.frogFlopProbability")} max="0.75" min="0" onChange={(event) => updateNumber("fallChance", event.target.value)} step="0.01" type="range" value={creature.fallChance} />
      </label>
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.animationSpeed" /></b><strong>{creature.animationSpeed.toFixed(2)}×</strong></span>
        <input aria-label={translateUi("shooter.sleepyFrogAnimationSpeed")} max="2.5" min="0.35" onChange={(event) => updateNumber("animationSpeed", event.target.value)} step="0.05" type="range" value={creature.animationSpeed} />
      </label>
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.openMouthSleepDuration" /></b><strong>{creature.openMouthDuration.toFixed(1)}<Translation id="shooter.s" /></strong></span>
        <input aria-label={translateUi("shooter.frogOpenMouthSleepDuration")} max="8" min="0.3" onChange={(event) => updateNumber("openMouthDuration", event.target.value)} step="0.1" type="range" value={creature.openMouthDuration} />
      </label>

      <div className="mapEditCreaturePreview" aria-label={translateUi("shooter.previewSleepyFrogAnimation")}>
        <span><strong><Translation id="shooter.previewAnimationAndBubble" /></strong><small><Translation id="shooter.playsInPreviewOnlySavedValuesStayUnchanged" /></small></span>
        <div>
          {SLEEPING_FROG_PREVIEW_MODES.map((mode) => (
            <button
              aria-pressed={editor.creaturePreviewMode === mode.id}
              className={editor.creaturePreviewMode === mode.id ? "active" : ""}
              key={mode.id}
              onClick={() => editor.previewSelectedCreature(mode.id)}
              type="button"
            >{localizeUi(mode.label)}</button>
          ))}
          <button
            aria-label={translateUi("shooter.stopFrogAnimationPreview")}
            className="mapEditCreaturePreviewStop"
            disabled={!editor.creaturePreviewMode}
            onClick={() => editor.previewSelectedCreature("")}
            type="button"
          ><Translation id="app.stopApp" /></button>
        </div>
      </div>

      <div className="mapEditColorGrid">
        <label className="mapEditColorField">
          <span><b><Translation id="shooter.frogColor" /></b><small><Translation id="shooter.changesHueWhileKeepingOriginalDetails" /></small></span>
          <input aria-label={translateUi("shooter.sleepyFrogBodyColor")} onChange={(event) => editor.updateSelectedCreature({ bodyColor: event.target.value })} type="color" value={creature.bodyColor} />
        </label>
        <label className="mapEditColorField">
          <span><b><Translation id="shooter.sleepBubbleColor" /></b><small><Translation id="shooter.appliesToTheBubbleLayerOnly" /></small></span>
          <input aria-label={translateUi("shooter.frogSleepBubbleColor")} onChange={(event) => editor.updateSelectedCreature({ bubbleColor: event.target.value })} type="color" value={creature.bubbleColor} />
        </label>
      </div>
      <div className="mapEditColorPresets" aria-label={translateUi("shooter.frogColorPresets")}>
        <span><strong><Translation id="originalUi.curatedColor" /></strong><small><Translation id="shooter.applyHueSaturationBrightnessAndBubbleColorTogether" /></small></span>
        <div>
          {AMBIENT_CREATURE_COLOR_PRESETS.map((preset) => (
            <button
              aria-label={localizeUi(translateUi("shooter.applyValue1Colors", { value1: preset.label }))}
              className={creature.bodyColor === preset.bodyColor ? "active" : ""}
              key={preset.id}
              onClick={() => applyColorPreset(preset)}
              style={{ "--preset-body": preset.bodyColor, "--preset-bubble": preset.bubbleColor }}
              type="button"
            >
              <i aria-hidden="true" />
              <span>{localizeUi(preset.label)}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.bodyTintStrength" /></b><strong>{Math.round(creature.bodySaturation * 100)}%</strong></span>
        <input aria-label={translateUi("shooter.sleepyFrogTintStrength")} max="1.8" min="0.45" onChange={(event) => updateNumber("bodySaturation", event.target.value)} step="0.05" type="range" value={creature.bodySaturation} />
      </label>
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.bodyBrightness" /></b><strong>{Math.round(creature.bodyBrightness * 100)}%</strong></span>
        <input aria-label={translateUi("shooter.sleepyFrogBrightness")} max="1.45" min="0.55" onChange={(event) => updateNumber("bodyBrightness", event.target.value)} step="0.05" type="range" value={creature.bodyBrightness} />
      </label>

      <div className="mapEditAnchorHeader">
        <span><strong><Translation id="originalUi.sleepingSpot" /></strong><small><Translation id="shooter.saveTheGroundContactPointOnRocksLilyPadsBridgesOrThe" /></small></span>
      </div>
      {anchor ? (
        <div className="mapEditAnchorList">
          <div className="mapEditAnchorRow">
            <i><Translation id="originalUi.a" /></i>
            <label className="mapEditAnchorSurface">
              <span><Translation id="shooter.landing" /></span>
              <select
                aria-label={translateUi("shooter.sleepyFrogLandingObject")}
                onChange={(event) => editor.attachSelectedCreatureAnchor(anchor.id, event.target.value)}
                value={anchor.surfaceInstanceId ?? ""}
              >
                <option disabled value=""><Translation id="shooter.chooseRockLilyPadBridgeOrDock" /></option>
                {editor.landingSurfaces.map((surface) => (
                  <option key={surface.instanceId} value={surface.instanceId}>{localizeUi(surface.label)}</option>
                ))}
              </select>
            </label>
            <label><span><Translation id="originalUi.xMapeditpanelSpaced" /></span><input aria-label={translateUi("shooter.sleepyFrogXCoordinate")} onChange={(event) => updateAnchorPixel("x", event.target.value)} step="1" type="number" value={Math.round(anchor.x * viewport.width)} /></label>
            <label><span><Translation id="originalUi.y" /></span><input aria-label={translateUi("shooter.sleepyFrogYCoordinate")} onChange={(event) => updateAnchorPixel("y", event.target.value)} step="1" type="number" value={Math.round(anchor.y * viewport.height)} /></label>
            <span className="mapEditAnchorNudges" aria-label={translateUi("shooter.nudgeSleepyFrogPosition")}>
              <small><Translation id="shooter.movePointABy1Px" /></small>
              <button aria-label={translateUi("shooter.sleepyFrogLeft1Pixel")} onClick={() => nudgeAnchor(-1, 0)} type="button">←</button>
              <button aria-label={translateUi("shooter.sleepyFrogUp1Pixel")} onClick={() => nudgeAnchor(0, -1)} type="button">↑</button>
              <button aria-label={translateUi("shooter.sleepyFrogDown1Pixel")} onClick={() => nudgeAnchor(0, 1)} type="button">↓</button>
              <button aria-label={translateUi("shooter.sleepyFrogRight1Pixel")} onClick={() => nudgeAnchor(1, 0)} type="button">→</button>
            </span>
          </div>
        </div>
      ) : null}

      <label className="mapEditCreatureToggle">
        <span><strong><Translation id="shooter.sleepBubble" /></strong><small><Translation id="shooter.anIndependentLayerSeparateFromTheFrog" /></small></span>
        <input
          aria-label={translateUi("shooter.showFrogSleepBubble")}
          checked={creature.bubbleEnabled}
          onChange={(event) => editor.updateSelectedCreature({ bubbleEnabled: event.target.checked })}
          type="checkbox"
        />
      </label>
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.bubbleBaseSize" /></b><strong>{creature.bubbleBaseScale.toFixed(2)}×</strong></span>
        <input aria-label={translateUi("shooter.frogBubbleBaseSize")} max="1.5" min="0.45" onChange={(event) => updateNumber("bubbleBaseScale", event.target.value)} step="0.05" type="range" value={creature.bubbleBaseScale} />
      </label>
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.bubbleMaximumSize" /></b><strong>{creature.bubbleMaxScale.toFixed(2)}×</strong></span>
        <input aria-label={translateUi("shooter.frogBubbleMaximumSize")} max="3" min="1.2" onChange={(event) => updateNumber("bubbleMaxScale", event.target.value)} step="0.05" type="range" value={creature.bubbleMaxScale} />
      </label>
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.bubbleBreathingSpeed" /></b><strong>{creature.bubbleSpeed.toFixed(2)}×</strong></span>
        <input aria-label={translateUi("shooter.frogBubbleBreathingSpeed")} max="2" min="0.4" onChange={(event) => updateNumber("bubbleSpeed", event.target.value)} step="0.05" type="range" value={creature.bubbleSpeed} />
      </label>
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.bubbleOpacity" /></b><strong>{Math.round(creature.bubbleOpacity * 100)}%</strong></span>
        <input aria-label={translateUi("shooter.frogBubbleOpacity")} max="1" min="0.2" onChange={(event) => updateNumber("bubbleOpacity", event.target.value)} step="0.02" type="range" value={creature.bubbleOpacity} />
      </label>
    </EditorSection>
  );
}

function BabyDragonControls({ creature, editor }) {
  useLanguage();
  const updateNumber = (key, value) => {
    const number = Number(value);
    if (Number.isFinite(number)) editor.updateSelectedCreature({ [key]: number });
  };

  return (
    <EditorSection title={translateUi("shooter.lavaCanyonBabyDragon")} value="AMBIENT CREATURE">
      <label className="mapEditCreatureToggle">
        <span><strong><Translation id="shooter.ambientBehavior" /></strong><small><Translation id="shooter.playsRestingDozingSleepingAndOccasionalFireBreath" /></small></span>
        <input
          aria-label={translateUi("shooter.babyDragonAmbientBehavior")}
          checked={creature.enabled}
          onChange={(event) => editor.updateSelectedCreature({ enabled: event.target.checked })}
          type="checkbox"
        />
      </label>

      <div className="mapEditCoordinateGrid">
        <label className="mapEditField">
          <span><Translation id="shooter.averageBehaviorIntervalS" /></span>
          <input aria-label={translateUi("shooter.babyDragonBehaviorInterval")} max="20" min="3" onChange={(event) => updateNumber("idleInterval", event.target.value)} step="0.1" type="number" value={creature.idleInterval} />
        </label>
        <label className="mapEditField">
          <span><Translation id="shooter.sleepDurationS" /></span>
          <input aria-label={translateUi("shooter.babyDragonSleepDuration")} max="24" min="2" onChange={(event) => updateNumber("sleepDuration", event.target.value)} step="0.1" type="number" value={creature.sleepDuration} />
        </label>
      </div>

      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.fireBreathProbability" /></b><strong>{Math.round(creature.breathChance * 100)}%</strong></span>
        <input aria-label={translateUi("shooter.babyDragonFireBreathProbability")} max="0.5" min="0.03" onChange={(event) => updateNumber("breathChance", event.target.value)} step="0.01" type="range" value={creature.breathChance} />
      </label>
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.lyingSleepProbability" /></b><strong>{Math.round(creature.sleepChance * 100)}%</strong></span>
        <input aria-label={translateUi("shooter.babyDragonSleepProbability")} max="0.75" min="0" onChange={(event) => updateNumber("sleepChance", event.target.value)} step="0.01" type="range" value={creature.sleepChance} />
      </label>
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.animationSpeed" /></b><strong>{creature.animationSpeed.toFixed(2)}×</strong></span>
        <input aria-label={translateUi("shooter.babyDragonAnimationSpeed")} max="2.5" min="0.4" onChange={(event) => updateNumber("animationSpeed", event.target.value)} step="0.05" type="range" value={creature.animationSpeed} />
      </label>

      <div className="mapEditCreaturePreview" aria-label={translateUi("shooter.previewBabyDragonAnimation")}>
        <span><strong><Translation id="shooter.previewAnimation" /></strong><small><Translation id="shooter.playsInPreviewOnlySavedValuesStayUnchangedMapEditPanel" /></small></span>
        <div>
          {BABY_DRAGON_PREVIEW_MODES.map((mode) => (
            <button
              aria-pressed={editor.creaturePreviewMode === mode.id}
              className={editor.creaturePreviewMode === mode.id ? "active" : ""}
              key={mode.id}
              onClick={() => editor.previewSelectedCreature(mode.id)}
              type="button"
            >{localizeUi(mode.label)}</button>
          ))}
          <button
            aria-label={translateUi("shooter.stopBabyDragonAnimationPreview")}
            className="mapEditCreaturePreviewStop"
            disabled={!editor.creaturePreviewMode}
            onClick={() => editor.previewSelectedCreature("")}
            type="button"
          ><Translation id="app.stopApp" /></button>
        </div>
      </div>
    </EditorSection>
  );
}

function FrogCreatureControls({ editor }) {
  useLanguage();
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
    <EditorSection title={isDivingFrog ? translateUi("shooter.divingFrogSettings") : translateUi("shooter.frogMovementSettings")} value="AMBIENT CREATURE">
      <label className="mapEditCreatureToggle">
        <span><strong>{isDivingFrog ? translateUi("shooter.repeatDives") : translateUi("shooter.hopping")}</strong><small><Translation id="shooter.whenOffStaysAtTheDefaultPosition" /></small></span>
        <input
          aria-label={translateUi("shooter.frogMovement")}
          checked={creature.enabled}
          onChange={(event) => editor.updateSelectedCreature({ enabled: event.target.checked })}
          type="checkbox"
        />
      </label>

      <div className="mapEditCoordinateGrid">
        {!isDivingFrog ? (
          <label className="mapEditField">
            <span><Translation id="shooter.movementOrder" /></span>
            <select aria-label={translateUi("shooter.frogJumpOrder")} onChange={(event) => editor.updateSelectedCreature({ mode: event.target.value })} value={creature.mode}>
              {FROG_MOVEMENT_MODES.map((option) => <option key={option.id} value={option.id}>{localizeUi(option.label)}</option>)}
            </select>
          </label>
        ) : null}
        <label className="mapEditField">
          <span>{isDivingFrog ? translateUi("shooter.diveIntervalS") : translateUi("shooter.jumpIntervalS")}</span>
          <input aria-label={isDivingFrog ? translateUi("shooter.frogDiveInterval") : translateUi("shooter.frogJumpInterval")} max="20" min="1" onChange={(event) => updateNumber("jumpInterval", event.target.value)} step="0.1" type="number" value={creature.jumpInterval} />
        </label>
      </div>

      {!isDivingFrog ? (
        <label className="mapEditRangeField">
          <span><b><Translation id="shooter.maximumTravelDistance" /></b><strong>{Math.round(creature.jumpDistance * viewport.width)}<Translation id="originalUi.px" /></strong></span>
          <input aria-label={translateUi("shooter.frogJumpDistance")} max="1.5" min="0.04" onChange={(event) => updateNumber("jumpDistance", event.target.value)} step="0.01" type="range" value={creature.jumpDistance} />
        </label>
      ) : null}
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.jumpHeight" /></b><strong>{Math.round(creature.jumpHeight * viewport.height)}<Translation id="originalUi.px" /></strong></span>
        <input aria-label={translateUi("shooter.frogJumpHeight")} max="0.3" min="0.02" onChange={(event) => updateNumber("jumpHeight", event.target.value)} step="0.01" type="range" value={creature.jumpHeight} />
      </label>
      <label className="mapEditRangeField">
        <span><b><Translation id="shooter.animationSpeed" /></b><strong>{creature.animationSpeed.toFixed(2)}×</strong></span>
        <input aria-label={translateUi("shooter.frogAnimationSpeed")} max="3" min="0.25" onChange={(event) => updateNumber("animationSpeed", event.target.value)} step="0.05" type="range" value={creature.animationSpeed} />
      </label>

      <div className="mapEditAnchorHeader">
        <span><strong>{isDivingFrog ? "Dive Route Points" : "Frog Anchor Points"}</strong><small><Translation id="shooter.dragPointsDirectlyInPreview" /></small></span>
        {!isDivingFrog ? <button disabled={creature.anchors.length >= 20} onClick={editor.addSelectedCreatureAnchor} type="button"><Translation id="shooter.point" /></button> : null}
      </div>
      <div className="mapEditAnchorList">
        {creature.anchors.map((anchor, index) => {
          const isWaterPoint = isDivingFrog && anchor.kind === "water";
          return (
          <div className={`mapEditAnchorRow ${isWaterPoint ? "mapEditAnchorRow--water" : ""}`} key={anchor.id}>
            <i>{String.fromCharCode(65 + index)}</i>
            {isWaterPoint ? (
              <span className="mapEditAnchorSurface mapEditAnchorSurface--water"><span><Translation id="shooter.waterEntry" /></span><b><Translation id="shooter.freePositionOnWater" /></b></span>
            ) : (
              <label className="mapEditAnchorSurface">
                <span>{isDivingFrog ? translateUi("shooter.start") : translateUi("shooter.landing")}</span>
                <select
                  aria-label={translateUi("shooter.frogPointValue1LandingObject", { value1: index + 1 })}
                  onChange={(event) => editor.attachSelectedCreatureAnchor(anchor.id, event.target.value)}
                  value={anchor.surfaceInstanceId ?? ""}
                >
                  <option disabled value=""><Translation id="shooter.chooseRockLilyPadOrBridge" /></option>
                  {editor.landingSurfaces.map((surface) => (
                    <option key={surface.instanceId} value={surface.instanceId}>{localizeUi(surface.label)}</option>
                  ))}
                </select>
              </label>
            )}
            <label><span><Translation id="originalUi.xMapeditpanelSpaced" /></span><input aria-label={translateUi("shooter.frogPointValue1XCoordinate", { value1: index + 1 })} onChange={(event) => updateAnchorPixel(anchor, "x", event.target.value)} step="1" type="number" value={Math.round(anchor.x * viewport.width)} /></label>
            <label><span><Translation id="originalUi.y" /></span><input aria-label={translateUi("shooter.frogPointValue1YCoordinate", { value1: index + 1 })} onChange={(event) => updateAnchorPixel(anchor, "y", event.target.value)} step="1" type="number" value={Math.round(anchor.y * viewport.height)} /></label>
            <button aria-label={translateUi("shooter.deleteFrogPointValue1", { value1: index + 1 })} disabled={isDivingFrog || creature.anchors.length <= 1} onClick={() => editor.removeSelectedCreatureAnchor(anchor.id)} type="button">×</button>
            <span className="mapEditAnchorNudges" aria-label={translateUi("shooter.nudgeFrogPointValue1", { value1: index + 1 })}>
              <small>{String.fromCharCode(65 + index)}<Translation id="shooter.pointMove1Px" /></small>
              <button aria-label={translateUi("shooter.pointValue1Left1Pixel", { value1: String.fromCharCode(65 + index) })} onClick={() => nudgeAnchor(anchor, -1, 0)} type="button">←</button>
              <button aria-label={translateUi("shooter.pointValue1Up1Pixel", { value1: String.fromCharCode(65 + index) })} onClick={() => nudgeAnchor(anchor, 0, -1)} type="button">↑</button>
              <button aria-label={translateUi("shooter.pointValue1Down1Pixel", { value1: String.fromCharCode(65 + index) })} onClick={() => nudgeAnchor(anchor, 0, 1)} type="button">↓</button>
              <button aria-label={translateUi("shooter.pointValue1Right1Pixel", { value1: String.fromCharCode(65 + index) })} onClick={() => nudgeAnchor(anchor, 1, 0)} type="button">→</button>
            </span>
          </div>
        );})}
      </div>
    </EditorSection>
  );
}

function ObjectActionBar({ editor }) {
  useLanguage();
  return (
    <EditorSection title={translateUi("shooter.selectedObjectActions")} value="OBJECT ACTIONS">
      <div className="mapEditObjectActionBar">
        <button onClick={() => editor.moveSelectedLayer("front")} type="button"><span aria-hidden="true">↑</span><b><Translation id="shooter.bringForward" /></b></button>
        <button onClick={() => editor.moveSelectedLayer("back")} type="button"><span aria-hidden="true">↓</span><b><Translation id="shooter.sendBackward" /></b></button>
        <button disabled={!editor.canDuplicateSelected} onClick={editor.duplicateSelected} type="button"><span aria-hidden="true">⧉</span><b><Translation id="app.duplicate" /></b></button>
        <button aria-label={translateUi("shooter.deleteSelectedObject")} className="danger" onClick={editor.deleteSelected} type="button"><span aria-hidden="true">×</span><b><Translation id="common.delete" /></b></button>
      </div>
      <p className="mapEditDeleteHint"><kbd><Translation id="originalUi.delete" /></kbd><Translation id="shooter.alsoDeletesRestoreWith" /><kbd><Translation id="originalUi.ctrl" /></kbd>+<kbd><Translation id="originalUi.z" /></kbd><Translation id="shooter.label" /></p>
    </EditorSection>
  );
}

function AdvancedObjectTools({ editor }) {
  useLanguage();
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
      <summary><span><Translation id="shooter.freePlanarAndPerspectiveTransform" /></span><small><Translation id="originalUi.freeTransform" /></small></summary>
      <div className="mapEditAdvancedSectionBody">
        <p className="mapEditPerspectiveHelp"><Translation id="shooter.dragTheFourTealCornersInPreviewToFitTheGroundPlane" /></p>
        <label className="mapEditRangeField">
          <span><b><Translation id="shooter.rotationInPlane" /></b><strong>{Math.round(selected.rotation)}°</strong></span>
          <span className="mapEditRangeControl">
            <input aria-label={translateUi("shooter.objectRotation")} max="180" min="-180" onChange={(event) => updateNumber("rotation", event.target.value)} step="1" type="range" value={selected.rotation} />
            <input aria-label={translateUi("shooter.objectRotationAngle")} max="180" min="-180" onChange={(event) => updateNumber("rotation", event.target.value)} step="1" type="number" value={selected.rotation} />
          </span>
        </label>
        <div className="mapEditTransformGrid">
          <label className="mapEditField">
            <span><Translation id="shooter.scaleXHorizontal" /></span>
            <input aria-label={translateUi("shooter.objectHorizontalScale")} max="300" min="-300" onChange={(event) => updatePercent("scaleX", event.target.value)} step="1" type="number" value={Math.round(selected.scaleX * 100)} />
          </label>
          <label className="mapEditField">
            <span><Translation id="shooter.scaleYVertical" /></span>
            <input aria-label={translateUi("shooter.objectVerticalScale")} max="300" min="-300" onChange={(event) => updatePercent("scaleY", event.target.value)} step="1" type="number" value={Math.round(selected.scaleY * 100)} />
          </label>
          <label className="mapEditField">
            <span><Translation id="originalUi.skewX" /></span>
            <input aria-label={translateUi("shooter.objectXSkew")} max="60" min="-60" onChange={(event) => updateNumber("skewX", event.target.value)} step="1" type="number" value={selected.skewX} />
          </label>
          <label className="mapEditField">
            <span><Translation id="originalUi.skewY" /></span>
            <input aria-label={translateUi("shooter.objectYSkew")} max="60" min="-60" onChange={(event) => updateNumber("skewY", event.target.value)} step="1" type="number" value={selected.skewY} />
          </label>
        </div>
        <div className="mapEditMirrorGrid">
          <button onClick={() => editor.updateSelected({ scaleX: selected.scaleX * -1 })} type="button"><Translation id="shooter.flipHorizontal" /></button>
          <button onClick={() => editor.updateSelected({ scaleY: selected.scaleY * -1 })} type="button"><Translation id="shooter.flipVertical" /></button>
        </div>
        <label className="mapEditRangeField">
          <span><b><Translation id="shooter.tiltXFrontBack" /></b><strong>{Math.round(selected.tiltX)}°</strong></span>
          <span className="mapEditRangeControl">
            <input aria-label={translateUi("shooter.objectFrontBackPerspectiveTilt")} max="88" min="-88" onChange={(event) => updateNumber("tiltX", event.target.value)} step="1" type="range" value={selected.tiltX} />
            <input aria-label={translateUi("shooter.objectFrontBackPerspectiveAngle")} max="88" min="-88" onChange={(event) => updateNumber("tiltX", event.target.value)} step="1" type="number" value={selected.tiltX} />
          </span>
        </label>
        <label className="mapEditRangeField">
          <span><b><Translation id="shooter.tiltYLeftRight" /></b><strong>{Math.round(selected.tiltY)}°</strong></span>
          <span className="mapEditRangeControl">
            <input aria-label={translateUi("shooter.objectLeftRightPerspectiveTilt")} max="88" min="-88" onChange={(event) => updateNumber("tiltY", event.target.value)} step="1" type="range" value={selected.tiltY} />
            <input aria-label={translateUi("shooter.objectLeftRightPerspectiveAngle")} max="88" min="-88" onChange={(event) => updateNumber("tiltY", event.target.value)} step="1" type="number" value={selected.tiltY} />
          </span>
        </label>
        <label className="mapEditRangeField">
          <span><b><Translation id="shooter.perspectiveDistance" /></b><strong>{Math.round(selected.perspective)}<Translation id="originalUi.px" /></strong></span>
          <span className="mapEditRangeControl">
            <input aria-label={translateUi("shooter.objectPerspectiveDistance")} max="3000" min="80" onChange={(event) => updateNumber("perspective", event.target.value)} step="10" type="range" value={selected.perspective} />
            <input aria-label={translateUi("shooter.objectPerspectiveDistanceValue")} max="3000" min="80" onChange={(event) => updateNumber("perspective", event.target.value)} step="10" type="number" value={selected.perspective} />
          </span>
        </label>
        <div className="mapEditCornerSummary">
          <span><b><Translation id="originalUi.4CornerDistort" /></b><small><Translation id="shooter.dragTlTrBrBlIndependently" /></small></span>
          <button onClick={resetCorners} type="button"><Translation id="shooter.resetCorners" /></button>
        </div>
        <div className="mapEditCoordinateGrid">
          <label className="mapEditField">
            <span><Translation id="originalUi.animation" /></span>
            <select aria-label={translateUi("shooter.ambientAnimation")} onChange={(event) => editor.updateSelected({ animation: event.target.value })} value={selected.animation}>
              {MAP_EDIT_ANIMATION_TYPES.map((option) => (
                <option key={option.id} value={option.id}>{localizeUi(option.label)}</option>
              ))}
            </select>
          </label>
          <label className="mapEditField">
            <span><Translation id="originalUi.speed" /></span>
            <input aria-label={translateUi("shooter.ambientAnimationSpeed")} max="5" min="0.1" onChange={(event) => updateNumber("animationSpeed", event.target.value)} step="0.1" type="number" value={selected.animationSpeed} />
          </label>
        </div>
      </div>
    </details>
  );
}

function AdvancedAssetLibrary({ editor }) {
  useLanguage();
  const instanceCounts = useMemo(() => editor.placements.reduce((counts, placement) => {
    counts.set(placement.assetId, (counts.get(placement.assetId) ?? 0) + 1);
    return counts;
  }, new Map()), [editor.placements]);

  return (
    <details className="mapEditAdvancedSection mapEditAdvancedSection--library">
      <summary><span><Translation id="shooter.addNewObject" /></span><small><Translation id="shooter.onlyWhenNeeded" /></small></summary>
      <div className="mapEditAdvancedSectionBody">
        <p className="mapEditInlineLibraryHelp"><Translation id="shooter.useWhenYouNeedObjectsBeyondTheDefaultLayout" /></p>
        <div className="mapEditInlineLibraryGrid">
          {editor.assetCatalog.map((asset) => {
            const instanceCount = instanceCounts.get(asset.id) ?? 0;
            const reachedLimit = Number.isFinite(asset.maxInstances) && instanceCount >= asset.maxInstances;
            return (
              <button
                aria-label={localizeUi(reachedLimit ? translateUi("shooter.chooseValue1Placement", { value1: asset.label }) : translateUi("shooter.addValue1Object", { value1: asset.label }))}
                className="mapEditInlineAssetCard"
                key={asset.id}
                onClick={() => editor.addAsset(asset.id)}
                type="button"
              >
                <span>
                  <AssetPreview asset={asset} />
                  <i>{reachedLimit ? translateUi("shooter.placed") : instanceCount}</i>
                </span>
                <strong>{localizeUi(asset.label)}</strong>
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function MapEditControls({ editor, effectEditor, monsterEditor }) {
  useLanguage();
  return (
    <div className="mapEditControls mapEditControls--desktop">
      <MonsterTuningControls monsterEditor={monsterEditor} />
      <EffectTuningControls effectEditor={effectEditor} />
      <InstalledObjectSelector editor={editor} />
      <div className="mapEditHistoryToolbar" aria-label={translateUi("shooter.editHistory")}>
        <span><strong><Translation id="shooter.editHistory" /></strong><small><kbd><Translation id="originalUi.ctrl" /></kbd>+<kbd><Translation id="originalUi.z" /></kbd><Translation id="shooter.undo" /><kbd><Translation id="originalUi.ctrl" /></kbd>+<kbd><Translation id="originalUi.shift" /></kbd>+<kbd><Translation id="originalUi.z" /></kbd><Translation id="shooter.redo" /></small></span>
        <button disabled={!editor.canUndo} onClick={editor.undoEditing} type="button"><Translation id="shooter.undoMapEditPanel" /></button>
        <button disabled={!editor.canRedo} onClick={editor.redoEditing} type="button"><Translation id="shooter.redoMapEditPanel" /></button>
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
        <p className="mapEditEmptyState"><Translation id="shooter.clickAnObjectInPreviewOrChooseItFromThePlacementList" /></p>
      )}
      <AdvancedAssetLibrary editor={editor} />
    </div>
  );
}

function MapEditSessionActions({ editor, effectEditor, monsterEditor }) {
  useLanguage();
  const hasChanges = editor.hasChanges || Boolean(effectEditor?.hasChanges) || Boolean(monsterEditor?.hasChanges);
  const statusLabel = editor.saveStatus === "error" && editor.saveError
    ? editor.saveError
    : monsterEditor?.hasUnsharedTunings
      ? ko["shooter.thisBrowserSEnemyAdjustmentsHaveNotYetBeenIncludedInThe"]
      : hasChanges
        ? editor.saveStatus === "saving" ? SAVE_STATUS_LABELS.saving : ko["shooter.youHaveUnappliedChangesMapeditpanel"]
        : ko["shooter.matchesTheAppliedLayout"];
  const closeEditing = () => {
    effectEditor?.cancelEditing();
    monsterEditor?.cancelEditing();
    editor.closeEditing();
  };
  const applyEditing = () => editor.applyEditing(async () => {
    if (effectEditor?.hasChanges && await effectEditor.applyEditing() === false) return false;
    if (monsterEditor?.hasChanges && await monsterEditor.applyEditing() === false) return false;
    return true;
  });
  return (
    <footer className="mapEditSessionActions">
      <span>
        <i className={hasChanges ? "dirty" : "clean"} aria-hidden="true" />
        <small className={`mapEditSaveStatus mapEditSaveStatus--${editor.saveStatus}`}>
          {localizeUi(statusLabel)}
        </small>
      </span>
      <div>
        <button className="mapEditSelectionCancelButton" disabled={!editor.selectedPlacement || editor.saveStatus === "saving"} onClick={() => editor.selectInstance("")} type="button"><Translation id="shooter.deselect" /></button>
        <button aria-label={translateUi("shooter.closeMapEditorWithoutSaving")} className="mapEditCloseButton" disabled={editor.saveStatus === "saving"} onClick={closeEditing} type="button"><Translation id="common.close" /></button>
        <button className="mapEditApplyButton" disabled={editor.saveStatus === "saving"} onClick={applyEditing} type="button">
          {editor.saveStatus === "saving" ? translateUi("shooter.applying") : translateUi("app.apply")}
        </button>
      </div>
    </footer>
  );
}

function MapEditMapSwitcher({ editor, mapOptions, onMapChange }) {
  useLanguage();
  const options = Array.isArray(mapOptions) ? mapOptions.filter(isEditableShooterMap) : [];
  const selectedIndex = Math.max(0, options.findIndex((map) => map.id === editor.skin.id));
  const switchBy = (offset) => {
    if (options.length < 2 || typeof onMapChange !== "function") return;
    const nextIndex = (selectedIndex + offset + options.length) % options.length;
    onMapChange(options[nextIndex].id);
  };

  return (
    <section className="mapEditMapSwitcher" aria-label={translateUi("shooter.changeMapToEdit")}>
      <span><small><Translation id="originalUi.editingMap" /></small><strong><Translation id="shooter.compareMaps" /></strong><em><Translation id="shooter.temporaryLayoutsAreKeptForThisSessionWhenSwitchingMaps" /></em></span>
      <div>
        <button aria-label={translateUi("shooter.editPreviousMap")} disabled={options.length < 2 || editor.saveStatus === "saving"} onClick={() => switchBy(-1)} type="button">‹</button>
        <select
          aria-label={translateUi("shooter.gameMapToEdit")}
          disabled={editor.saveStatus === "saving"}
          onChange={(event) => onMapChange?.(event.target.value)}
          value={editor.skin.id}
        >
          {options.map((map) => <option key={map.id} value={map.id}>{localizeUi(map.label)}</option>)}
        </select>
        <button aria-label={translateUi("shooter.editNextMap")} disabled={options.length < 2 || editor.saveStatus === "saving"} onClick={() => switchBy(1)} type="button">›</button>
      </div>
    </section>
  );
}

function DesktopMapEditPanel({ editor, effectEditor, mapOptions, monsterEditor, onMapChange }) {
  useLanguage();
  const viewport = getReferenceViewport(editor);
  return (
    <aside className="mapEditPanel mapEditPanel--desktop" onClick={(event) => event.stopPropagation()}>
      <header className="mapEditPanelHeader">
        <span className="mapEditPanelBrand" aria-hidden="true"><Translation id="originalUi.jp" /></span>
        <span className="mapEditPanelHeading"><span><Translation id="originalUi.fretivaLabMapStudio" /></span><strong>{localizeUi(editor.skin.label)}</strong><small>{viewport.width} × {viewport.height}<Translation id="originalUi.livePreview" /></small></span>
        <i className="mapEditDevBadge"><Translation id="originalUi.tune" /></i>
      </header>
      <MapEditMapSwitcher editor={editor} mapOptions={mapOptions} onMapChange={onMapChange} />
      <div className="mapEditPanelScroll"><MapEditControls effectEditor={effectEditor} editor={editor} monsterEditor={monsterEditor} /></div>
      <MapEditSessionActions effectEditor={effectEditor} editor={editor} monsterEditor={monsterEditor} />
    </aside>
  );
}

export default function MapEditPanel({ effectEditor, editor, layout, mapOptions, monsterEditor, onMapChange }) {
  if (!editor.enabled || layout !== "desktop") return null;
  return (
    <DesktopMapEditPanel
      effectEditor={effectEditor}
      editor={editor}
      mapOptions={mapOptions}
      monsterEditor={monsterEditor}
      onMapChange={onMapChange}
    />
  );
}
