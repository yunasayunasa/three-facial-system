import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const bundleDir = path.join(root, 'bundles', 'expression-assets-v16');
const parts = fs.readdirSync(bundleDir).filter(n => n.endsWith('.b64')).sort();
if (!parts.length) throw new Error('No expression asset bundle parts found.');
const b64 = parts.map(n => fs.readFileSync(path.join(bundleDir, n), 'utf8').trim()).join('');
const tar = zlib.gunzipSync(Buffer.from(b64, 'base64'));

function readString(buf, start, len) {
  return buf.subarray(start, start + len).toString('utf8').replace(/\0.*$/s, '').trim();
}
function readOctal(buf, start, len) {
  const s = readString(buf, start, len).replace(/\0/g, '').trim();
  return s ? parseInt(s, 8) : 0;
}
let offset = 0;
let count = 0;
while (offset + 512 <= tar.length) {
  const header = tar.subarray(offset, offset + 512);
  if (header.every(b => b === 0)) break;
  const name = readString(header, 0, 100);
  const prefix = readString(header, 345, 155);
  const rel = prefix ? `${prefix}/${name}` : name;
  const size = readOctal(header, 124, 12);
  const type = String.fromCharCode(header[156] || 48);
  offset += 512;
  const data = tar.subarray(offset, offset + size);
  if (type === '0' || type === '\0') {
    const out = path.join(root, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, data);
    count++;
  }
  offset += Math.ceil(size / 512) * 512;
}
console.log(`Hydrated ${count} expression asset files.`);
