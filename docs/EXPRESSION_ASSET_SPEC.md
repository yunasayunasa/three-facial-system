# Expression Asset Specification v1.2

This document defines the default symbolic face-art pack bundled with Three Facial System v16.

## Design goal

The overlay face is intentionally icon-like rather than detailed anime line art. Expressions must remain readable on a small chibi character and must also help hide any residual pixels from the GLB's original eyes and mouth.

## Common format

- PNG / RGBA
- 512 x 512 px
- transparent background
- bold black outline
- opaque white interior where an area is needed to cover the original face art
- no fine iris detail or shading in the default pack
- generous transparent safe area around every shape
- expression geometry is centered inside the PNG; world placement comes from the generated face profile

The runtime may scale the expression plane beyond the calibrated anchor. This is intentional: the source artwork keeps safe margins while the runtime makes the visible eye slightly larger than the detected original eye.

## Cover-first rule

The GLB cleanup mask is the first protection layer. The expression art is the second.

```text
original GLB eye
  -> generated cleanup/coverage
  -> oversized opaque expression eye
  -> bold black outline
```

A few residual source pixels are therefore expected to be hidden by the new eye itself rather than relying on perfect texture inpainting.

## Vertical bias

Eyes are normally shifted slightly downward relative to the calibrated eye center. This gives more protection against the original lower eye becoming visible. The bundled manifest uses negative local-Y offsets for this purpose.

## Standard states

| State | Eye language | Mouth language |
|---|---|---|
| `normal` | original GLB | original GLB |
| `smile` | thick closed smile arcs | small white smiling mouth |
| `happy` | stronger closed arcs | larger open smile |
| `angry` | **white half-moon eyes with thick black border; outer eye corners higher than inner corners (tsurime)** | small tense curved mouth |
| `sad` | inverse half-moon slope | thick downturned curve |
| `cry` | enlarged sad half-moons | large crying mouth |
| `surprised` | large white outlined circles | outlined round mouth |
| `closed` | thick white-backed closed arcs | small closed curve |
| `blank` | tall rounded rectangles | short rounded bar |
| `sleepy` | flat rounded eyes | tiny sleepy mouth |
| `panic` | intentionally mismatched large circles | large crying/panic mouth |
| `wink_left` | left closed, right open | smile |
| `wink_right` | left open, right closed | smile |

## Angry eye reference

`angry` is not a pair of thin diagonal lines. Each eye is a filled white half-moon/wedge with a bold black outline. In the final on-character render, the **outer corner of each eye must sit higher than the inner corner** so the pair reads as a clear tsurime/angry expression. The runtime plane X direction is accounted for by the production left/right assets.

## Size and layout

The default manifest uses per-expression `layout` values. `scale` is relative to the calibrated anchor plane and `offset` is measured in calibrated anchor-size units.

Example:

```json
{
  "angry": {
    "leftEye": "./eyes/angry_left.png",
    "rightEye": "./eyes/angry_right.png",
    "mouth": "./mouths/angry.png",
    "layout": {
      "eyes": { "scale": [1.55, 1.70], "offset": [0, -0.10, 0] },
      "mouth": { "scale": [1.25, 1.15], "offset": [0, -0.02, 0] }
    }
  }
}
```

Per-eye overrides are also supported. A slot-specific definition overrides `layout.eyes` for that side.

## Runtime rules

- `normal` clears expression planes and returns to the original GLB face.
- expression switching replaces the entire face state; old eye/mouth textures do not leak into the next state.
- `THREE.FrontSide` is used to avoid far-eye backside slivers near profile views.
- cover planes/UV cleanup and expression planes remain separate layers.
- no raycast or image analysis runs during gameplay.

## Git source fallback

The packaged v16 build contains the validated PNG assets. The GitHub source repository also includes `assets/expressions/default/vector-expression-pack.js`, an auto-traced vector mirror of those final PNG shapes. It can be imported directly through `three-facial-system/expressions/vector` and passed as the `expressions` object to `setupFace()`.
