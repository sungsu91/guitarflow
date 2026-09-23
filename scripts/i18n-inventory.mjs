import fs from 'node:fs';
import path from 'node:path';
import { parseSync } from 'rolldown/utils';

export const hangul = /[\u3131-\u318e\uac00-\ud7a3]/;
export function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', '.git', 'dist', 'artifacts', 'work', 'assets-source', 'vendor', '.agents', '.codex'].includes(entry.name)) return [];
    const file = path.join(dir, entry.name).replaceAll('\\', '/');
    return entry.isDirectory() ? filesUnder(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
  });
}
export function walk(node, visitor, ancestors = []) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(item => walk(item, visitor, ancestors)); return; }
  if (!node.type) return;
  visitor(node, ancestors);
  for (const [key, value] of Object.entries(node)) {
    if (!['comments', 'tokens', 'loc', 'range'].includes(key) && value && typeof value === 'object') walk(value, visitor, [...ancestors, node]);
  }
}
export function jsxText(value) {
  const lines = value.split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((line, index) => { if (/[^ \t]/.test(line)) last = index; });
  return lines.map((line, index) => {
    let text = line.replace(/\t/g, ' ');
    if (index) text = text.replace(/^ +/, '');
    if (index !== lines.length - 1) text = text.replace(/ +$/, '');
    return text && index !== last ? text + ' ' : text;
  }).join('');
}
export function inspect(file) {
  const source = fs.readFileSync(file, 'utf8');
  const parsed = parseSync(file, source);
  if (parsed.errors.length) throw new Error(`${file}: ${JSON.stringify(parsed.errors)}`);
  const entries = [], components = [];
  walk(parsed.program, (node, ancestors) => {
    if (node.type === 'FunctionDeclaration' && /^[A-Z]/.test(node.id?.name ?? '') && source.slice(node.start, node.end).includes('<')) components.push(node.id.name);
    if (node.type === 'VariableDeclarator' && /^[A-Z]/.test(node.id?.name ?? '') && ['ArrowFunctionExpression', 'FunctionExpression'].includes(node.init?.type) && source.slice(node.start, node.end).includes('<')) components.push(node.id.name);
    let value;
    if (node.type === 'Literal' && typeof node.value === 'string') value = node.value;
    if (node.type === 'JSXText') value = jsxText(node.value);
    if (node.type === 'TemplateLiteral') value = node.quasis.map((part, index) => part.value.cooked + (index < node.expressions.length ? `{value${index + 1}}` : '')).join('');
    if (!value || !hangul.test(value)) return;
    const parent = ancestors.at(-1);
    const fn = [...ancestors].reverse().find(item => /Function/.test(item.type));
    const property = parent?.type === 'Property' ? parent.key.name ?? parent.key.value : undefined;
    const attr = [...ancestors].reverse().find(item => item.type === 'JSXAttribute')?.name?.name;
    const inJsx = ancestors.some(item => item.type === 'JSXExpressionContainer' || item.type === 'JSXAttribute');
    entries.push({ file, line: source.slice(0, node.start).split('\n').length, start: node.start, end: node.end, type: node.type, value, parent: parent?.type, property, attribute: attr, function: fn?.id?.name, context: source.slice(Math.max(0, node.start - 65), Math.min(source.length, node.end + 65)), category: node.type === 'JSXText' || attr || inJsx ? 'presentation' : 'review-data-or-message' });
  });
  return { file, components, entries, comments: parsed.comments?.filter(comment => hangul.test(comment.value)).length ?? 0 };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/i18n-inventory.mjs')) {
  const files = filesUnder('.').map(file => file.replace(/^\.\//, ''));
  const results = files.map(inspect);
  const production = results.filter(result => result.file.startsWith('src/') && !result.file.startsWith('src/i18n/'));
  const summary = { scannedFiles: results.length, productionFiles: production.length, jsxFiles: production.filter(item => item.file.endsWith('.jsx')).length, components: production.reduce((sum, item) => sum + item.components.length, 0), koreanOccurrences: production.reduce((sum, item) => sum + item.entries.length, 0), uniqueKoreanStrings: new Set(production.flatMap(item => item.entries.map(entry => entry.value))).size };
  fs.mkdirSync('docs/i18n', { recursive: true });
  const name = process.argv.includes('--after') ? 'remaining' : 'inventory';
  const compact = results.map(result => result.file.startsWith('src/') && !result.file.startsWith('src/i18n/')
    ? { ...result, entries: result.entries.map(entry => ({ ...entry, context: entry.context.slice(0, 240) })) }
    : { file: result.file, components: result.components, comments: result.comments, occurrences: result.entries.length });
  fs.writeFileSync(`docs/i18n/${name}.json`, JSON.stringify({ summary, files: compact }, null, 2) + '\n');
  console.log(summary);
}
