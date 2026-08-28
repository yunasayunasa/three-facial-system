import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { setupFace } from 'three-facial-system';
import { defaultVectorExpressionPack } from 'three-facial-system/expressions/vector';

const loader = new GLTFLoader();
const gltf = await loader.loadAsync('/characters/haaselia.glb');
scene.add(gltf.scene);

const face = await setupFace({
  model: gltf.scene,
  profile: '/characters/haaselia-face/profile.json',
  expressions: defaultVectorExpressionPack,
  preload: true,
});

await face.setExpression('smile');
await face.setExpression('angry');
await face.setExpression('normal');

// When the character is permanently removed:
// face.dispose();
