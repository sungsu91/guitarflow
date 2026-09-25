import en from '../i18n/locales/en.js';

// English text stays editable; Korean continues to use the original artwork.
function badge(text, color) {
  const label = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="120" viewBox="0 0 360 120"><defs><filter id="glow" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="4"/></filter></defs><g fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"><path d="M92 91 Q112 78 133 89 T175 88 T217 89 T259 85" filter="url(#glow)"/><path d="M92 91 Q112 78 133 89 T175 88 T217 89 T259 85"/></g><text x="180" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="900" font-style="italic" fill="${color}" stroke="${color}" stroke-width="8" filter="url(#glow)">${label}</text><text x="180" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="900" font-style="italic" fill="#ffffff" stroke="#124d80" stroke-width="4" paint-order="stroke">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const ENGLISH_TUNER_GUIDANCE_BADGES = Object.freeze({
  waiting: badge(en['tuner.badge.pluck'], '#39bfff'),
  exact: badge(en['tuner.badge.exact'], '#66ffd2'),
  almost: badge(en['tuner.badge.almost'], '#70dfff'),
  low: badge(en['tuner.badge.up'], '#65cfff'),
  'very-low': badge(en['tuner.badge.up'], '#65cfff'),
  high: badge(en['tuner.badge.down'], '#ffca70'),
  'very-high': badge(en['tuner.badge.down'], '#ffca70'),
  danger: badge(en['tuner.badge.danger'], '#ff7979'),
});
