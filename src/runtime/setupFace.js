import { createFacialSystem } from './createFacialSystem.js';

function environmentBase() {
  if (typeof document !== 'undefined' && document.baseURI) return document.baseURI;
  if (typeof location !== 'undefined' && location.href) return location.href;
  return import.meta.url;
}

function absoluteUrl(value, baseUrl) {
  if (!value || typeof value !== 'string') return value;
  try { return new URL(value, baseUrl || environmentBase()).href; }
  catch { return value; }
}

async function loadJsonSource(source, options = {}) {
  if (source && typeof source === 'object') return { data: source, sourceUrl: null };
  if (typeof source !== 'string') throw new TypeError('setupFace: profile/expressions must be an object or JSON URL.');
  const url = absoluteUrl(source, options.baseUrl);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error('setupFace: fetch is unavailable; pass already-loaded objects instead.');
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`setupFace: failed to load JSON ${url} (${response.status})`);
  return { data: await response.json(), sourceUrl: url };
}

function sourceDirectory(sourceUrl, fallback) {
  if (!sourceUrl) return fallback || environmentBase();
  return new URL('.', sourceUrl).href;
}

function resolveManifestAssets(manifest, baseUrl) {
  const out = {};
  for (const [name, def] of Object.entries(manifest || {})) {
    if (!def || typeof def !== 'object') { out[name] = def; continue; }
    out[name] = { ...def };
    for (const key of ['eyes', 'leftEye', 'rightEye', 'mouth', 'symbol']) {
      if (typeof out[name][key] === 'string') out[name][key] = absoluteUrl(out[name][key], baseUrl);
    }
  }
  return out;
}

function resolveCoverage(profile, baseUrl) {
  const slots = profile?.coverage?.slots ?? profile?.covers ?? {};
  return Object.fromEntries(Object.entries(slots).map(([slot, ref]) => {
    if (typeof ref === 'string') return [slot, absoluteUrl(ref, baseUrl)];
    if (ref && typeof ref === 'object') return [slot, { ...ref, src: absoluteUrl(ref.src, baseUrl) }];
    return [slot, ref];
  }));
}

export async function setupFace(options = {}) {
  const { model } = options;
  if (!model) throw new TypeError('setupFace: model is required.');
  const profileSource = await loadJsonSource(options.profile, options);
  const expressionSource = options.expressions
    ? await loadJsonSource(options.expressions, options)
    : { data: {}, sourceUrl: null };
  const profileBase = options.profileBaseUrl ?? sourceDirectory(profileSource.sourceUrl, options.baseUrl);
  const expressionBase = options.expressionBaseUrl ?? sourceDirectory(expressionSource.sourceUrl, options.baseUrl);
  const manifest = resolveManifestAssets(expressionSource.data, expressionBase);
  const coverage = resolveCoverage(profileSource.data, profileBase);
  const face = createFacialSystem(model, profileSource.data, manifest, options);
  face.ready = face.loadCoverage(coverage);
  await face.ready;
  if (options.preload === true) await face.preload();
  return face;
}
