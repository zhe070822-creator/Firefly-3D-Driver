import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { ThreeMmdLoader } from '@yohawing/three-mmd-loader';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 100);
camera.position.set(0, 2.5, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.35;
document.getElementById('viewer').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.0, 0);
controls.enableDamping = true;
controls.maxDistance = 60;
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: null };
controls.update();

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const key = new THREE.DirectionalLight(0xffffff, 3.0);
key.position.set(5, 15, 10); scene.add(key);
const fill = new THREE.DirectionalLight(0x6688cc, 1.5);
fill.position.set(-5, 2, -5); scene.add(fill);
scene.add(new THREE.GridHelper(10, 30, 0x334466, 0x1a1a3e));

// State
const loader = new ThreeMmdLoader();
const boneMap = new Map();
const boneDefaults = new Map();
let mmdModel = null;

// Fly controls
const flyControls = new PointerLockControls(camera, renderer.domElement);
let flyMode = false, flySpeedMul = 1.0, flyReady = false;
const keys = { w: false, a: false, s: false, d: false, q: false, e: false, shift: false };
const flyClock = new THREE.Clock();

function enableFly() { controls.enabled = false; flyControls.enabled = true; flyControls.lock(); }
function disableFly() { flyMode = false; flyControls.enabled = false; flyControls.unlock(); controls.enabled = true; document.getElementById('flyBtn').textContent = '飞行模式'; }
flyControls.addEventListener('lock', () => { flyMode = true; document.getElementById('flyBtn').textContent = '飞行中 (ESC退出)'; });
flyControls.addEventListener('unlock', () => { if (flyMode) disableFly(); });
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'f' && !flyMode && !flyReady) { e.preventDefault(); flyReady = true; document.getElementById('flyBtn').textContent = '点击画面进入飞行...'; return; }
  if (flyMode && k in keys) { keys[k] = true; e.preventDefault(); }
});
document.addEventListener('keyup', e => { if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = false; });
renderer.domElement.addEventListener('click', () => { if (flyReady && !flyMode) { flyReady = false; enableFly(); } });

// Load PMX directly
(async () => {
  try {
    mmdModel = await loader.loadModel('/Firefly/猫耳流萤_by_鮮淉橙/猫耳流萤.pmx');
    mmdModel.root.scale.setScalar(0.2);
    mmdModel.root.position.set(0, 0, 0);
    scene.add(mmdModel.root);

    mmdModel.root.traverse(c => {
      if (c.isBone && !boneMap.has(c.name)) {
        boneMap.set(c.name, c);
        boneDefaults.set(c.name, { x: c.rotation.x, y: c.rotation.y, z: c.rotation.z });
      }
    });

    // Log material types
    mmdModel.root.traverse(function(c) {
      if (c.isMesh && c.material) {
        var m = Array.isArray(c.material) ? c.material[0] : c.material;
        console.log('[Mat] type:', m.type, 'hasMap:', !!m.map, 'hasEmissive:', !!m.emissiveMap, 'uniforms:', !!m.uniforms);
      }
    });
    console.log('[流萤] Bones:', boneMap.size);
        console.log('[流萤] Bones:', boneMap.size);
    window.__bones = boneMap;
    window.__resetPose = () => boneDefaults.forEach((d, n) => { const b = boneMap.get(n); if (b) b.rotation.set(d.x, d.y, d.z); });

    buildUI();
    document.getElementById('info').textContent = '流萤 ' + boneMap.size + '骨骼 | PMX直读';
    document.getElementById('leftPanel').style.display = '';
    document.getElementById('toggleBtn').style.display = '';
  } catch (err) {
    document.getElementById('info').textContent = '加载失败: ' + err.message;
    console.error(err);
  }
})();

function buildUI() {
  const panel = document.getElementById('panel');
  panel.innerHTML = '<h2 style="color:#e94560;font-size:16px;">流萤</h2>';
  const resetBtn = document.createElement('button');
  resetBtn.className = 'reset'; resetBtn.textContent = '重置全部骨骼';
  resetBtn.onclick = () => window.__resetPose?.();
  panel.appendChild(resetBtn);

  const camBtn = document.createElement('button');
  camBtn.className = 'reset'; camBtn.textContent = '视角归位';
  camBtn.onclick = () => { controls.target.set(0, 2.0, 0); camera.position.set(0, 2.5, 5); controls.update(); };
  panel.appendChild(camBtn);

  const allBones = [...boneMap.keys()].sort();
  const groups = {};
  allBones.forEach(name => {
    let g = '其他';
    if (/頭|首|目|Eye|顔|Head|head/i.test(name)) g = '头部';
    else if (/腕|手|指|親指|人指|中指|薬指|小指|Hand|Finger|Thumb|hand|finger|thumb|wrist/i.test(name)) g = '手部';
    else if (/肩|腕|Arm|Shoulder|Elbow|arm|shoulder|elbow|ひじ/i.test(name)) g = '手臂';
    else if (/腰|背|脊|Spine|Hip|Chest|Waist|spine|hip|chest|waist|体/i.test(name)) g = '躯干';
    else if (/足|脚|太もも|ひざ|つま先|Leg|Knee|Ankle|Toe|leg|knee|ankle|toe/i.test(name)) g = '腿部';
    else if (/髪|Hair|hair/i.test(name)) g = '头发';
    else if (/スカート|裾|Skirt|skirt|マント|衣/i.test(name)) g = '衣物';
    else if (/Weapon|weapon|剣/i.test(name)) g = '武器';
    else if (/翼|Wing|wing|羽/i.test(name)) g = '翅膀';
    if (!groups[g]) groups[g] = [];
    groups[g].push(name);
  });

  ['头部','躯干','手臂','手部','腿部','头发','衣物','武器','翅膀','其他'].forEach(g => {
    if (!groups[g]) return;
    const h = document.createElement('h3'); h.textContent = g + ' (' + groups[g].length + ')';
    h.onclick = () => { const d = h.nextElementSibling; if (d) d.style.display = d.style.display === 'none' ? '' : 'none'; };
    panel.appendChild(h);
    const div = document.createElement('div'); div.className = 'bone-group';
    groups[g].forEach(bn => {
      ['x','y','z'].forEach(axis => {
        const row = document.createElement('div'); row.className = 'bone-row';
        const lbl = document.createElement('label'); lbl.textContent = axis === 'x' ? bn.substring(0, 8) : '';
        row.appendChild(lbl);
        const ax = document.createElement('span'); ax.className = 'axis'; ax.textContent = axis.toUpperCase(); row.appendChild(ax);
        const s = document.createElement('input'); s.type = 'range'; s.min = -Math.PI; s.max = Math.PI; s.step = 0.01; s.value = 0;
        s.oninput = () => {
          const b = boneMap.get(bn);
          if (b) { const def = boneDefaults.get(bn); b.rotation[axis] = def[axis] + parseFloat(s.value); }
          s.nextElementSibling.textContent = Math.round(s.value * 180 / Math.PI) + '°';
        };
        row.appendChild(s);
        const v = document.createElement('span'); v.className = 'val'; v.textContent = '0°'; row.appendChild(v);
        div.appendChild(row);
      });
    });
    panel.appendChild(div);
  });

  document.getElementById('toggleBtn').onclick = () => {
    panel.classList.toggle('visible');
    document.getElementById('toggleBtn').textContent = panel.classList.contains('visible') ? '✕' : '☰';
  };
}

setTimeout(() => {
  document.getElementById('resetCamBtn').onclick = () => { controls.target.set(0, 2.0, 0); camera.position.set(0, 2.5, 5); controls.update(); };
  document.getElementById('ambientSlider').oninput = function() { ambientLight.intensity = parseFloat(this.value); document.getElementById('ambientVal').textContent = this.value; };
  document.getElementById('flyBtn').onclick = () => {
    if (flyMode) { disableFly(); return; }
    flyReady = !flyReady;
    document.getElementById('flyBtn').textContent = flyReady ? '点击画面进入飞行...' : '飞行模式';
  };
  document.getElementById('flySpeedSlider').oninput = function() { flySpeedMul = parseFloat(this.value); document.getElementById('flySpeedVal').textContent = flySpeedMul.toFixed(1); };
}, 1000);

// === Lighting System ===
const lights = [];
const lightGizmos = new THREE.Group(); scene.add(lightGizmos);
const gizmoGeo = new THREE.SphereGeometry(0.04, 16, 16);
window.__addLight = function() {
  var light = new THREE.PointLight(0xffeedd, 30, 8, 1);
  light.position.set(0, 2, 1); light.castShadow = true;
  light.shadow.mapSize.set(512, 512); scene.add(light);
  var gizmo = new THREE.Mesh(gizmoGeo, new THREE.MeshBasicMaterial({ color: 0xffdd44, depthTest: false }));
  gizmo.position.copy(light.position); lightGizmos.add(gizmo);
  lights.push({ light: light, gizmo: gizmo }); updateLightList();
};
window.__setLightProp = function(i, prop, v) {
  if (!lights[i]) return;
  if (prop === 'intensity') lights[i].light.intensity = v;
  else { lights[i].light.position[prop] = v; lights[i].gizmo.position[prop] = v; }
};
window.__removeLight = function(i) {
  if (lights.length <= 1 || !lights[i]) return;
  scene.remove(lights[i].light); lightGizmos.remove(lights[i].gizmo);
  lights.splice(i, 1); updateLightList();
};
function updateLightList() {
  var c = document.getElementById('lightList'); if (!c) return;
  c.innerHTML = '';
  lights.forEach(function(l, i) {
    var div = document.createElement('div');
    div.style.cssText = 'margin:4px 0;padding:3px 0;border-top:1px solid #444;';
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;gap:2px;';
    hdr.innerHTML = '<span style="color:#f39c12;">●</span><span style="color:#ccc;font-size:9px;">光源'+(i+1)+'</span>';
    if (lights.length > 1) {
      var del = document.createElement('button');
      del.textContent = '✕'; del.style.cssText = 'font-size:8px;padding:0 3px;background:#666;margin-left:auto;';
      del.onclick = function() { window.__removeLight(i); }; hdr.appendChild(del);
    }
    div.appendChild(hdr);
    ['intensity','x','y','z'].forEach(function(prop) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:2px;font-size:9px;';
      var lbl = document.createElement('span');
      lbl.style.cssText = 'color:#999;width:20px;';
      lbl.textContent = prop === 'intensity' ? '强' : prop.toUpperCase();
      row.appendChild(lbl);
      var s = document.createElement('input'); s.type = 'range'; s.style.cssText = 'flex:1;accent-color:#f39c12;';
      var v = document.createElement('span');
      v.style.cssText = 'color:#999;width:34px;';
      if (prop === 'intensity') {
        s.min = '1'; s.max = '150'; s.value = String(Math.round(l.light.intensity));
        s.oninput = function() { window.__setLightProp(i, 'intensity', +this.value); v.textContent = this.value; };
        v.textContent = String(Math.round(l.light.intensity));
      } else {
        s.min = '-3'; s.max = '3'; s.step = '0.05'; s.value = l.light.position[prop].toFixed(2);
        s.oninput = function() { window.__setLightProp(i, prop, +this.value); v.textContent = parseFloat(this.value).toFixed(2); };
        v.textContent = l.light.position[prop].toFixed(2);
      }
      row.appendChild(s);
      row.appendChild(v);
      div.appendChild(row);
    });
    c.appendChild(div);
  });
}
document.getElementById('addLightBtn').onclick = function() { window.__addLight(); };
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(flyClock.getDelta(), 0.1);
  if (flyMode) {
    const speed = (keys.shift ? 4 : 1.6) * flySpeedMul;
    const dir = new THREE.Vector3();
    if (keys.w) camera.getWorldDirection(dir), camera.position.addScaledVector(dir, speed * dt);
    if (keys.s) camera.getWorldDirection(dir), camera.position.addScaledVector(dir, -speed * dt);
    if (keys.a) camera.getWorldDirection(dir), dir.cross(camera.up).normalize(), camera.position.addScaledVector(dir, -speed * dt);
    if (keys.d) camera.getWorldDirection(dir), dir.cross(camera.up).normalize(), camera.position.addScaledVector(dir, speed * dt);
    if (keys.q) camera.position.y -= speed * dt;
    if (keys.e) camera.position.y += speed * dt;
  } else { controls.update(); }
  if (mmdModel) mmdModel.update(dt);
  renderer.render(scene, camera);
}
function resize() {
  const v = document.getElementById('viewer');
  renderer.setSize(v.clientWidth, v.clientHeight, false);
  camera.aspect = v.clientWidth / Math.max(v.clientHeight, 1);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
animate();
