import * as THREE from 'three';

function canvasFactory(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  if (typeof document !== 'undefined' && document.createElement) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return null;
}

function textureImage(texture) { return texture?.image ?? texture?.source?.data ?? null; }

function copyTextureSampling(from, to) {
  to.mapping = from.mapping;
  to.channel = from.channel;
  to.wrapS = from.wrapS;
  to.wrapT = from.wrapT;
  to.magFilter = from.magFilter;
  to.minFilter = from.minFilter;
  to.anisotropy = from.anisotropy;
  to.generateMipmaps = from.generateMipmaps;
  to.premultiplyAlpha = from.premultiplyAlpha;
  to.unpackAlignment = from.unpackAlignment;
  to.colorSpace = from.colorSpace || THREE.SRGBColorSpace;
  to.flipY = from.flipY;
  to.offset.copy(from.offset);
  to.repeat.copy(from.repeat);
  to.center.copy(from.center);
  to.rotation = from.rotation;
  to.matrixAutoUpdate = from.matrixAutoUpdate;
  if (!from.matrixAutoUpdate) to.matrix.copy(from.matrix);
  to.needsUpdate = true;
}

export class TextureAtlasCoverageController {
  constructor(model, profile, options = {}) {
    this.model = model;
    this.profile = profile;
    this.strict = options.strictCoverage !== false;
    this.materialOverrides = Array.isArray(options.coverageMaterials) ? options.coverageMaterials.filter(Boolean) : null;
    this.materialNameOverrides = Array.isArray(options.coverageMaterialNames) ? new Set(options.coverageMaterialNames.filter(Boolean)) : null;
    this.slotTextures = {};
    this.activeSlots = [];
    this.enabled = true;
    this.targets = [];
    this.cache = new Map();
    this.owned = new Set();
    this.#resolveTargets();
  }

  #resolveTargets() {
    const defs = this.profile?.coverage?.targets ?? [];
    const names = this.materialNameOverrides ?? new Set(defs.map(v => typeof v === 'string' ? v : v?.materialName).filter(Boolean));
    const seen = new Set();
    if (this.materialOverrides?.length) {
      for (const material of this.materialOverrides) {
        if (!material?.map || seen.has(material.uuid)) continue;
        seen.add(material.uuid);
        this.targets.push({ material, originalMap: material.map });
      }
    }
    if (this.targets.length) return;
    this.model.traverse?.(object => {
      if (!object?.isMesh && !object?.isSkinnedMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material || seen.has(material.uuid)) continue;
        if (names.size && !names.has(material.name)) continue;
        if (!material.map) continue;
        seen.add(material.uuid);
        this.targets.push({ material, originalMap: material.map });
      }
    });
    if (!this.targets.length && this.strict) {
      const wanted = [...names].join(', ') || '(any mapped material)';
      throw new Error(`Three Facial System: UV coverage target material not found: ${wanted}`);
    }
  }

  setSlotTextures(textures = {}) {
    for (const texture of this.owned) texture.dispose();
    this.owned.clear();
    this.cache.clear();
    this.slotTextures = { ...textures };
    if (this.activeSlots.length) this.setActiveSlots(this.activeSlots);
  }

  #cacheKey(target, slots) { return `${target.material.uuid}|${slots.join('+')}`; }

  #compose(target, slots) {
    const key = this.#cacheKey(target, slots);
    if (this.cache.has(key)) return this.cache.get(key);
    const originalImage = textureImage(target.originalMap);
    if (!originalImage) throw new Error('Three Facial System: original base-colour texture image is unavailable for UV coverage.');
    const width = originalImage.width ?? originalImage.videoWidth ?? originalImage.naturalWidth;
    const height = originalImage.height ?? originalImage.videoHeight ?? originalImage.naturalHeight;
    if (!width || !height) throw new Error('Three Facial System: original base-colour texture has no drawable dimensions.');
    const canvas = canvasFactory(width, height);
    if (!canvas) throw new Error('Three Facial System: UV atlas coverage requires Canvas or OffscreenCanvas at runtime.');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Three Facial System: 2D canvas context is unavailable.');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(originalImage, 0, 0, width, height);
    for (const slot of slots) {
      const texture = this.slotTextures[slot];
      const image = textureImage(texture);
      if (image) ctx.drawImage(image, 0, 0, width, height);
    }
    const composed = new THREE.CanvasTexture(canvas);
    copyTextureSampling(target.originalMap, composed);
    this.cache.set(key, composed);
    this.owned.add(composed);
    return composed;
  }

  setActiveSlots(slots = []) {
    this.activeSlots = [...new Set(slots.filter(slot => this.slotTextures[slot]))].sort();
    if (!this.enabled || !this.activeSlots.length) { this.#restoreOriginal(); return; }
    for (const target of this.targets) {
      target.material.map = this.#compose(target, this.activeSlots);
      target.material.needsUpdate = true;
    }
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
    if (this.enabled) this.setActiveSlots(this.activeSlots);
    else this.#restoreOriginal();
  }

  #restoreOriginal() {
    for (const target of this.targets) {
      if (target.material.map !== target.originalMap) {
        target.material.map = target.originalMap;
        target.material.needsUpdate = true;
      }
    }
  }

  clear() { this.activeSlots = []; this.#restoreOriginal(); }
  dispose() {
    this.#restoreOriginal();
    for (const texture of this.owned) texture.dispose();
    this.owned.clear();
    this.cache.clear();
    this.slotTextures = {};
    this.targets = [];
  }
}
