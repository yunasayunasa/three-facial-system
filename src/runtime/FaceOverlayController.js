import * as THREE from 'three';

/**
 * Runtime face-overlay system.
 * Calibration/raycast is build-time only. Expression and generated cover planes
 * are rebuilt from a resolved Head-local profile.
 */
export class FaceOverlayController {
  constructor(model, profile, options = {}) {
    this.model = model;
    this.profile = profile;
    this.head = model.getObjectByName(profile.bone || 'Head');
    if (!this.head) throw new Error(`FaceOverlayController: bone not found: ${profile.bone || 'Head'}`);
    this.renderOrder = options.renderOrder ?? 30;
    this.alphaTest = options.alphaTest ?? 0.02;
    this.anchors = {};
    this.coverMeshes = {};
    this.usePlaneCoverage = options.usePlaneCoverage !== false;
    this.coverTextures = {};
    this.anchorDefs = profile.anchors || {};
    this.root = new THREE.Group();
    this.root.name = 'FaceOverlayRoot';
    this.head.add(this.root);
    for (const [name, def] of Object.entries(profile.anchors || {})) {
      const cover = this.usePlaneCoverage ? this.#createPlane(name, def, 'cover', this.renderOrder) : null;
      const expression = this.#createPlane(name, def, 'expression', this.renderOrder + 1);
      if (cover) this.coverMeshes[name] = cover;
      this.anchors[name] = expression;
    }
  }

  #createMaterial(layer) {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: this.alphaTest,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: layer === 'expression' ? -3 : -2,
      polygonOffsetUnits: layer === 'expression' ? -3 : -2,
    });
  }

  #createPlane(name, def, layer, renderOrder) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.#createMaterial(layer));
    mesh.name = `FaceOverlay_${layer}_${name}`;
    mesh.renderOrder = renderOrder;
    mesh.position.fromArray(def.position);
    mesh.quaternion.fromArray(def.quaternion);
    mesh.scale.set(def.size[0], def.size[1], 1);
    mesh.visible = false;
    mesh.userData.faceSlot = name;
    mesh.userData.faceLayer = layer;
    this.root.add(mesh);
    return mesh;
  }

  configureCover(slot, definition = {}) {
    const mesh = this.coverMeshes[slot];
    const anchor = this.anchorDefs[slot];
    if (!mesh || !anchor) return false;
    const scale = Array.isArray(definition.scale) ? definition.scale : [1, 1];
    mesh.scale.set(anchor.size[0] * (scale[0] ?? 1), anchor.size[1] * (scale[1] ?? scale[0] ?? 1), 1);
    mesh.position.fromArray(anchor.position);
    mesh.quaternion.fromArray(anchor.quaternion);
    const offset = Array.isArray(definition.offset) ? definition.offset : null;
    if (offset && (offset[0] || offset[1] || offset[2])) {
      const local = new THREE.Vector3((offset[0] ?? 0) * anchor.size[0], (offset[1] ?? 0) * anchor.size[1], offset[2] ?? 0).applyQuaternion(mesh.quaternion);
      mesh.position.add(local);
    }
    return true;
  }

  setCoverTexture(slot, texture, definition = {}) {
    const mesh = this.coverMeshes[slot];
    if (!mesh) return false;
    this.configureCover(slot, definition);
    this.coverTextures[slot] = texture || null;
    mesh.material.map = texture || null;
    mesh.material.needsUpdate = true;
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.needsUpdate = true;
    }
    mesh.visible = !!texture && !!this.anchors[slot]?.visible;
    return true;
  }

  setCoverageTextures(textures = {}) {
    for (const [slot, value] of Object.entries(textures)) {
      if (value && typeof value === 'object' && 'texture' in value) this.setCoverTexture(slot, value.texture, value.definition || {});
      else this.setCoverTexture(slot, value);
    }
  }

  configureExpression(slot, definition = {}) {
    const mesh = this.anchors[slot];
    const anchor = this.anchorDefs[slot];
    if (!mesh || !anchor) return false;
    const scale = Array.isArray(definition.scale) ? definition.scale : [1, 1];
    mesh.scale.set(anchor.size[0] * (scale[0] ?? 1), anchor.size[1] * (scale[1] ?? scale[0] ?? 1), 1);
    mesh.position.fromArray(anchor.position);
    mesh.quaternion.fromArray(anchor.quaternion);
    const offset = Array.isArray(definition.offset) ? definition.offset : null;
    if (offset && (offset[0] || offset[1] || offset[2])) {
      const local = new THREE.Vector3((offset[0] ?? 0) * anchor.size[0], (offset[1] ?? 0) * anchor.size[1], offset[2] ?? 0).applyQuaternion(mesh.quaternion);
      mesh.position.add(local);
    }
    return true;
  }

  setTexture(slot, texture, definition = {}) {
    const mesh = this.anchors[slot];
    if (!mesh) throw new Error(`FaceOverlayController: unknown slot: ${slot}`);
    this.configureExpression(slot, definition);
    mesh.material.map = texture || null;
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.needsUpdate = true;
    }
    mesh.material.needsUpdate = true;
    mesh.visible = !!texture;
    const cover = this.coverMeshes[slot];
    if (cover) cover.visible = !!texture && !!this.coverTextures[slot];
  }

  setTextures(textures = {}, layout = {}) {
    const known = new Set(Object.keys(textures));
    for (const slot of Object.keys(this.anchors)) {
      const slotLayout = layout?.[slot] ?? ((slot === 'leftEye' || slot === 'rightEye') ? layout?.eyes : null) ?? {};
      this.setTexture(slot, known.has(slot) ? textures[slot] : null, slotLayout);
    }
  }

  setVisible(visible) { this.root.visible = visible; }
  clear() { for (const slot of Object.keys(this.anchors)) this.setTexture(slot, null); }
  dispose() {
    for (const mesh of [...Object.values(this.anchors), ...Object.values(this.coverMeshes)]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.root.removeFromParent();
    this.anchors = {};
    this.coverMeshes = {};
    this.coverTextures = {};
    this.anchorDefs = {};
  }
}
