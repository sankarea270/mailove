import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.getElementById('model-container');
if (!container) throw new Error('model-container not found');

const w = container.clientWidth;
const h = container.clientHeight;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(w, h);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffeedd, 2.0);
keyLight.position.set(2, 3, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xF685FF, 0.8);
fillLight.position.set(-3, 0.5, -2);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x88ccff, 0.6);
rimLight.position.set(-1, 2, -3);
scene.add(rimLight);

const modelGroup = new THREE.Group();
scene.add(modelGroup);

const loader = new GLTFLoader();
loader.load(
  'bt21_-_cooky.glb',
  (gltf) => {
    const model = gltf.scene;
    model.traverse((child) => {
      if (child.isMesh) {
        const mat = child.material;
        if (mat) {
          mat.color.set(0xF685FF);
          mat.roughness = 0.85;
          mat.metalness = 0;
          mat.needsUpdate = true;
        }
      }
    });
    modelGroup.add(model);

    const box = new THREE.Box3().setFromObject(modelGroup);
    const center = box.getCenter(new THREE.Vector3());
    modelGroup.position.sub(center);

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.z = maxDim * 2.8;
    camera.lookAt(0, 0, 0);
  },
  undefined,
  (err) => console.error('Error loading GLB:', err),
);

let targetRot = 0;
let currentRot = 0;

document.addEventListener('mousemove', (e) => {
  targetRot = ((e.clientX / window.innerWidth) * 2 - 1) * 0.35;
});

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(0.05, 0.016);
  currentRot += (targetRot - currentRot) * dt * 6;

  modelGroup.rotation.y = currentRot;

  renderer.render(scene, camera);
}
animate();

function resize() {
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  if (cw > 0 && ch > 0) {
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
    renderer.setSize(cw, ch);
  }
}
window.addEventListener('resize', resize);

const ro = new ResizeObserver(resize);
ro.observe(container);
