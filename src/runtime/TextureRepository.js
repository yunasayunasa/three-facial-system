import * as THREE from 'three';

/** Shared texture loader/cache for one facial system instance. */
export class TextureRepository {
  constructor(options = {}) {
    this.loader = options.textureLoader ?? new THREE.TextureLoader();
    this.cache = new Map();
    this.owned = new Set();
  }

  async load(value) {
    if (!value) return null;
    if (value.isTexture) return value;
    if (typeof value !== 'string') {
      throw new TypeError('Three Facial System: texture must be a THREE.Texture, URL string, or null.');
    }
    if (this.cache.has(value)) return this.cache.get(value);
    const pending = this.loader.loadAsync(value).then(texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.needsUpdate = true;
      this.owned.add(texture);
      this.cache.set(value, Promise.resolve(texture));
      return texture;
    }).catch(error => {
      this.cache.delete(value);
      throw new Error(`Three Facial System: failed to load texture ${value}`, { cause: error });
    });
    this.cache.set(value, pending);
    return pending;
  }

  async preload(values = []) {
    await Promise.all(values.filter(Boolean).map(value => this.load(value)));
  }

  dispose() {
    for (const texture of this.owned) texture.dispose();
    this.owned.clear();
    this.cache.clear();
  }
}
