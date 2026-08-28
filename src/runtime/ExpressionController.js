/**
 * Expression switching layer independent from any game/scenario engine.
 * Loads complete expression state atomically so rapid calls cannot apply stale art.
 */
export class ExpressionController {
  constructor(faceOverlay, manifest = {}, textures, coverage = null) {
    this.faceOverlay = faceOverlay;
    this.manifest = manifest || {};
    this.textures = textures;
    this.coverage = coverage;
    this.current = null;
    this.requestSerial = 0;
  }

  setManifest(manifest = {}) {
    this.manifest = manifest || {};
  }

  #definition(name) {
    if (!name) return null;
    const def = this.manifest[name];
    if (def == null) {
      if (name === 'normal') return null;
      throw new Error(`Unknown facial expression: ${name}`);
    }
    return def;
  }

  async #loadDefinition(def) {
    if (!def) return { leftEye: null, rightEye: null, mouth: null, symbol: null };
    const [leftEye, rightEye, mouth, symbol] = await Promise.all([
      this.textures.load(def.leftEye ?? def.eyes),
      this.textures.load(def.rightEye ?? def.eyes),
      this.textures.load(def.mouth),
      this.textures.load(def.symbol),
    ]);
    return { leftEye, rightEye, mouth, symbol };
  }

  async setExpression(name = 'normal') {
    const serial = ++this.requestSerial;
    const def = this.#definition(name);
    const loaded = await this.#loadDefinition(def);
    if (serial !== this.requestSerial) return false;

    const activeFaceSlots = ['leftEye', 'rightEye', 'mouth'].filter(slot => !!loaded[slot]);
    this.coverage?.setActiveSlots(activeFaceSlots);
    this.faceOverlay.setTextures({
      leftEye: loaded.leftEye,
      rightEye: loaded.rightEye,
      mouth: loaded.mouth,
      ...(this.faceOverlay.anchors.symbol ? { symbol: loaded.symbol } : {}),
    }, def?.layout || {});
    this.current = def ? name : 'normal';
    return true;
  }

  async preload(names = Object.keys(this.manifest)) {
    const refs = [];
    for (const name of names) {
      const def = this.manifest[name];
      if (!def) continue;
      refs.push(def.leftEye ?? def.eyes, def.rightEye ?? def.eyes, def.mouth, def.symbol);
    }
    await this.textures.preload(refs);
  }

  clear() {
    ++this.requestSerial;
    this.coverage?.clear();
    this.faceOverlay.clear();
    this.current = 'normal';
  }
}
