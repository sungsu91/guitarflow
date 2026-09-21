import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const allowed = new Set(JSON.parse(await readFile(new URL('./release-audio-assets.json', import.meta.url), 'utf8')));
const media = /\.(pdf|mp3|m4a|aac|ogg|opus|flac|wav|aiff?|wma|mp4|webm|mid|midi|musicxml|mxl)$/i;

export function isPrivateReleaseAsset(relativePath) {
  const name = relativePath.replaceAll('\\', '/');
  return /flower[\s_-]*dance|플라워[\s_-]*댄스/i.test(name)
    || (media.test(name) && !allowed.has(name));
}

export async function checkReleaseMedia(root) {
  const blocked = [];
  async function visit(directory) {
    for (const item of await readdir(directory, {withFileTypes:true})) {
      const fullPath = path.join(directory, item.name);
      if (item.isDirectory()) await visit(fullPath);
      else if (isPrivateReleaseAsset(path.relative(root, fullPath))) blocked.push(fullPath);
    }
  }
  await visit(root);
  if (blocked.length) throw new Error(`Personal scores/audio must not be deployed:\n${blocked.join('\n')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const root of process.argv.slice(2)) await checkReleaseMedia(root);
  console.log('Release media verified: only approved instrument samples; no personal scores/audio.');
}
