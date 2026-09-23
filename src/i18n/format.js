// Pure formatting for canonical messages used by data and validation modules.
export function formatMessage(message, values = {}) {
  return message.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
}
