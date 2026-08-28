#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

if (!args.length || args.includes('--help') || args.includes('-h')) {
  console.log(`Usage:
  three-facialize <model.glb> [--bundle <dir>] [--out <profile.json>] [--name <CharacterName>] [--debug-raster <png>] [--no-covers]

Recommended:
  three-facialize ./character.glb --bundle ./character-face

Bundle output:
  character-face/profile.json
  character-face/covers/leftEye.png
  character-face/covers/rightEye.png
  character-face/covers/mouth.png
  character-face/expressions.example.json
  character-face/INTEGRATION.md

Build-time only. Runtime performs no raycast or image analysis.`);
  process.exit(args.length ? 0 : 1);
}

const model = path.resolve(args[0]);
const get = (name, fallback = null) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const bundleArg = get('--bundle');
const bundle = bundleArg ? path.resolve(bundleArg) : null;
const defaultOut = bundle ? path.join(bundle, 'profile.json') : model.replace(/\.glb$/i, '') + '.face-profile.json';
const out = path.resolve(get('--out', defaultOut));
const name = get('--name', path.basename(model, path.extname(model)));
const debug = get('--debug-raster', bundle ? path.join(bundle, 'debug', 'front-raster.png') : null);
const coversEnabled = !args.includes('--no-covers');
const coversDir = coversEnabled
  ? (bundle ? path.join(bundle, 'covers') : path.join(path.dirname(out), `${path.basename(out, path.extname(out))}.assets`, 'covers'))
  : null;
const coversPrefix = coversDir ? path.relative(path.dirname(out), coversDir).split(path.sep).join('/') || '.' : null;
const tmp = path.join(os.tmpdir(), `face-geometry-${process.pid}-${Date.now()}.json`);

if (!fs.existsSync(model)) {
  console.error(`Model not found: ${model}`);
  process.exit(1);
}
if (bundle) fs.mkdirSync(bundle, { recursive: true });
if (debug) fs.mkdirSync(path.dirname(path.resolve(debug)), { recursive: true });

const g = spawnSync(process.execPath, [path.join(HERE, 'geometry-pass.mjs'), model, '--out', tmp, '--name', name], { stdio: 'inherit' });
if (g.status !== 0) process.exit(g.status ?? 1);

let py = process.env.PYTHON || 'python3';
let test = spawnSync(py, ['--version'], { stdio: 'ignore' });
if (test.status !== 0) py = 'python';
const pa = [path.join(HERE, 'texture-refine.py'), model, '--profile', tmp, '--out', out];
if (debug) pa.push('--debug-raster', path.resolve(debug));
if (coversDir) pa.push('--covers-dir', coversDir, '--covers-prefix', coversPrefix);
const r = spawnSync(py, pa, { stdio: 'inherit' });
try { fs.unlinkSync(tmp); } catch {}
if (r.status !== 0) {
  console.error('Texture refinement failed. Install build dependencies with: python -m pip install -r tools/requirements.txt');
  process.exit(r.status ?? 1);
}

if (bundle) {
  const manifestSrc = path.resolve(HERE, '../assets/expressions/manifest.example.json');
  const manifestOut = path.join(bundle, 'expressions.example.json');
  if (fs.existsSync(manifestSrc) && !fs.existsSync(manifestOut)) fs.copyFileSync(manifestSrc, manifestOut);
  const integration = `# Integration\n\n1. Put your transparent expression PNGs somewhere your game can serve.\n2. Copy expressions.example.json to expressions.json and replace the paths.\n3. Keep profile.json and covers/ together so their relative paths remain valid.\n4. Load the GLB normally, then:\n\n\`\`\`js\nimport { setupFace } from 'three-facial-system';\n\nconst face = await setupFace({\n  model: gltf.scene,\n  profile: './profile.json',\n  expressions: './expressions.json'\n});\n\nawait face.setExpression('angry');\nawait face.setExpression('normal'); // restores the exact original GLB base-colour map\n\`\`\`\n\nThe generated covers are transparent UV-atlas overlays. Only slots present in the active expression are composited, so a left-eye-only expression does not erase the right eye or mouth.\n`;
  fs.writeFileSync(path.join(bundle, 'INTEGRATION.md'), integration);
}

console.log(`Facialization complete: ${out}`);
if (coversDir) console.log(`Cover patches: ${coversDir}`);
if (bundle) console.log(`Integration bundle: ${bundle}`);
