# Three Facial System v16

Reusable Three.js facial-expression overlay system for stylized GLB characters.

This repository contains the **v16 / 0.16.0** implementation developed and validated against multiple chibi-style GLB models.

## What it does

- Detects a head bone and face region from a GLB
- Calibrates left eye, right eye, and mouth anchors
- Generates a reusable face profile
- Generates cover patches to hide the original texture-painted eyes/mouth
- Attaches expression planes to the head bone
- Supports asymmetric expressions, per-expression scale/offset, and runtime switching
- Uses `THREE.FrontSide` and roll-stabilized eye planes for robust angled views
- Defines the 13-state symbolic expression system created for the validated 36-PNG production pack

## Recommended runtime use from this repository

The Git source includes a text-only vector mirror automatically traced from the final v16 PNG expression shapes. It uses SVG data URIs, so it can be cloned and used without separately downloading binary expression images.

```js
import { setupFace } from 'three-facial-system';
import { defaultVectorExpressionPack } from 'three-facial-system/expressions/vector';

const face = await setupFace({
  model: gltf.scene,
  profile: '/characters/haaselia-face/profile.json',
  expressions: defaultVectorExpressionPack,
  preload: true,
});

await face.setExpression('smile');
await face.setExpression('angry');
await face.setExpression('normal');
```

The original production asset format remains `512x512 RGBA PNG`. `assets/expressions/default/expressions.json` preserves that filename/layout manifest, while `assets/expressions/default/vector-expression-pack.js` is the Git-friendly directly usable mirror.

## Default expressions

`normal`, `smile`, `happy`, `angry`, `sad`, `cry`, `surprised`, `closed`, `blank`, `sleepy`, `panic`, `wink_left`, `wink_right`

The expression style is intentionally symbolic and readable: thick black outlines, opaque white shapes, bold simple geometry, and oversized coverage to help conceal remnants of the original painted face.

The final `angry` design is a white-filled, thick-black-outlined half-moon with the **outer eye corner higher than the inner eye corner**, producing a clear tsurime/angry silhouette.

## Build-time facialization

```bash
node tools/facialize-model.mjs character.glb --out character.face-profile.json
```

Heavy face analysis and raycasting happen when the model is registered. Gameplay restores the generated profile and switches expression textures only.

## Validation

Validated with:

- Haaselia
- Bowgan
- Nia
- Katzelia

Key fixes accumulated through v16 include oversized-eye-region rescue, mouth re-centering, automatic cover patches, `FrontSide` rendering, eye-plane roll stabilization, and asymmetric angry-eye orientation correction.

Important lessons are documented in `docs/AUTO_CALIBRATION.md`, `docs/EXPRESSION_ASSET_SPEC.md`, `docs/V15_EYE_ORIENTATION_VALIDATION.md`, `docs/V16_ANGRY_TSURIME_VALIDATION.md`, and `docs/CODEX_USAGE.md`.
