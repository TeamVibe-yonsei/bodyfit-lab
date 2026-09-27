/* BodyFit Lab — 사진 → 기준점 → 치수 */
window.BF = window.BF || {};

BF.POINTS = [
  { k: "head",   n: 1, label: "머리 꼭대기", tip: "정수리 끝(머리카락 포함 최상단)" },
  { k: "heel",   n: 2, label: "발바닥",     tip: "발이 바닥에 닿는 지점" },
  { k: "shL",    n: 3, label: "왼쪽 어깨점", tip: "화면 기준 왼쪽 어깨의 바깥 뼈점" },
  { k: "shR",    n: 4, label: "오른쪽 어깨점", tip: "화면 기준 오른쪽 어깨의 바깥 뼈점" },
  { k: "wL",     n: 5, label: "허리 왼쪽 끝", tip: "허리가 가장 잘록한 높이의 왼쪽 윤곽" },
  { k: "wR",     n: 6, label: "허리 오른쪽 끝", tip: "같은 높이의 오른쪽 윤곽" },
  { k: "crotch", n: 7, label: "샅(가랑이)",  tip: "두 다리가 갈라지는 지점" }
];
BF.DEFAULT_FRAC = { head: [.5, .05], heel: [.5, .96], shL: [.40, .22], shR: [.60, .22], wL: [.44, .42], wR: [.56, .42], crotch: [.5, .55] };

BF.Stage = class {
  constructor(canvas, onChange) {
    this.cv = canvas; this.ctx = canvas.getContext("2d"); this.onChange = onChange;
    this.img = null; this.pts = null; this.drag = null; this.hover = null;
    const down = e => this.down(e), move = e => this.move(e), up = () => this.up();
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    canvas.addEventListener("pointerleave", () => { if (!this.drag) { this.hover = null; this.draw(); } });
  }
  setImage(img) {
    const maxW = 900; const r = img.height / img.width;
    this.cv.width = Math.min(maxW, img.width); this.cv.height = Math.round(this.cv.width * r);
    this.img = img; this.resetPoints(); this.draw();
  }
  resetPoints() {
    this.pts = {};
    for (const k in BF.DEFAULT_FRAC) this.pts[k] = { x: BF.DEFAULT_FRAC[k][0] * this.cv.width, y: BF.DEFAULT_FRAC[k][1] * this.cv.height };
    this.onChange && this.onChange();
  }
  setPoints(p) { this.pts = p; this.draw(); this.onChange && this.onChange(); }
  pos(e) { const r = this.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.cv.width / r.width, y: (e.clientY - r.top) * this.cv.height / r.height }; }
  nearest(q) {
    let best = null, bd = 1e9;
    for (const k in this.pts) { const d = Math.hypot(this.pts[k].x - q.x, this.pts[k].y - q.y); if (d < bd) { bd = d; best = k; } }
    const scale = this.cv.width / this.cv.getBoundingClientRect().width;
    return bd < 26 * scale ? best : null;
  }
  down(e) { if (!this.img) return; const q = this.pos(e); const k = this.nearest(q); if (k) { this.drag = k; this.cv.setPointerCapture?.(e.pointerId); e.preventDefault(); } }
  move(e) {
    if (!this.img) return; const q = this.pos(e);
    if (this.drag) {
      this.pts[this.drag] = { x: Math.max(0, Math.min(this.cv.width, q.x)), y: Math.max(0, Math.min(this.cv.height, q.y)) };
      this.draw(); this.onChange && this.onChange(); e.preventDefault();
    } else { const h = this.nearest(q); if (h !== this.hover) { this.hover = h; this.draw(); } this.cv.style.cursor = h ? "grab" : "default"; }
  }
  up() { this.drag = null; }
  draw() {
    const { ctx, cv, pts } = this; ctx.clearRect(0, 0, cv.width, cv.height);
    if (!this.img) return; ctx.drawImage(this.img, 0, 0, cv.width, cv.height);
    const s = cv.width / 720;
    const seg = (a, b, color, dash) => { ctx.save(); ctx.lineWidth = 3 * s; ctx.strokeStyle = color; if (dash) ctx.setLineDash([8 * s, 6 * s]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore(); };
    seg(pts.head, { x: pts.head.x, y: pts.heel.y }, "rgba(232,149,90,.85)", true);
    seg(pts.shL, pts.shR, "rgba(59,111,224,.95)"); seg(pts.wL, pts.wR, "rgba(59,111,224,.95)");
    seg(pts.crotch, { x: pts.crotch.x, y: pts.heel.y }, "rgba(59,111,224,.95)");
    BF.POINTS.forEach(P => {
      const p = pts[P.k]; const R = (this.hover === P.k || this.drag === P.k ? 15 : 12) * s;
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
      ctx.fillStyle = "#E0653B"; ctx.fill(); ctx.lineWidth = 2.5 * s; ctx.strokeStyle = "#fff"; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = `bold ${13 * s}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(P.n, p.x, p.y + 0.5 * s);
    });
  }
  measure(heightCm) {
    if (!this.img || !this.pts) return {};
    const p = this.pts, pxH = Math.abs(p.heel.y - p.head.y);
    if (pxH < 10 || !heightCm) return {};
    const k = heightCm / pxH, d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    return { height: heightCm, shoulder: d(p.shL, p.shR) * k, waist: d(p.wL, p.wR) * k, leg: Math.abs(p.heel.y - p.crotch.y) * k,
      pxPerCm: 1 / k };
  }
};

/* ---------- MediaPipe Pose (self-hosted, vendor/pose) ---------- */
BF.pose = { inst: null, ready: false, base: "vendor/pose/" };
BF.pose.load = async function () {
  if (this.inst) return this.inst;
  if (typeof Pose === "undefined") throw new Error("pose.js 미로드");
  this.inst = new Pose({ locateFile: f => this.base + f });
  this.inst.setOptions({ modelComplexity: 1, smoothLandmarks: false, enableSegmentation: false, minDetectionConfidence: 0.5 });
  await this.inst.initialize();
  this.ready = true; return this.inst;
};
BF.pose.detect = async function (img) {
  const inst = await this.load();
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), 20000);
    inst.onResults(r => { clearTimeout(t); resolve(r); });
    inst.send({ image: img }).catch(e => { clearTimeout(t); reject(e); });
  });
};
/* 랜드마크 → 7개 기준점 (어깨는 관절 중심이므로 바깥으로 확장, 허리·샅은 비율 근사) */
BF.pose.toPoints = function (L, W, H) {
  const P = i => ({ x: L[i].x * W, y: L[i].y * H, v: L[i].visibility ?? 1 });
  const sl = P(11), sr = P(12), hl = P(23), hr = P(24), nose = P(0), eL = P(7), eR = P(8);
  const heels = [P(29), P(30), P(27), P(28), P(31), P(32)];
  const bottomY = Math.max(...heels.map(h => h.y));
  const shMid = { x: (sl.x + sr.x) / 2, y: (sl.y + sr.y) / 2 }, hipMid = { x: (hl.x + hr.x) / 2, y: (hl.y + hr.y) / 2 };
  const torso = hipMid.y - shMid.y; const shW = Math.abs(sl.x - sr.x);
  const earMidY = (eL.y + eR.y) / 2;
  const headTopY = earMidY - (shMid.y - earMidY) * 0.95; // 귀 높이에서 위로 (얼굴 높이 근사)
  const dir = Math.sign(sl.x - sr.x) || 1;
  const wy = shMid.y + torso * 0.66, wx = Math.abs(hl.x - hr.x) * 0.82;
  const clamp = p => ({ x: Math.min(Math.max(p.x, 0), W - 1), y: Math.min(Math.max(p.y, 0), H - 1) });
  const conf = [sl, sr, hl, hr, nose].reduce((a, p) => a + p.v, 0) / 5;
  return { pts: {
    head: clamp({ x: nose.x, y: headTopY }),
    heel: clamp({ x: (heels[0].x + heels[1].x) / 2, y: bottomY }),
    shL: clamp({ x: sl.x + dir * shW * 0.07, y: sl.y }), shR: clamp({ x: sr.x - dir * shW * 0.07, y: sr.y }),
    wL: clamp({ x: hipMid.x + dir * wx / 2, y: wy }), wR: clamp({ x: hipMid.x - dir * wx / 2, y: wy }),
    crotch: clamp({ x: hipMid.x, y: hipMid.y + torso * 0.20 })
  }, confidence: conf };
};
