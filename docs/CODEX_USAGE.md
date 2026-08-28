# Codex標準運用

## ユーザーが新しいTripo GLBを追加したとき
ユーザーに座標調整を要求しない。通常は以下を自動実行する。

```bash
node <FACIAL_SYSTEM>/tools/facialize-model.mjs <MODEL.glb> --out <MODEL>.face-profile.json
```

生成JSONの `diagnostics.requiresReview` が `false` なら、そのまま採用する。
`true` の場合のみCodex側で自動プレビュー/診断を行う。ユーザーへ手計算や座標指定を依頼するのは最後の手段。

## ゲームへの接続
Three.jsゲーム側は共通runtimeを使用し、ゲーム固有の顔配置コードを新規作成しない。

```js
import { setupFace } from 'three-facial-system';
import { defaultVectorExpressionPack } from 'three-facial-system/expressions/vector';

const face = await setupFace({
  model: gltf.scene,
  profile: '/characters/model.face-profile.json',
  expressions: defaultVectorExpressionPack,
});

await face.setExpression('angry');
await face.setExpression('normal');
```

## 設計原則
- キャリブレーションはビルド時/モデル登録時のみ。
- runtimeでRaycastしない。
- OverlayはHeadの子として固定。
- 左目・右目・口は独立アンカー。
- 表情絵とモデル位置合わせを分離する。
- ゲーム側は `setExpression(name)` だけを呼ぶ。
- キャラクター名や固定座標による例外分岐を避け、診断値に基づく汎用補正を使う。
- 丸目だけで最終テストせず、半月・閉じ目・ウインクなど方向性のある素材でも確認する。
