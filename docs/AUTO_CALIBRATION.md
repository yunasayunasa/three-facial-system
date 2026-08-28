# Automatic Calibration v1

Maria Theresaを教師モデルとして、Tripo系GLBに対して以下を自動化する。

1. `Head` ボーンを名前候補から検出。
2. SkinのHead weight >= 0.8 の頂点のみ抽出。
3. 外れ値を避けるため2–98 percentileでHeadローカルboundsを算出。
4. 頭部boundsに対する比率から左右目・口を**別々に**初期推定。
5. 各XYからHead支配面へ独立Raycast。
6. barycentric smooth normalを算出。
7. 頭奥行比からsurface biasを算出。
8. resolved position/quaternion/sizeをprofileへ保存。
9. runtimeはprofile復元のみ。

## Maria教師値 v2
- Left eye X: `-0.0480`（旧 `-0.04358` から外側へ補正）
- Right eye X: `+0.04358`
- Eye Y: `0.097`
- Mouth: `(0.001, 0.049)`
- Surface bias: `0.0055`

左右を強制対称にはしない。モデルごとの形状・UV差を吸収するため、左右を独立解決する。

## v8 robustness fixes

### Exact-index percentile
Percentile interpolation must return the sampled value when `floor(q) === ceil(q)`. The old formula multiplied both interpolation weights by zero in that case, which could collapse Face Core bounds to `[0,0,0]`. This is now fixed generically.

### Facial midline from resolved eyes
After the texture pass resolves both eyes, their Head-local X midpoint is used as the mouth's X center. The geometry pass still supplies mouth Y and size. The new XY is then ray-resolved against Head-dominant face geometry, so the runtime anchor remains surface-locked.

This reduces drift caused by horns, ears, hair, or asymmetrical accessories without storing any character-specific coordinates.

## v11+ oversized-region rescue

ハーゼリーラやカッツェリーラでは、目の色領域が髪や装飾と連結して巨大化するケースがあった。通常候補が想定サイズを超えた場合だけ救済処理を発動し、既存Yを維持しつつ暗色でコンパクトな眼球領域からXを再推定する。正常モデルではこの補正を発動しない。

キャラ名や固定座標で分岐せず、候補領域サイズ・左右距離非対称率などの診断値で処理する。
