import { setupFace } from 'three-facial-system';
import { defaultVectorExpressionPack } from 'three-facial-system/expressions/vector';

const face = await setupFace({
  model: gltf.scene,
  profile: '/characters/example/profile.json',
  expressions: defaultVectorExpressionPack,
  preload: true,
});

await face.setExpression('smile');
await face.setExpression('angry');
await face.setExpression('wink_left');
await face.setExpression('normal');
