import ko from "./../i18n/locales/ko.js";
import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import { useEffect, useState } from 'react';
import { useAudioInputSelection, useMidiConnection } from './useInputSelection.js';
import { refreshAudioDevices, retryAudioInput, selectAudioChannel, selectAudioInput, selectShooterSource } from './audioInputSelection.js';
import { getActiveMicInputSession } from '../audio/micInputEngine.js';
import './device-connection.css';

const audioStatus = { idle: ko["input.waitingForInput"], requesting: ko["input.connecting"], connected: ko["input.connected"], denied: ko["input.permissionDeniedAllowMicrophoneAccessInSiteSettings"], disconnected: ko["input.deviceDisconnectedReconnectOrSelectAnotherInput"], error: ko["input.couldnTOpenInputCheckWhetherAnotherAppIsUsingTheDevice"] };

function ConnectionControls({ scope }) {
  useLanguage();
  const midi = useMidiConnection(), audio = useAudioInputSelection();
  const [level, setLevel] = useState(null);
  const isAudio = scope === 'tuner' || (scope === 'shooter' && audio.shooterSource === 'audio');
  useEffect(() => {
    if (!isAudio) return;
    void refreshAudioDevices();
    const update = () => { void refreshAudioDevices(); };
    navigator.mediaDevices?.addEventListener?.('devicechange', update);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', update);
  }, [isAudio]);
  useEffect(() => {
    setLevel(null);
    if (!isAudio || audio.status !== 'connected') return;
    const session = getActiveMicInputSession();
    const expected = scope === 'tuner' ? 'just-play-tuner' : 'shooting-game-detector';
    if (session?.consumerId !== expected) return;
    return session.startLevelMonitoring(setLevel, 80);
  }, [isAudio, audio.status, audio.revision, audio.channelCount, scope]);
  return <>
    {scope === 'shooter' && <label><Translation id="input.gameInput" /><select aria-label={translateUi("input.gameInputMode")} value={audio.shooterSource} onChange={e => selectShooterSource(e.target.value)}>
      <option value="audio"><Translation id="input.audioMicUsb" /></option><option value="midi" disabled={!midi.supported}><Translation id="input.midiInput" />{!midi.supported ? translateUi("input.unsupported") : ''}</option>
    </select></label>}
    {isAudio ? <fieldset><legend><Translation id="input.audioInput" /></legend>
      <label><Translation id="input.inputDevice" /><select aria-label={translateUi("input.audioInputDevice")} value={audio.deviceId} onChange={e => selectAudioInput(e.target.value)}>
        <option value=""><Translation id="input.defaultMicrophone" /></option>
        {audio.deviceId && !audio.devices.some(d => d.deviceId === audio.deviceId) && <option value={audio.deviceId}><Translation id="input.selectedDeviceDisconnected" /></option>}
        {audio.devices.filter(d => d.deviceId && d.deviceId !== 'default').map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || translateUi("input.audioInputValue1", { value1: i + 1 })}</option>)}
      </select></label>
      {audio.status === 'connected' && audio.channelCount > 1 && <label><Translation id="input.inputChannel" /><select aria-label={translateUi("input.audioInputChannel")} value={audio.channel ?? ''} onChange={e => selectAudioChannel(e.target.value === '' ? null : Number(e.target.value))}>
        <option value=""><Translation id="input.allMonoSum" /></option>{Array.from({ length: audio.channelCount }, (_, i) => <option key={i} value={i}><Translation id="input.channel" />{i + 1}</option>)}
      </select></label>}
      <p role="status">{localizeUi(audioStatus[audio.status])}{localizeUi(audio.status === 'connected' && audio.label ? ` · ${audio.label}` : '')}</p>
      <label className="deviceInputMeter"><Translation id="input.inputLevel" /><meter aria-label={translateUi("input.audioInputLevel")} min="0" max="1" value={level?.normalized ?? 0} /></label>
      <output className={level?.clipping ? 'deviceInputClip' : ''} aria-live="polite">{level?.clipping ? translateUi("input.clippingLowerYourInterfaceInputGain") : level ? `${Math.round(level.rmsDb)} dBFS` : translateUi("input.waitingForSignal")}</output>
      {['denied', 'disconnected', 'error', 'idle'].includes(audio.status) && <button type="button" onClick={retryAudioInput}><Translation id="input.reconnect" /></button>}
      <small><Translation id="input.singleNoteDetectionOnlyAvailableChannelsAreShown" /></small>
    </fieldset> : <fieldset><legend><Translation id="input.midiInput" /></legend>
      <button type="button" disabled={!midi.supported} onClick={midi.connect}><Translation id="input.connectDevice" /></button>
      <p role="status">{midi.supported ? midi.status : translateUi("input.thisBrowserDoesNotSupportMidiInput")}</p>
      {midi.devices.length > 0 && <label><Translation id="input.inputDevice" /><select aria-label={translateUi("input.midiInputDevice")} value={midi.selected} onChange={e => midi.setSelected(e.target.value)}>
        <option value=""><Translation id="input.chooseDevice" /></option>{midi.selected && !midi.devices.some(d => d.id === midi.selected) && <option value={midi.selected}><Translation id="input.selectedDeviceDisconnected" /></option>}{midi.devices.map(d => <option key={d.id} value={d.id}>{d.name ?? d.id}</option>)}
      </select></label>}
      <small>{scope === 'score' ? translateUi("input.closeSettingsAndSelectTheScoreBeforePlayingNotesWithin70Ms") : translateUi("input.eachNewNoteOnCountsAsAHitReleaseAndPlayAgain")}</small>
      <small><Translation id="input.allMidiChannelsNoAutomaticStringDetectionOrPitchBend" /></small>
      {scope === 'score' && <small><Translation id="input.audioInputIsAvailableInTheTunerAndGame" /></small>}
    </fieldset>}
  </>;
}

export default function DeviceConnection({ scope, mobile = false }) {
  const [open, setOpen] = useState(false);
  const controls = open ? <ConnectionControls scope={scope} /> : null;
  return <details className="deviceConnection" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary><Translation id="input.connectDevice" /></summary>
    {mobile ? <div className="deviceConnectionMobile">{controls}</div> : <div className="deviceConnectionDesktop">{controls}</div>}
  </details>;
}
