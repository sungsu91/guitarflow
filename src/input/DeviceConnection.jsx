import { useEffect, useState } from 'react';
import { useAudioInputSelection, useMidiConnection } from './useInputSelection.js';
import { refreshAudioDevices, retryAudioInput, selectAudioChannel, selectAudioInput, selectShooterSource } from './audioInputSelection.js';
import { getActiveMicInputSession } from '../audio/micInputEngine.js';
import './device-connection.css';

const audioStatus = { idle: '입력 대기', requesting: '연결 중', connected: '연결됨', denied: '권한 거부 · 사이트 설정에서 마이크 권한을 허용하세요.', disconnected: '장치 연결 해제 · 다시 연결하거나 다른 입력을 선택하세요.', error: '입력을 열 수 없습니다. 다른 앱의 장치 사용 여부를 확인하세요.' };

function ConnectionControls({ scope }) {
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
    {scope === 'shooter' && <label>게임 입력<select aria-label="게임 입력 방식" value={audio.shooterSource} onChange={e => selectShooterSource(e.target.value)}>
      <option value="audio">오디오 · 마이크 / USB</option><option value="midi" disabled={!midi.supported}>MIDI 입력{!midi.supported ? ' · 미지원' : ''}</option>
    </select></label>}
    {isAudio ? <fieldset><legend>오디오 입력</legend>
      <label>입력 장치<select aria-label="오디오 입력 장치" value={audio.deviceId} onChange={e => selectAudioInput(e.target.value)}>
        <option value="">기본 마이크</option>
        {audio.deviceId && !audio.devices.some(d => d.deviceId === audio.deviceId) && <option value={audio.deviceId}>선택 장치 · 연결 해제</option>}
        {audio.devices.filter(d => d.deviceId && d.deviceId !== 'default').map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `오디오 입력 ${i + 1}`}</option>)}
      </select></label>
      {audio.status === 'connected' && audio.channelCount > 1 && <label>입력 채널<select aria-label="오디오 입력 채널" value={audio.channel ?? ''} onChange={e => selectAudioChannel(e.target.value === '' ? null : Number(e.target.value))}>
        <option value="">전체 · 모노 합산</option>{Array.from({ length: audio.channelCount }, (_, i) => <option key={i} value={i}>채널 {i + 1}</option>)}
      </select></label>}
      <p role="status">{audioStatus[audio.status]}{audio.status === 'connected' && audio.label ? ` · ${audio.label}` : ''}</p>
      <label className="deviceInputMeter">입력 레벨<meter aria-label="오디오 입력 레벨" min="0" max="1" value={level?.normalized ?? 0} /></label>
      <output className={level?.clipping ? 'deviceInputClip' : ''} aria-live="polite">{level?.clipping ? '클리핑 · 인터페이스 입력 게인을 낮추세요.' : level ? `${Math.round(level.rmsDb)} dBFS` : '신호 대기'}</output>
      {['denied', 'disconnected', 'error', 'idle'].includes(audio.status) && <button type="button" onClick={retryAudioInput}>다시 연결</button>}
      <small>단음 인식 · 실제 제공되는 채널만 표시됩니다.</small>
    </fieldset> : <fieldset><legend>MIDI 입력</legend>
      <button type="button" disabled={!midi.supported} onClick={midi.connect}>장치 연결</button>
      <p role="status">{midi.supported ? midi.status : '이 브라우저에서는 MIDI 입력을 지원하지 않습니다.'}</p>
      {midi.devices.length > 0 && <label>입력 장치<select aria-label="MIDI 입력 장치" value={midi.selected} onChange={e => midi.setSelected(e.target.value)}>
        <option value="">장치 선택</option>{midi.selected && !midi.devices.some(d => d.id === midi.selected) && <option value={midi.selected}>선택 장치 · 연결 해제</option>}{midi.devices.map(d => <option key={d.id} value={d.id}>{d.name ?? d.id}</option>)}
      </select></label>}
      <small>{scope === 'score' ? '설정을 닫고 악보를 선택한 뒤 입력하세요. 70ms 이내 겹친 음은 화음으로 묶고 선택 음길이로 이동합니다.' : '새 Note On으로 판정합니다. 음을 뗀 뒤 다시 연주하면 새 타격입니다.'}</small>
      <small>모든 MIDI 채널 수신 · 줄 자동 식별 및 피치벤드 미지원</small>
      {scope === 'score' && <small>오디오 입력은 튜너·게임에서 사용할 수 있습니다.</small>}
    </fieldset>}
  </>;
}

export default function DeviceConnection({ scope, mobile = false }) {
  const [open, setOpen] = useState(false);
  const controls = open ? <ConnectionControls scope={scope} /> : null;
  return <details className="deviceConnection" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>장치 연결</summary>
    {mobile ? <div className="deviceConnectionMobile">{controls}</div> : <div className="deviceConnectionDesktop">{controls}</div>}
  </details>;
}
