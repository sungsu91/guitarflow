import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
// One connection, exclusive delivery. Channels are never inferred as guitar strings.
export function createMidiInput({ navigator: nav = globalThis.navigator, window: win = globalThis.window, document: doc = globalThis.document } = {}) {
  let state = { devices: [], selected: '', status: ko["input.disconnected"], connected: false };
  let access, port, pending, denied = false, binding = 0, owner = null;
  const listeners = new Set(), consumers = new Set(), down = new Set();
  const supported = () => Boolean(nav?.requestMIDIAccess && win?.isSecureContext);
  const publish = patch => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
  const reset = () => { down.clear(); consumers.forEach(c => c.reset?.()); };
  const chooseOwner = () => [...consumers].reverse().find(c => c.active());
  function route(event) {
    const next = chooseOwner();
    if (owner !== next) { reset(); owner = next; }
    if (!owner || !state.connected || doc?.visibilityState === 'hidden') return;
    const data = Array.from(event.data ?? []), [status, note, velocity] = data;
    if (data.length < 3 || !Number.isInteger(status) || status < 128 || status > 239 || !Number.isInteger(note) || note < 0 || note > 127 || !Number.isInteger(velocity) || velocity < 0 || velocity > 127) return;
    const type = status & 0xf0, channel = (status & 15) + 1;
    if (type !== 0x90 && type !== 0x80) return; // Pitch bend and CC intentionally unsupported.
    const key = `${port.id}:${channel}:${note}`, off = type === 0x80 || velocity === 0;
    if (!off && down.has(key)) return;
    if (off) down.delete(key); else down.add(key);
    owner.message({ type: off ? 'noteoff' : 'noteon', deviceId: port.id, channel, note, velocity, timestamp: event.timeStamp, data });
  }
  async function bind() {
    const version = ++binding;
    reset();
    const previous = port;
    const selected = access?.inputs.get(state.selected);
    port = selected?.state === 'connected' ? selected : null;
    previous?.removeEventListener('midimessage', route);
    if (previous && previous !== port) { try { Promise.resolve(previous.close?.()).catch(() => {}); } catch {} }
    if (!port) { publish({ connected: false, status: ko["input.noDeviceConnectOrChooseAnInputDevice"] }); return; }
    const target = port;
    publish({ connected: false, status: ko["input.connecting"] });
    try {
      await target.open();
      if (version !== binding) return;
      target.addEventListener('midimessage', route);
      publish({ connected: true, status: formatMessage(ko["input.connectedValue1"], { value1: target.name ?? ko["input.midiInput"] }) });
    } catch (error) { if (version === binding) publish({ connected: false, status: formatMessage(ko["input.couldnTOpenDeviceValue1"], { value1: error.message }) }); }
  }
  function update() {
    const devices = [...access.inputs.values()].filter(d => d.state === 'connected');
    publish({ devices, selected: state.selected || devices[0]?.id || '' });
    const next = devices.find(d => d.id === state.selected) ?? null;
    if (next !== port) return bind();
  }
  async function connect(manual = true) {
    if (!supported()) { publish({ status: ko["input.thisBrowserDoesNotSupportMidiInput"] }); return; }
    if (pending) return pending;
    pending = (async () => {
      try {
        let permission;
        try { permission = await nav.permissions?.query({ name: 'midi', sysex: false }); } catch {}
        if (permission?.state === 'denied' || (denied && permission?.state !== 'granted')) {
          reset();
          publish({ connected: false, status: ko["input.permissionDeniedAllowMidiInSiteSettingsAndRetryRefreshIfPermission"] }); return;
        }
        if (!manual && permission?.state !== 'granted') return;
        if (!access) { access = await nav.requestMIDIAccess({ sysex: false }); access.addEventListener('statechange', update); }
        denied = false;
        await update();
        if (port && !state.connected && state.status !== ko["input.connecting"]) await bind();
      } catch (error) {
        denied = ['NotAllowedError', 'SecurityError'].includes(error.name);
        publish({ connected: false, status: denied ? ko["input.permissionDeniedAllowMidiInSiteSettingsAndRetry"] : formatMessage(ko["input.connectionFailedValue1"], { value1: error.message }) });
      }
    })();
    try { await pending; } finally { pending = null; }
  }
  return {
    getSnapshot: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    supported, connect, reset,
    select(id) { publish({ selected: id }); void bind(); },
    consume(consumer) {
      consumers.add(consumer); reset(); owner = null;
      if (consumers.size === 1) { win?.addEventListener?.('blur', reset); doc?.addEventListener?.('visibilitychange', reset); }
      return () => {
        consumer.reset?.(); consumers.delete(consumer); reset(); owner = null;
        if (!consumers.size) { win?.removeEventListener?.('blur', reset); doc?.removeEventListener?.('visibilitychange', reset); }
      };
    },
  };
}
export const midiInput = createMidiInput();
