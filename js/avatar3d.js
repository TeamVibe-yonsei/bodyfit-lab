/* BodyFit Lab — 3D 파라메트릭 아바타 (three.js)
 * 체형 프리셋(스펙트럼 분류) × 실제 치수(키·어깨·허리·다리·몸무게)로 마네킹을 변형하고 의류 셸을 입힌다.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const BF = (window.BF = window.BF || {});
const SEG = 40;

/* 체형 프리셋: 가슴·엉덩이·두께 배율 */
const PRESET = {
  "역삼각형": { chest: 1.05, hip: 0.95, depth: 1.0 },
  "삼각형": { chest: 0.96, hip: 1.07, depth: 1.0 },
  "넓은 직사각형": { chest: 1.04, hip: 1.03, depth: 1.08 },
  "슬림 직사각형": { chest: 0.96, hip: 0.97, depth: 0.92 },
  "균형형": { chest: 1.0, hip: 1.0, depth: 1.0 }
};

/* ---------- 로프트(단면 링 연결) 지오메트리 ---------- */
function loft(rings, { closeTop = true, closeBottom = true, uv = null } = {}) {
  const pos = [], idx = [], uvs = [];
  rings.forEach((r, i) => {
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG * Math.PI * 2;
      const x = (r.x || 0) + Math.cos(t) * r.rx, z = (r.z || 0) + Math.sin(t) * r.rz;
      pos.push(x, r.y, z);
      if (uv) uvs.push(0.5 + x / uv.w, 1 - (uv.top - r.y) / uv.h); else uvs.push(s / SEG, i / (rings.length - 1));
    }
  });
  for (let i = 0; i < rings.length - 1; i++) for (let s = 0; s < SEG; s++) {
    const a = i * (SEG + 1) + s, b = a + SEG + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const parts = [g];
  const cap = (r, flip) => { const c = new THREE.CircleGeometry(1, SEG); c.scale(r.rx, r.rz, 1); c.rotateX(flip ? Math.PI / 2 : -Math.PI / 2); c.translate(r.x || 0, r.y, r.z || 0); return c; };
  if (closeTop) parts.push(cap(rings[0], false));
  if (closeBottom) parts.push(cap(rings[rings.length - 1], true));
  return parts.length === 1 ? g : mergeGeoms(parts);
}
function mergeGeoms(gs) {
  const pos = [], nor = [], uvs = [], idx = []; let off = 0;
  gs.forEach(g => { const p = g.getAttribute("position"), n = g.getAttribute("normal"), u = g.getAttribute("uv"); const ind = g.index ? g.index.array : [...Array(p.count).keys()];
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uvs.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0); }
    for (const i of ind) idx.push(i + off); off += p.count; });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); return g;
}
const ell = (rx, ry, rz, x, y, z) => { const g = new THREE.SphereGeometry(1, 28, 20); g.scale(rx, ry, rz); g.translate(x, y, z); return g; };
const smooth = (rings, n = 3) => { // 링 사이 보간으로 곡면 부드럽게
  const out = [];
  for (let i = 0; i < rings.length - 1; i++) { const a = rings[i], b = rings[i + 1]; for (let k = 0; k < n; k++) { const t = k / n, e = t * t * (3 - 2 * t); out.push({ y: a.y + (b.y - a.y) * t, rx: a.rx + (b.rx - a.rx) * e, rz: a.rz + (b.rz - a.rz) * e, x: (a.x || 0) + ((b.x || 0) - (a.x || 0)) * t, z: (a.z || 0) + ((b.z || 0) - (a.z || 0)) * t }); } }
  out.push(rings[rings.length - 1]); return out;
};

/* ---------- 신체 치수 → 링 정의 (cm) ---------- */
function bodyRings(v, sex, frame, bmiRatio) {
  const P = PRESET[frame] || PRESET["균형형"];
  const H = v.height || 170, S = v.shoulder || 40, W = v.waist || 28, L = v.leg || 77;
  const ref = BF.REF ? BF.REF[(sex === "F" ? "F" : "M") + "20"] : null;
  const refHip = ref ? ref.hipW[0] : (sex === "F" ? 33.4 : 33.8), refChest = ref ? ref.chestW[0] : (sex === "F" ? 27.5 : 31.4), refS = ref ? ref.shoulder[0] : 40;
  const depth = (bmiRatio ? Math.pow(bmiRatio, 0.55) : 1) * P.depth;
  const hipW = Math.max(W * 1.12, refHip * (S / refS) ** 0.3 * P.hip * (sex === "F" ? 1.04 : 1)) ;
  const chestW = refChest * (S / refS) * P.chest;
  const headH = 23 * H / 174, neckH = 4.5 * H / 174;
  const ySh = H - headH - neckH, yCrotch = L, yHip = L + 9 * H / 174, yWaist = ySh + (yHip - ySh) * 0.62, yChest = ySh - 13 * H / 174;
  const d = k => k * depth;
  const torso = smooth([
    { y: ySh + 3, rx: S / 2 * 0.58, rz: d(9.2) },
    { y: ySh + 0.5, rx: S / 2 * 0.90, rz: d(10.2) },
    { y: ySh - 4, rx: S / 2 * 0.99, rz: d(11.0) },
    { y: yChest, rx: chestW / 2 + 1.5, rz: d(sex === "F" ? 12.6 : 11.8) },
    { y: ySh - 24 * H / 174, rx: chestW / 2 * 0.95, rz: d(10.8) },
    { y: yWaist, rx: W / 2, rz: d(9.4 * (W / 28) ** 0.6) },
    { y: yHip, rx: hipW / 2, rz: d(12.4) },
    { y: yCrotch + 2, rx: hipW / 2 * 0.92, rz: d(11.5) }
  ], 4);
  const legX = hipW * 0.25, legTopR = hipW * 0.24, yKnee = L * 0.53;
  const leg = sgn => smooth([
    { y: yCrotch + 6, x: sgn * legX, rx: legTopR, rz: d(legTopR * 1.08) },
    { y: yCrotch - 6, x: sgn * legX, rx: legTopR * 0.96, rz: d(legTopR * 1.05) },
    { y: yKnee + 4, x: sgn * legX * 0.98, rx: legTopR * 0.66, rz: d(legTopR * 0.7) },
    { y: yKnee - 6, x: sgn * legX * 0.96, rx: legTopR * 0.66, rz: d(legTopR * 0.72) },
    { y: L * 0.25, x: sgn * legX * 0.92, rx: legTopR * 0.6, rz: d(legTopR * 0.68) },
    { y: 7, x: sgn * legX * 0.9, rx: 3.6, rz: d(4.2) },
    { y: 4, x: sgn * legX * 0.9, rx: 3.8, rz: d(4.4) }
  ], 3);
  const armR = 5.3 * depth * (S / refS) ** 0.5, yWrist = yHip - 4;
  const arm = sgn => smooth([
    { y: ySh + 1, x: sgn * (S / 2 - 1), rx: armR * 0.95, rz: armR },
    { y: ySh - 10, x: sgn * (S / 2 + 2.5), rx: armR, rz: armR * 1.05 },
    { y: ySh - 26 * H / 174, x: sgn * (S / 2 + 5), rx: armR * 0.82, rz: armR * 0.85 },
    { y: yWaist, x: sgn * (S / 2 + 6.5), rx: armR * 0.72, rz: armR * 0.75 },
    { y: yWrist, x: sgn * (hipW / 2 + 7), rx: 2.9, rz: 3.3 }
  ], 3);
  return { H, S, W, L, hipW, chestW, headH, neckH, ySh, yCrotch, yHip, yWaist, yChest, yKnee, yWrist, legX, legTopR, armR, depth, torso, legL: leg(-1), legR: leg(1), armL: arm(-1), armR: arm(1), sgnArm: arm };
}

/* ---------- 의류 셸 ---------- */
function garmentMeshes(gm, B, mat) {
  const ease = gm.sizeCm ? Math.max(0.5, (gm.sizeCm - B.S) / 2) : 2;   // 어깨 여유 → 반경 여유
  const draw = gm.draw || (gm.kind === "bottom" ? "jeans" : gm.kind === "outer" ? "coat" : gm.kind === "shoes" ? "sneaker" : "tee");
  const out = [];
  const grow = (rings, e) => rings.map(r => ({ ...r, rx: r.rx + e, rz: r.rz + e * 0.9 }));
  const between = (rings, yTop, yBot) => rings.filter(r => r.y <= yTop + 0.01 && r.y >= yBot - 0.01);
  const uvBox = () => ({ w: B.S + 2 * ease + 24, top: B.ySh + 4, h: B.ySh - B.yHip + 40 });
  if (["tee", "shirt", "hoodie", "coat"].includes(draw)) {
    const hem = draw === "coat" ? B.yKnee - 2 : draw === "hoodie" ? B.yHip - 6 : B.yHip - 3;
    const torso = B.torso.filter(r => r.y >= B.yHip - 2).map(r => { const f = Math.max(0.35, Math.min(1, (B.ySh - r.y + 4) / 16)); const e = (ease + 1.2) * f; return { ...r, rx: r.rx + e, rz: r.rz + e * 0.9 }; });
    // 밑단까지 연장
    const last = torso[torso.length - 1];
    torso.push({ ...last, y: hem, rx: last.rx * (draw === "coat" ? 1.12 : 1.0), rz: last.rz * (draw === "coat" ? 1.1 : 1.0) });
    out.push(new THREE.Mesh(loft(torso, { closeTop: false, closeBottom: false, uv: gm.mine ? uvBox() : null }), mat));
    const sleeveEnd = draw === "tee" ? B.ySh - 22 * B.H / 174 : B.yWrist + 1;
    [B.armL, B.armR].forEach(arm => { const rings = arm.filter(r => r.y >= sleeveEnd - 0.01).map((r, i) => { const e = (ease * 0.5 + 1.4) * (i < 2 ? 0.5 : 1); return { ...r, rx: r.rx + e, rz: r.rz + e * 0.9 }; }); if (rings.length > 1) out.push(new THREE.Mesh(loft(rings, { closeTop: false, closeBottom: false }), mat)); });
    if (draw === "hoodie") out.push(new THREE.Mesh(ell(B.S / 2 * 0.7, 7, 7 + ease, 0, B.ySh + 4, -4), mat));
  } else if (["jeans", "wide", "shorts"].includes(draw)) {
    const wEase = draw === "wide" ? 5.5 : 1.6; const hem = draw === "shorts" ? B.yKnee + 4 : 3;
    const band = grow(B.torso.filter(r => r.y <= B.yWaist + 0.01), 1.2);
    out.push(new THREE.Mesh(loft(band, { closeTop: false, closeBottom: false }), mat));
    [B.legL, B.legR].forEach(leg => {
      let rings = grow(leg.filter(r => r.y >= hem), wEase);
      if (draw === "wide") rings = rings.map((r, i) => ({ ...r, rx: r.rx + i / rings.length * 3, rz: r.rz + i / rings.length * 2 }));
      if (draw === "jeans") rings = rings.map(r => ({ ...r, rx: Math.max(r.rx, 7.4), rz: Math.max(r.rz, 7.8) }));
      out.push(new THREE.Mesh(loft(rings, { closeTop: false, closeBottom: false }), mat));
    });
  } else if (draw === "sneaker") {
    [-1, 1].forEach(s => { const g = ell(6.2, 5.2, 14, s * B.legX * 0.92, 4.4, 3.5); out.push(new THREE.Mesh(g, mat)); });
  }
  return out;
}

/* ---------- 씬 ---------- */
class Avatar3D {
  constructor(el) {
    this.el = el;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio)); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    this.camera.position.set(0.6, 1.1, 4.2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.95, 0); this.controls.enableDamping = true; this.controls.enablePan = false; this.controls.minDistance = 2.2; this.controls.maxDistance = 7; this.controls.maxPolarAngle = Math.PI * 0.58;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x3a4050, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2, 4, 3); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xdfe7ff, 0.6); fill.position.set(-3, 2, -2); this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.5); rim.position.set(0, 3, -4); this.scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.75, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0 })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.002; this.scene.add(floor);
    this.group = new THREE.Group(); this.scene.add(this.group);
    this.bodyMat = new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 0.92, metalness: 0.0 });
    this.seamMat = new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.9 });
    this.baseMat = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.6, metalness: 0.2 });
    this.resize(); new ResizeObserver(() => this.resize()).observe(el);
    const tick = () => { this.controls.update(); this.renderer.render(this.scene, this.camera); requestAnimationFrame(tick); }; tick();
    this.texCache = new Map();
  }
  snapshot(w = 900, h = 1200) {
    const el = this.renderer.domElement; const size = new THREE.Vector2(); this.renderer.getSize(size);
    const camPos = this.camera.position.clone(), aspect = this.camera.aspect, tgt = this.controls.target.clone();
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    const H = (this.lastH || 170) * 0.01; const dir = camPos.clone().sub(tgt).normalize();
    this.controls.target.set(0, H * 0.5, 0); this.camera.position.copy(this.controls.target).add(dir.multiplyScalar(H * 1.95)); this.camera.lookAt(this.controls.target);
    this.camera.updateProjectionMatrix(); this.renderer.render(this.scene, this.camera);
    const url = el.toDataURL("image/png");
    this.renderer.setSize(size.x, size.y, false); this.camera.aspect = aspect; this.camera.position.copy(camPos); this.controls.target.copy(tgt); this.camera.updateProjectionMatrix();
    return url;
  }
  resize() { const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  update({ values, sex, frame, bmiRatio, garments }) {
    this.group.clear();
    const B = bodyRings(values, sex, frame, bmiRatio);
    const add = (geo, mat = this.bodyMat) => { const m = new THREE.Mesh(geo, mat); this.group.add(m); return m; };
    add(loft(B.torso)); add(loft(B.legL)); add(loft(B.legR)); add(loft(B.armL)); add(loft(B.armR));
    add(ell(B.headH * 0.36, B.headH / 2, B.headH * 0.4, 0, B.H - B.headH / 2, 0));
    add(new THREE.CylinderGeometry(4.6 * B.depth, 5.2 * B.depth, B.neckH + 4, 24).translate(0, B.ySh + B.neckH / 2 + 0.5, -0.5));
    [-1, 1].forEach(s => { add(ell(4.2, 2.2, 12.5, s * B.legX * 0.9, 2.4, 3.2)); });                 // 발
    [-1, 1].forEach(s => { add(ell(3.2, 6.5, 2.2, s * (B.hipW / 2 + 7.2), B.yWrist - 7, 0)); });      // 손
    // 마네킹 관절 링(목·어깨·손목·허벅지) + 받침대
    const ring = (r, y, x = 0, z = 0, rz = r) => { const g = new THREE.TorusGeometry(1, 0.35, 8, 40); g.scale(r, r, 1); g.rotateX(Math.PI / 2); g.translate(x, y, z); return add(g, this.seamMat); };
    ring(B.neckW * 1.15 || 5, B.ySh + B.neckH - 1);
    [-1, 1].forEach(sg => { ring(B.armR * 0.98, B.ySh - 3, sg * (B.S / 2 + 1.5)); ring(3.1, B.yWrist + 1, sg * (B.hipW / 2 + 7)); ring(B.legTopR * 0.97, B.yCrotch + 1, sg * B.legX); });
    add(new THREE.CylinderGeometry(B.hipW * 0.9, B.hipW * 0.95, 1.6, 48).translate(0, 0.8, 0), this.baseMat);
    add(new THREE.CylinderGeometry(B.hipW * 0.95, B.hipW * 1.0, 0.6, 48).translate(0, 0.3, 0), this.baseMat);
    // 의류
    (garments || []).slice().sort((a, b) => (BF.KIND_ORDER?.[a.kind] ?? 0) - (BF.KIND_ORDER?.[b.kind] ?? 0)).forEach((gm, i) => {
      let mat;
      if (gm.mine) { let tex = this.texCache.get(gm.url); if (!tex) { tex = new THREE.TextureLoader().load(gm.url); tex.colorSpace = THREE.SRGBColorSpace; this.texCache.set(gm.url, tex); }
        mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.85, side: THREE.DoubleSide, alphaTest: 0.2 }); }
      else mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(gm.color || "#888"), roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 - i });
      garmentMeshes(gm, B, mat).forEach(m => this.group.add(m));
    });
    this.group.scale.setScalar(0.01); this.lastH = B.H;
    this.controls.target.set(0, B.H * 0.0052, 0);
  }
}

BF.av3d = { inst: null, mount(el) { if (!this.inst) this.inst = new Avatar3D(el); return this.inst; }, update(p) { if (this.inst) this.inst.update(p); } };
window.dispatchEvent(new Event("av3d-ready"));
