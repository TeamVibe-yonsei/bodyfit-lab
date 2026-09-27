/* BodyFit Lab — 백색 아바타(SVG) + 의류 레이어 */
window.BF = window.BF || {};

const VB_W = 320, VB_H = 420;

function catmull(points, closed) {
  // Catmull-Rom → cubic bezier path
  const p = points.slice(); if (closed) { p.unshift(points[points.length - 1]); p.push(points[0], points[1]); }
  let d = `M${p[closed ? 1 : 0][0]},${p[closed ? 1 : 0][1]}`;
  for (let i = closed ? 1 : 0; i < p.length - (closed ? 2 : 1); i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + (closed ? "Z" : "");
}

BF.avatarGeometry = function (v, sex) {
  const H = v.height || 170, S = v.shoulder || 40, W = v.waist || 28, L = v.leg || 77;
  const k = 372 / H, cx = VB_W / 2, top = 22;
  const bottom = top + H * k;
  const headH = H * 0.128 * k, headW = headH * 0.74, neck = H * 0.028 * k;
  const shY = top + headH + neck;
  const crotchY = bottom - L * k;
  const hipY = crotchY - H * 0.055 * k;
  const torso = hipY - shY;
  const waistY = shY + torso * 0.60;
  const sh = S * k, wa = W * k;
  const hipMul = sex === "F" ? 1.30 : 1.16;
  const hip = Math.max(wa * hipMul, sh * (sex === "F" ? 0.98 : 0.86));
  const chest = sh * (sex === "F" ? 0.78 : 0.82);
  return { H, S, W, L, k, cx, top, bottom, headH, headW, neck, shY, crotchY, hipY, waistY, sh, wa, hip, chest,
    neckW: headW * 0.42, armW: sh * 0.15, ankleW: hip * 0.16, kneeY: crotchY + (bottom - crotchY) * 0.47,
    wristY: hipY + H * 0.07 * k, footH: H * 0.02 * k };
};

function roundPoly(pts, r) {
  // 꼭짓점을 반지름 r 로 둥글린 닫힌 다각형 (예측 가능한 실루엣용)
  const n = pts.length; let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const v0 = [p0[0] - p1[0], p0[1] - p1[1]], v1 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l0 = Math.hypot(...v0) || 1, l1 = Math.hypot(...v1) || 1;
    const rr = Math.min(r, l0 / 2.2, l1 / 2.2);
    const a = [p1[0] + v0[0] / l0 * rr, p1[1] + v0[1] / l0 * rr], b = [p1[0] + v1[0] / l1 * rr, p1[1] + v1[1] / l1 * rr];
    d += (i ? "L" : "M") + a[0].toFixed(1) + "," + a[1].toFixed(1) + "Q" + p1[0].toFixed(1) + "," + p1[1].toFixed(1) + " " + b[0].toFixed(1) + "," + b[1].toFixed(1);
  }
  return d + "Z";
}

BF.avatarSvg = function (g, opts = {}) {
  const { cx, shY, waistY, hipY, crotchY, bottom, sh, wa, hip, chest, neckW, armW, ankleW, kneeY, wristY } = g;
  const fill = "var(--av-fill)", stroke = "var(--av-stroke)";
  const torsoH = hipY - shY;
  const M = pts => pts.map(([x, y]) => [2 * cx - x, y]);
  // 몸통
  const torsoL = [[cx - neckW, shY - 2], [cx - sh / 2 + 3, shY + 3], [cx - sh / 2, shY + 12], [cx - chest / 2, shY + torsoH * 0.24],
    [cx - wa / 2, waistY], [cx - hip / 2, hipY], [cx - hip / 2 + 3, crotchY + 6], [cx - 2, crotchY + 10]];
  const torso = roundPoly([...torsoL, ...M(torsoL).reverse()], 10);
  // 다리
  const thighW = hip / 2 - 2, calfW = thighW * 0.62, gap = Math.max(4, hip * 0.07);
  const legL = [[cx - hip / 2, hipY + 2], [cx - hip / 2 + thighW * 0.18, kneeY], [cx - gap - ankleW * 1.1, bottom - 6], [cx - gap - ankleW * 1.1, bottom],
    [cx - gap, bottom], [cx - gap, bottom - 6], [cx - gap - calfW * 0.15, kneeY], [cx - gap * 0.6, crotchY + 2]];
  const legs = roundPoly(legL, 7) + " " + roundPoly(M(legL), 7);
  // 팔
  const armTop = shY + 8, armInner = shY + torsoH * 0.22;
  const armL = [[cx - sh / 2 + 1, armTop], [cx - sh / 2 - armW * 0.35, armTop + 8], [cx - hip / 2 - armW * 1.05, wristY - 4], [cx - hip / 2 - armW * 0.95, wristY + 10],
    [cx - hip / 2 - armW * 0.2, wristY + 8], [cx - chest / 2 - 1, armInner]];
  const arms = roundPoly(armL, 6) + " " + roundPoly(M(armL), 6);
  const handL = `<ellipse cx="${cx - hip / 2 - armW * 0.6}" cy="${wristY + 18}" rx="${armW * 0.42}" ry="${armW * 0.7}"/>`;
  const handR = `<ellipse cx="${cx + hip / 2 + armW * 0.6}" cy="${wristY + 18}" rx="${armW * 0.42}" ry="${armW * 0.7}"/>`;
  const head = `<ellipse cx="${cx}" cy="${g.top + g.headH / 2}" rx="${g.headW / 2}" ry="${g.headH / 2}"/>`;
  const neckR = `<rect x="${cx - neckW}" y="${g.top + g.headH - 6}" width="${neckW * 2}" height="${g.neck + 12}" rx="3"/>`;
  let guides = "";
  if (opts.guides) {
    const gc = "var(--av-guide)", f = 'font-family="var(--mono)" font-size="8"';
    guides += `<g class="guides" stroke="${gc}" fill="${gc}">
      <line x1="${cx - sh / 2}" y1="${shY - 10}" x2="${cx + sh / 2}" y2="${shY - 10}" stroke-width="1"/>
      <text x="${cx}" y="${shY - 14}" text-anchor="middle" ${f} stroke="none">어깨 ${g.S.toFixed(1)}</text>
      <line x1="${cx - wa / 2}" y1="${waistY}" x2="${cx + wa / 2}" y2="${waistY}" stroke-width="1" stroke-dasharray="3 2"/>
      <text x="${cx + hip / 2 + armW + 14}" y="${waistY + 3}" ${f} stroke="none">허리 ${g.W.toFixed(1)}</text>
      <line x1="${cx + hip / 2 + armW + 10}" y1="${waistY}" x2="${cx + wa / 2}" y2="${waistY}" stroke-width=".6" stroke-dasharray="2 2"/>
      <line x1="${cx + hip / 2 + armW + 24}" y1="${crotchY}" x2="${cx + hip / 2 + armW + 24}" y2="${bottom}" stroke-width="1"/>
      <text x="${cx + hip / 2 + armW + 28}" y="${(crotchY + bottom) / 2}" ${f} stroke="none">다리 ${g.L.toFixed(1)}</text>
      <line x1="${cx - hip / 2 - armW - 26}" y1="${g.top}" x2="${cx - hip / 2 - armW - 26}" y2="${bottom}" stroke-width="1" stroke-dasharray="2 3"/>
      <text x="${cx - hip / 2 - armW - 30}" y="${(g.top + bottom) / 2}" ${f} stroke="none" text-anchor="end">키 ${g.H.toFixed(0)}</text>
    </g>`;
  }
  return `<g class="body" fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round">
    <path d="${arms}"/>${handL}${handR}<path d="${torso}"/><path d="${legs}"/>${neckR}<path d="${torso}" clip-path="inset(0 0 ${(bottom - crotchY).toFixed(0)}px 0)" stroke="none"/>${head}
  </g>${guides}`;
};

/* 의류 배경 제거: 가장자리에서 시작하는 flood-fill (배경색과 유사한 연결 영역만 투명 처리) */
BF.removeBackground = function (img, tol = 34) {
  const maxW = 700, r = img.height / img.width;
  const c = document.createElement("canvas"); c.width = Math.min(maxW, img.width); c.height = Math.round(c.width * r);
  const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, c.width, c.height);
  const id = x.getImageData(0, 0, c.width, c.height), d = id.data, W = c.width, H = c.height;
  const corners = [0, (W - 1) * 4, (H - 1) * W * 4, ((H - 1) * W + W - 1) * 4].map(i => [d[i], d[i + 1], d[i + 2]]);
  const bg = corners.reduce((a, b) => [a[0] + b[0] / 4, a[1] + b[1] / 4, a[2] + b[2] / 4], [0, 0, 0]);
  const T = tol * 2.4, T2 = T * T;
  const near = i => { const dr = d[i] - bg[0], dg = d[i + 1] - bg[1], db = d[i + 2] - bg[2]; return dr * dr + dg * dg + db * db < T2; };
  const seen = new Uint8Array(W * H); const stack = [];
  for (let xx = 0; xx < W; xx++) { stack.push(xx, (H - 1) * W + xx); }
  for (let yy = 0; yy < H; yy++) { stack.push(yy * W, yy * W + W - 1); }
  while (stack.length) {
    const p = stack.pop(); if (seen[p]) continue; seen[p] = 1;
    if (!near(p * 4)) continue;
    d[p * 4 + 3] = 0;
    const px = p % W, py = (p - px) / W;
    if (px > 0) stack.push(p - 1); if (px < W - 1) stack.push(p + 1); if (py > 0) stack.push(p - W); if (py < H - 1) stack.push(p + W);
  }
  // 가장자리 부드럽게: 투명 픽셀과 맞닿은 픽셀의 알파를 반감
  const a2 = new Uint8ClampedArray(d.length); a2.set(d);
  for (let p = 0; p < W * H; p++) {
    if (d[p * 4 + 3] === 0) continue;
    const px = p % W, py = (p - px) / W; let n = 0;
    if (px > 0 && d[(p - 1) * 4 + 3] === 0) n++; if (px < W - 1 && d[(p + 1) * 4 + 3] === 0) n++;
    if (py > 0 && d[(p - W) * 4 + 3] === 0) n++; if (py < H - 1 && d[(p + W) * 4 + 3] === 0) n++;
    if (n) a2[p * 4 + 3] = Math.round(d[p * 4 + 3] * (1 - n * 0.22));
  }
  id.data.set(a2); x.putImageData(id, 0, 0);
  // 투명 여백 크롭
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let p = 0; p < W * H; p++) if (a2[p * 4 + 3] > 8) { const px = p % W, py = (p - px) / W; if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; }
  if (maxX <= minX || maxY <= minY) return { url: c.toDataURL("image/png"), w: W, h: H };
  const cc = document.createElement("canvas"); cc.width = maxX - minX + 1; cc.height = maxY - minY + 1;
  cc.getContext("2d").drawImage(c, minX, minY, cc.width, cc.height, 0, 0, cc.width, cc.height);
  return { url: cc.toDataURL("image/png"), w: cc.width, h: cc.height };
};

BF.garmentPlacement = function (gm, g) {
  const s = gm.scale;
  let w, x, y;
  const known = gm.refFrac && gm.sizeCm; // 규격을 아는 아이템: 실제 cm 로 배치
  const kU = g.k, kL = g.kLow || g.k;    // 상체·하체 px/cm (마네킹 뷰는 하체를 키 기준으로)
  if (gm.kind === "top" || gm.kind === "dress") { w = known ? gm.sizeCm * kU / gm.refFrac * s : g.sh * 1.16 * s; x = g.cx - w / 2; y = g.shY - 6; }
  else if (gm.kind === "outer") { w = known ? gm.sizeCm * kU / gm.refFrac * s : g.sh * 1.26 * s; x = g.cx - w / 2; y = g.shY - 8; }
  else if (gm.kind === "shoes") { w = known ? gm.sizeCm * kL / gm.refFrac * s : g.hip * 0.9 * s; x = g.cx - w / 2; y = g.bottom - w * gm.h / gm.w * 0.86; }
  else { w = known ? gm.sizeCm * kL / gm.refFrac * s : g.hip * 1.06 * s; x = g.cx - w / 2; y = g.waistY - 2; }
  const h = w * gm.h / gm.w * gm.ys;
  return { x: x + gm.dx, y: y + gm.dy, w, h };
};
BF.KIND_ORDER = { shoes: 0, bottom: 1, dress: 2, top: 3, outer: 4 };
