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
- Ships with a 36-PNG default expression pack

## Runtime

```js
import { setupFace } from 'three-facial-system';

const face = await setupFace({
  model: gltf.scene,
  profile: '/characters/haaselia-face/profile.json',
  expressions: '/characters/haaselia-face/expressions.json',
  preload: true,
});

await face.setExpression('smile');
await face.setExpression('angry');
await face.setExpression('normal');
```

## Default expressions

`normal`, `smile`, `happy`, `angry`, `sad`, `cry`, `surprised`, `closed`, `blank`, `sleepy`, `panic`, `wink_left`, `wink_right`

The expression style is intentionally symbolic and readable: thick black outlines, opaque white shapes, bold simple geometry, and oversized coverage to help conceal remnants of the original painted face.

The final `angry` design is a white-filled, thick-black-outlined crescent with the **outer eye corner higher than the inner eye corner**, producing a clear upturned angry-eye silhouette.

## Validation

Validated with:

- Haaselia
- Bowgan
- Nia
- Katzelia

Key fixes accumulated through v16 include oversized-eye-region rescue, mouth re-centering, automatic cover patches, `FrontSide` rendering, eye-plane roll stabilization, and asymmetric angry-eye orientation correction.

See `docs/` for the implementation and validation notes.
