import {Translation,useLanguage} from '../i18n/react.jsx';
import {t as translateUi} from '../i18n/core.js';
export default function SharedBpmControls({bpm,bpmControlsDisabled=false,bpmPreviewKey,bpmPreview=false,changeBpmBy,handleBpmPointerDown=()=>{},onBpmButtonPointerCancel,onBpmButtonPointerUp}){
 useLanguage();return <>
      <div className="metronomeBpmAdjustGroup metronomeBpmAdjustGroup--down" aria-label={translateUi("app.decreaseBpm")} role="group">
        <button
          aria-label={translateUi("app.decreaseBpmBy1")}
          className="metronomeHeroBpmButton"
          disabled={bpmControlsDisabled}
          onClick={(event) => changeBpmBy(-1, "bpm-down-1", event)}
          onMouseDown={(event) => event.preventDefault()}
          onPointerCancel={onBpmButtonPointerCancel}
          onPointerDown={(event) => handleBpmPointerDown("bpm-down-1", event)}
          onPointerUp={onBpmButtonPointerUp}
          type="button"
        >
          -
        </button>
        <span className="metronomeBpmAdjustDivider" aria-hidden="true" />
        <button
          aria-label={translateUi("app.decreaseBpmBy10")}
          className="metronomeHeroBpmJumpButton metronomeHeroBpmJumpButton--down"
          disabled={bpmControlsDisabled}
          onClick={(event) => changeBpmBy(-10, "bpm-down-10", event)}
          onMouseDown={(event) => event.preventDefault()}
          onPointerCancel={onBpmButtonPointerCancel}
          onPointerDown={(event) => handleBpmPointerDown("bpm-down-10", event)}
          onPointerUp={onBpmButtonPointerUp}
          type="button"
        >
          -10
        </button>
      </div>
      <div className="metronomeHeroBpmValue">
        <span><Translation id="originalUi.bpm" /></span>
        <strong data-bpm-preview-value={bpmPreviewKey ?? (bpmPreview ? "true" : undefined)}>{bpm}</strong>
      </div>
      <div className="metronomeBpmAdjustGroup metronomeBpmAdjustGroup--up" aria-label={translateUi("app.increaseBpm")} role="group">
        <button
          aria-label={translateUi("app.increaseBpmBy1")}
          className="metronomeHeroBpmButton"
          disabled={bpmControlsDisabled}
          onClick={(event) => changeBpmBy(1, "bpm-up-1", event)}
          onMouseDown={(event) => event.preventDefault()}
          onPointerCancel={onBpmButtonPointerCancel}
          onPointerDown={(event) => handleBpmPointerDown("bpm-up-1", event)}
          onPointerUp={onBpmButtonPointerUp}
          type="button"
        >
          +
        </button>
        <span className="metronomeBpmAdjustDivider" aria-hidden="true" />
        <button
          aria-label={translateUi("app.increaseBpmBy10")}
          className="metronomeHeroBpmJumpButton metronomeHeroBpmJumpButton--up"
          disabled={bpmControlsDisabled}
          onClick={(event) => changeBpmBy(10, "bpm-up-10", event)}
          onMouseDown={(event) => event.preventDefault()}
          onPointerCancel={onBpmButtonPointerCancel}
          onPointerDown={(event) => handleBpmPointerDown("bpm-up-10", event)}
          onPointerUp={onBpmButtonPointerUp}
          type="button"
        >
          +10
        </button>
      </div>
</>;
}
