let snapshot = { deviceId: '', channel: null, revision: 0, devices: [], status: 'idle', channelCount: 0, label: '', shooterSource: 'audio' };
const listeners = new Set();
export const getAudioInputSelection = () => snapshot;
export const subscribeAudioInput = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export function publishAudioInput(patch) { snapshot = { ...snapshot, ...patch }; listeners.forEach(fn => fn()); }
export function selectAudioInput(deviceId) { publishAudioInput({ deviceId, channel: null, channelCount: 0, revision: snapshot.revision + 1 }); }
export function selectAudioChannel(channel) { publishAudioInput({ channel, revision: snapshot.revision + 1 }); }
export function retryAudioInput() { publishAudioInput({ revision: snapshot.revision + 1 }); }
export function selectShooterSource(shooterSource) { publishAudioInput({ shooterSource }); }
export async function refreshAudioDevices(mediaDevices = globalThis.navigator?.mediaDevices) {
  try {
    if (!mediaDevices?.enumerateDevices) return;
    const devices = (await mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput');
    const removed = snapshot.deviceId && snapshot.status === 'connected'
      && snapshot.devices.some(d => d.deviceId === snapshot.deviceId)
      && !devices.some(d => d.deviceId === snapshot.deviceId);
    publishAudioInput({ devices, ...(removed ? { status: 'disconnected', channelCount: 0 } : {}) });
  } catch { /* Enumeration must not disable the default microphone. */ }
}
export function audioInputError(error) {
  if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(error?.name)) return 'denied';
  if (['NotFoundError', 'OverconstrainedError'].includes(error?.name)) return 'disconnected';
  return 'error';
}
