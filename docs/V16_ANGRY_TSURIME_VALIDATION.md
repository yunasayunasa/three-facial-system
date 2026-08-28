# v16 Angry Tsurime Validation

## Goal
Correct the default `angry` half-moon eyes so the rendered expression has raised **outer** eye corners (tsurime) rather than drooping outer corners.

## Root cause
The v15 roll lock correctly stabilized eye-plane rotation, but both eye planes use a Head-local horizontal axis whose image-space direction is mirrored relative to the authored left/right asymmetric wedges. Symmetric assets hid this. The angry wedges exposed it.

## Fix
The production contents of `angry_left.png` and `angry_right.png` were exchanged to match the runtime plane coordinate convention. No character-specific coordinates, profile offsets, or runtime branches were added.

## Regression set
The same `angry` expression was rendered on:

- Haaselia
- Bowgan
- Nia
- Katzelia

All four show outer corners raised and inner corners lowered.

## Result
PASS. The fix is expression-asset-wide and does not alter calibration or other expression states.
