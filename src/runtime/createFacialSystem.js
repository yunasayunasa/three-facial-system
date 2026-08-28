import { TextureRepository } from './TextureRepository.js';
import { FaceOverlayController } from './FaceOverlayController.js';
import { ExpressionController } from './ExpressionController.js';
import { TextureAtlasCoverageController } from './TextureAtlasCoverageController.js';

function coverageSlots(profile) {
  return profile?.coverage?.slots ?? profile?.covers ?? {};
}

/** Low-level synchronous entry point when profile/manifest are already loaded. */
export function createFacialSystem(model, profile, expressionManifest = {}, options = {}) {
  if (!model) throw new TypeError('createFacialSystem: model is required.');
  if (!profile?.anchors) throw new TypeError('createFacialSystem: a generated face profile is required.');
  const textures = options.textureRepository ?? new TextureRepository(options);
  const uvCoverage = profile?.coverage?.mode === 'uv-atlas-composite';
  const overlay = new FaceOverlayController(model, profile, { ...options, usePlaneCoverage: !uvCoverage });
  const coverage = uvCoverage ? new TextureAtlasCoverageController(model, profile, options) : null;
  const expressions = new ExpressionController(overlay, expressionManifest, textures, coverage);

  const system = {
    overlay,
    coverage,
    expressions,
    profile,
    textures,
    ready: Promise.resolve(),
    setExpression: name => expressions.setExpression(name),
    preload: names => expressions.preload(names),
    clear: () => expressions.clear(),
    setVisible(visible) {
      overlay.setVisible(visible);
      coverage?.setEnabled(visible);
    },
    async loadCoverage(slots = coverageSlots(profile)) {
      const entries = Object.entries(slots || {});
      const loaded = await Promise.all(entries.map(async ([slot, ref]) => {
        const definition = (ref && typeof ref === 'object' && !ref.isTexture) ? ref : {};
        const source = typeof ref === 'string' || ref?.isTexture ? ref : definition.src;
        return [slot, { texture: await textures.load(source), definition }];
      }));
      const map = Object.fromEntries(loaded);
      if (coverage) coverage.setSlotTextures(Object.fromEntries(Object.entries(map).map(([slot, value]) => [slot, value.texture])));
      else overlay.setCoverageTextures(map);
      return system;
    },
    dispose() {
      expressions.clear();
      coverage?.dispose();
      overlay.dispose();
      if (!options.textureRepository) textures.dispose();
    },
  };
  return system;
}
