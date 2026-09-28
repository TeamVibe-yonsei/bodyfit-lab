/* Team Vibe — 핏 미리보기: 체형 마네킹의 몸 윤곽(프로필)에 맞춰 옷을 그리는 결정론적 렌더러
 * 입력: 마네킹 키(성별·체형), 사용자 치수(어깨너비·허리너비·키), 착용 옷 목록(사이즈 cm)
 * 출력: viewBox 320×420 SVG 내부 마크업. 옷의 폭 = 몸 폭 + 여유량(의류 치수 − 몸 치수)이므로 사이즈를 바꾸면 여유가 눈에 보임 */
window.BF = window.BF || {};

(function () {
  const VW = 320, VH = 420;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const r = clamp(((n >> 16) & 255) * f, 0, 255), g = clamp(((n >> 8) & 255) * f, 0, 255), b = clamp((n & 255) * f, 0, 255); return `rgb(${r | 0},${g | 0},${b | 0})`; };
  const f1 = v => (Math.round(v * 10) / 10).toString();
  const P = (x, y) => `${f1(x)} ${f1(y)}`;

  /* 행 목록 [[y,l,r],…] → y로 보간하는 함수 */
  function rowFn(rows) {
    if (!rows || !rows.length) return () => null;
    const R = rows.slice().sort((a, b) => a[0] - b[0]);
    // 5행 중앙값 평활
    const S = R.map((r, i) => { const w = R.slice(Math.max(0, i - 2), i + 3); const ls = w.map(x => x[1]).sort((a, b) => a - b), rs = w.map(x => x[2]).sort((a, b) => a - b); return [r[0], ls[ls.length >> 1], rs[rs.length >> 1]]; });
    const y0 = S[0][0], y1 = S[S.length - 1][0];
    const fn = y => {
      if (y <= y0) return [S[0][1], S[0][2]]; if (y >= y1) return [S[S.length - 1][1], S[S.length - 1][2]];
      let lo = 0, hi = S.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m][0] <= y) lo = m; else hi = m; }
      const a = S[lo], b = S[hi], t = (y - a[0]) / Math.max(1, b[0] - a[0]);
      return [lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    };
    fn.y0 = y0; fn.y1 = y1; return fn;
  }

  /* 몸 모델 (viewBox 좌표) */
  BF.fitBody = function (key, values) {
    const A = BF.MANNEQUIN[key]; if (!A || !A.profile) return null;
    const sc = VH / A.h, offX = (VW - A.w * sc) / 2, X = x => offX + x * sc, Y = y => y * sc;
    const cv = rows => rows.map(([y, l, r]) => [Y(y), X(l), X(r)]);
    const p = A.profile;
    const torso = rowFn(cv(p.torso)), armL = rowFn(cv(p.armL)), armR = rowFn(cv(p.armR)), legL = rowFn(cv(p.legL)), legR = rowFn(cv(p.legR));
    const top = Y(A.top), bottom = Y(A.bottom), bodyH = bottom - top;
    const cx = X((A.shL + A.shR) / 2);
    const neckY = p.neck ? Y(p.neck[0]) : Y(A.shY) - bodyH * .08, neckHalf = p.neck ? (X(p.neck[2]) - X(p.neck[1])) / 2 : bodyH * .035;
    const shoulderY = Y(A.shY) - bodyH * .062;               // 어깨선(삼각근 최대폭 행보다 조금 위)
    const shRow = torso(shoulderY); const shHalf = shRow ? (shRow[1] - shRow[0]) / 2 * .97 : (X(A.shR) - X(A.shL)) / 2 * .9;   // 어깨 가쪽점 근사
    const armpitY = armL.y0 ? Math.max(armL.y0, armR.y0 || 0) : shoulderY + bodyH * .07;
    const waistY = Y(A.wY), crotchY = Y(A.crotch);
    const H = values.height || 170, Sv = values.shoulder || (key[0] === "F" ? 36 : 40), Wv = values.waist || (key[0] === "F" ? 25 : 28);
    const k = (shHalf * 2) / Sv;                            // px/cm (어깨 기준: 옷 여유량이 몸 대비 비율로 보이도록)
    const kLow = bodyH / H;                                  // px/cm (키 기준)
    // 팔이 몸통에 붙어 있는 구간(어깨~겨드랑이)은 행 폭에서 팔 두께를 빼서 몸통 폭 추정
    const aL0 = armL(armpitY + 6), aR0 = armR(armpitY + 6);
    const armW = ((aL0 ? aL0[1] - aL0[0] : shHalf * .3) + (aR0 ? aR0[1] - aR0[0] : shHalf * .3)) / 2;
    const apL = armL.y0 || armpitY, apR = armR.y0 || armpitY;
    const torsoSide = y => {                                 // 몸통 좌우 (팔 제외) — 좌우 각각 팔이 붙은 구간은 팔 두께를 빼고, 떨어진 구간은 팔 안쪽 경계로 제한
      const row = (torso(y) || [cx - shHalf * .8, cx + shHalf * .8]).slice();
      const a = armL(y), b = armR(y);
      if (y < apL || !a) { const t = clamp((y - shoulderY) / Math.max(1, apL - shoulderY), 0, 1); row[0] += armW * (t * t * (3 - 2 * t)); }
      else if (a[1] > row[0] && a[1] < cx) row[0] = Math.max(row[0], a[1] + 1);
      if (y < apR || !b) { const t = clamp((y - shoulderY) / Math.max(1, apR - shoulderY), 0, 1); row[1] -= armW * (t * t * (3 - 2 * t)); }
      else if (b[0] < row[1] && b[0] > cx) row[1] = Math.min(row[1], b[0] - 1);
      return row;
    };
    const armOuter = (y, side) => { const a = (side < 0 ? armL : armR)(y); if (a && y >= (side < 0 ? apL : apR)) return side < 0 ? a[0] : a[1]; const t = torso(y); return t ? (side < 0 ? t[0] : t[1]) : (side < 0 ? cx - shHalf : cx + shHalf); };
    const armInner = (y, side) => { const a = (side < 0 ? armL : armR)(y); if (a && y >= (side < 0 ? apL : apR)) return side < 0 ? a[1] : a[0]; const t = torsoSide(y); return side < 0 ? t[0] : t[1]; };
    let hipY = waistY, hipW = 0; for (let y = waistY; y <= crotchY; y += 2) { const t = torso(y); if (t && t[1] - t[0] > hipW) { hipW = t[1] - t[0]; hipY = y; } }
    const handY = Y(p.handY), wristY = handY - bodyH * .07, elbowY = shoulderY + (handY - shoulderY) * .45;
    const ankleY = Math.min(legL.y1 || bottom, legR.y1 || bottom, bottom - bodyH * .05), thighY = crotchY + bodyH * .06;
    const arms = A.arms ? { href: BF.mannArmsUrl ? BF.mannArmsUrl(key) : "img/mannequin/" + key + "-arms.png", x: X(A.arms.x), y: Y(A.arms.y), w: A.arms.w * sc, h: A.arms.h * sc } : null;
    return { key, sc, offX, imgW: A.w * sc, imgH: A.h * sc, url: BF.mannUrl(key), cx, top, bottom, bodyH, neckY, neckHalf, shoulderY, shHalf, armpitY, waistY, hipY, hipHalf: hipW / 2, crotchY, thighY, ankleY, handY, wristY, elbowY,
      k, kLow, Sv, Wv, H, torsoSide, armOuter, armInner, legL: y => legL(y), legR: y => legR(y), arms,
      // 이미지 배치용(업로드 옷) 호환 필드
      shY: shoulderY, crotchY2: crotchY, sh: shHalf * 2 * 1.12, wa: 0, hip: hipW, S: Sv, W: Wv, L: values.leg || 78 };
  };

  /* ---------- 옷 그리기 ---------- */
  const SLEEVE = { tee: "short", hoodie: "long", shirt: "long", coat: "long" };
  function topPath(B, gm) {
    const c = gm.color || "#DDD", draw = gm.draw || "tee";
    const gHalf = gm.sizeCm ? gm.sizeCm * B.k / 2 : B.shHalf + 3;     // 의류 어깨 반폭(px)
    const e = gHalf - B.shHalf;                                        // 여유량(px), 음수면 타이트
    const t = clamp((e + 1.5) / 9, 0, 1);                              // 0 타이트 ~ 1 오버
    const chest = B.torsoSide(B.armpitY + 8); const chestHalfL = B.cx - chest[0], chestHalfR = chest[1] - B.cx;
    const lenBase = { tee: .78, hoodie: .9, shirt: .95, coat: 1.45 }[draw] || .8;
    const hemY = B.shoulderY + (B.crotchY - B.shoulderY) * lenBase + Math.max(0, e) * .5;
    const sideX = (y, side) => {                                        // 몸판 좌우 x
      const ts = B.torsoSide(Math.min(y, B.crotchY)); const body = side < 0 ? B.cx - ts[0] : ts[1] - B.cx;
      const chestHalf = side < 0 ? chestHalfL : chestHalfR;
      const tight = body + 1.5, loose = Math.max(body + 2, chestHalf + Math.max(e, 1.5) + (draw === "coat" ? (y - B.armpitY) * .04 : 0));
      const half = lerp(tight, loose, t);
      return B.cx + side * half;
    };
    // 몸판: 왼쪽 어깨점 → 왼쪽 옆선 → 밑단 → 오른쪽 옆선 → 오른쪽 어깨점 → 어깨선(목 쪽으로 올라감) → 목선
    const shL = B.cx - gHalf, shR = B.cx + gHalf, shY = B.shoulderY - (draw === "coat" ? 2 : 1);
    const nTop = B.neckY + (B.shoulderY - B.neckY) * .42;                // 목 옆점 높이(어깨선이 목 쪽으로 올라감)
    const steps = 14; let d = `M ${P(shL, shY)} `;
    for (let i = 0; i <= steps; i++) { const y = lerp(B.armpitY - 2, hemY, i / steps); d += `L ${P(sideX(y, -1), y)} `; }
    for (let i = steps; i >= 0; i--) { const y = lerp(B.armpitY - 2, hemY, i / steps); d += `L ${P(sideX(y, 1), y)} `; }
    d += `L ${P(shR, shY)} `;
    // 목선
    const nH = B.neckHalf * (draw === "tee" ? 1.15 : draw === "hoodie" ? 1.25 : 1.05), nd = B.neckHalf * (draw === "shirt" || draw === "coat" ? 1.6 : .9);
    d += `L ${P(B.cx + nH, nTop)} Q ${P(B.cx, nTop + nd * 1.6)} ${P(B.cx - nH, nTop)} Z`;
    let s = `<path d="${d}" fill="${c}" stroke="${shade(c, .72)}" stroke-width="1" stroke-linejoin="round"/>`;
    s += `<path d="${d}" fill="url(#fitShade)" pointer-events="none"/>`;
    // 소매
    const kind = SLEEVE[draw] || "short";
    const endY = kind === "short" ? B.shoulderY + (B.elbowY - B.shoulderY) * (.9 + Math.max(0, e) * .02) : B.wristY;
    const pad = 2 + Math.max(0, e) * .45;
    for (const side of [-1, 1]) {
      const sx = side < 0 ? shL : shR; let p = `M ${P(sx, shY)} `;
      const n = kind === "short" ? 4 : 10;
      const slant = kind === "short" ? 0 : 2;
      for (let i = 1; i <= n; i++) { const y = lerp(B.shoulderY, endY, i / n); p += `L ${P(B.armOuter(y, side) + side * pad, y)} `; }
      const apY = B.armpitY - 2, apX = sideX(apY, side) - side * .6;           // 겨드랑이: 몸판 옆선과 같은 점에서 만남
      for (let i = n; i >= 0; i--) { const y = lerp(apY, endY - slant, i / n); if (y < B.armpitY) continue; p += `L ${P(B.armInner(y, side) - side * Math.min(pad, 1.5), y)} `; }
      p += `L ${P(apX, apY)} `;
      p += "Z";
      s += `<path d="${p}" fill="${c}" stroke="${shade(c, .72)}" stroke-width="1" stroke-linejoin="round"/><path d="${p}" fill="url(#fitShade)" pointer-events="none"/>`;
      // 소매 끝단 선
      s += `<path d="M ${P(B.armOuter(endY, side) + side * pad, endY)} L ${P(B.armInner(endY - slant, side) - side * 1.5, endY - slant)}" stroke="${shade(c, .6)}" stroke-width="1" opacity=".7"/>`;
    }
    // 디테일
    const dk = shade(c, .6), lt = shade(c, 1.12);
    if (draw === "tee") s += `<path d="M ${P(B.cx - nH, nTop)} Q ${P(B.cx, nTop + nd * 1.6)} ${P(B.cx + nH, nTop)}" fill="none" stroke="${dk}" stroke-width="2.2"/>`;
    if (draw === "shirt") {
      s += `<path d="M ${P(B.cx - nH, nTop)} L ${P(B.cx - nH * .35, nTop + nd * 1.1)} L ${P(B.cx, nTop + nd * 1.5)} L ${P(B.cx + nH * .35, nTop + nd * 1.1)} L ${P(B.cx + nH, nTop)}" fill="none" stroke="${dk}" stroke-width="1.6"/>`;
      s += `<path d="M ${P(B.cx, nTop + nd * 1.5)} L ${P(B.cx, hemY - 2)}" stroke="${dk}" stroke-width="1"/>`;
      for (let i = 0; i < 6; i++) { const y = nTop + nd * 2.2 + (hemY - nTop - nd * 2.6) * i / 5.5; s += `<circle cx="${f1(B.cx)}" cy="${f1(y)}" r="1.3" fill="${dk}"/>`; }
      const py = B.armpitY + 4, px = lerp(B.cx, sideX(py, 1), .42), pw = (sideX(py, 1) - B.cx) * .32; s += `<rect x="${f1(px)}" y="${f1(py)}" width="${f1(pw)}" height="${f1(pw * .95)}" fill="none" stroke="${dk}" stroke-width=".8"/>`;
    }
    if (draw === "hoodie") {
      const hw = nH * 1.7, hy = nTop - nd * 1.2;
      s = `<path d="M ${P(B.cx - hw, nTop + 3)} Q ${P(B.cx - hw * .9, hy)} ${P(B.cx, hy - 3)} Q ${P(B.cx + hw * .9, hy)} ${P(B.cx + hw, nTop + 3)} Z" fill="${shade(c, .85)}" stroke="${shade(c, .68)}" stroke-width="1"/>` + s;
      s += `<path d="M ${P(B.cx - nH, nTop)} Q ${P(B.cx, nTop + nd * 1.8)} ${P(B.cx + nH, nTop)}" fill="none" stroke="${dk}" stroke-width="1.6"/>`;
      s += `<path d="M ${P(B.cx - 3, nTop + nd * 1.4)} L ${P(B.cx - 4, nTop + nd * 3.6)} M ${P(B.cx + 3, nTop + nd * 1.4)} L ${P(B.cx + 4, nTop + nd * 3.6)}" stroke="${dk}" stroke-width="1.4" stroke-linecap="round"/>`;
      const pw = gHalf * 1.1, ph = (hemY - B.waistY) * .55; s += `<rect x="${f1(B.cx - pw / 2)}" y="${f1(hemY - ph - 6)}" width="${f1(pw)}" height="${f1(ph)}" rx="3" fill="${shade(c, .93)}" stroke="${shade(c, .7)}" stroke-width=".9"/>`;
      s += `<path d="M ${P(sideX(hemY - 5, -1) + 1, hemY - 5)} L ${P(sideX(hemY - 5, 1) - 1, hemY - 5)}" stroke="${shade(c, .78)}" stroke-width="1.2"/>`;
    }
    if (draw === "coat") {
      const ly = nTop + nd * 3.2;
      s += `<path d="M ${P(B.cx - nH, nTop)} L ${P(B.cx, ly)} L ${P(B.cx - nH * 1.9, nTop + nd * 1.3)} Z M ${P(B.cx + nH, nTop)} L ${P(B.cx, ly)} L ${P(B.cx + nH * 1.9, nTop + nd * 1.3)} Z" fill="${shade(c, .84)}" stroke="${shade(c, .66)}" stroke-width="1"/>`;
      s += `<path d="M ${P(B.cx, ly)} L ${P(B.cx, hemY - 2)}" stroke="${dk}" stroke-width="1"/>`;
      for (let i = 0; i < 3; i++) { const y = ly + (B.crotchY - ly) * (i + .5) / 3; s += `<circle cx="${f1(B.cx + 3)}" cy="${f1(y)}" r="1.6" fill="${dk}"/>`; }
      const py = B.hipY + 4; s += `<path d="M ${P(sideX(py, -1) + 6, py)} L ${P(B.cx - 8, py)} M ${P(B.cx + 8, py)} L ${P(sideX(py, 1) - 6, py)}" stroke="${dk}" stroke-width="1.2"/>`;
    }
    return { svg: s, e, hemY, sleeve: kind, gHalf };
  }

  function bottomPath(B, gm) {
    const c = gm.color || "#556", draw = gm.draw || "jeans";
    const topY = B.waistY + (B.crotchY - B.waistY) * .28;
    const ts = B.torsoSide(topY); const bodyHalf = (ts[1] - ts[0]) / 2;
    const gHalfRaw = gm.sizeCm ? gm.sizeCm * B.kLow / 2 : bodyHalf * 1.3 + 2;
    const e = gHalfRaw - bodyHalf * 1.3;                          // 의류 허리 반폭 − 몸 허리 반둘레 근사(정면 폭×1.3)
    const gHalf = bodyHalf + Math.max(e, 0);
    const t = clamp((e + 1) / 7, 0, 1);
    const legLen = B.ankleY - B.crotchY;
    const hemY = draw === "shorts" ? B.crotchY + legLen * .3 : B.ankleY + B.bodyH * .005;
    const outer = (y, side) => {                                  // 다리 바깥선
      const L = side < 0 ? B.legL(y) : B.legR(y); if (!L) return B.cx + side * (bodyHalf + 2);
      const edge = side < 0 ? L[0] : L[1], w = L[1] - L[0];
      const thigh = side < 0 ? B.legL(B.thighY) : B.legR(B.thighY); const thEdge = thigh ? (side < 0 ? thigh[0] : thigh[1]) : edge;
      const pad = 1.5 + Math.max(0, e) * .5;
      const u = clamp((y - B.thighY) / Math.max(1, hemY - B.thighY), 0, 1);
      if (draw === "wide") return thEdge + side * (pad + 3 + (w * .22) * u);                     // 아래로 갈수록 넓어짐
      const straight = thEdge + side * pad - side * (w * .08) * u;                                  // 허벅지 폭 유지, 살짝 테이퍼
      return Math.max(side * (edge + side * 1.5), side * straight) * side;
    };
    const inner = (y, side) => {
      const L = side < 0 ? B.legL(y) : B.legR(y); if (!L) return B.cx - side * 2;
      const edge = side < 0 ? L[1] : L[0];
      if (draw === "wide") { const cr = side < 0 ? B.legL(B.crotchY + 4) : B.legR(B.crotchY + 4); const ce = cr ? (side < 0 ? cr[1] : cr[0]) : edge; return Math.min(side * (ce - side * 2), side * (B.cx - side * 4)) * side; }
      const tight = edge - side * 1.2;
      const thigh = side < 0 ? B.legL(B.thighY) : B.legR(B.thighY); const thEdge = thigh ? (side < 0 ? thigh[1] : thigh[0]) : edge;
      return Math.min(side * tight, side * (thEdge - side * 1.5)) * side;
    };
    const hipX = (y, side) => { const s2 = B.torsoSide(y); const body = side < 0 ? B.cx - s2[0] : s2[1] - B.cx; return B.cx + side * Math.max(body + 1.5, lerp(body + 1.5, gHalf, t)); };
    const n = 12; let d = `M ${P(hipX(topY, -1), topY)} `;
    for (let i = 1; i <= 4; i++) { const y = lerp(topY, B.crotchY, i / 4); d += `L ${P(hipX(y, -1), y)} `; }
    for (let i = 1; i <= n; i++) { const y = lerp(B.crotchY, hemY, i / n); d += `L ${P(outer(y, -1), y)} `; }
    d += `L ${P(inner(hemY, -1), hemY)} `;
    for (let i = n - 1; i >= 1; i--) { const y = lerp(B.crotchY, hemY, i / n); d += `L ${P(inner(y, -1), y)} `; }
    d += `L ${P(B.cx, B.crotchY + 1)} `;
    for (let i = 1; i <= n - 1; i++) { const y = lerp(B.crotchY, hemY, i / n); d += `L ${P(inner(y, 1), y)} `; }
    d += `L ${P(inner(hemY, 1), hemY)} L ${P(outer(hemY, 1), hemY)} `;
    for (let i = n - 1; i >= 1; i--) { const y = lerp(B.crotchY, hemY, i / n); d += `L ${P(outer(y, 1), y)} `; }
    for (let i = 4; i >= 0; i--) { const y = lerp(topY, B.crotchY, i / 4); d += `L ${P(hipX(y, 1), y)} `; }
    d += "Z";
    const dk = shade(c, .62);
    let s = `<path d="${d}" fill="${c}" stroke="${shade(c, .7)}" stroke-width="1" stroke-linejoin="round"/><path d="${d}" fill="url(#fitShade)" pointer-events="none"/>`;
    // 허리 밴드·지퍼·포켓·밑단
    s += `<path d="M ${P(hipX(topY, -1), topY + 5)} L ${P(hipX(topY, 1), topY + 5)}" stroke="${shade(c, .82)}" stroke-width="1"/>`;
    s += `<path d="M ${P(B.cx, topY + 5)} L ${P(B.cx, B.crotchY - 2)}" stroke="${dk}" stroke-width="1"/><circle cx="${f1(B.cx)}" cy="${f1(topY + 2.5)}" r="1.3" fill="${dk}"/>`;
    if (draw !== "wide") { const py = topY + 8; s += `<path d="M ${P(hipX(py, -1) + 3, py)} Q ${P(B.cx - 9, py + 9)} ${P(B.cx - 7, py + 14)} M ${P(hipX(py, 1) - 3, py)} Q ${P(B.cx + 9, py + 9)} ${P(B.cx + 7, py + 14)}" fill="none" stroke="${dk}" stroke-width=".9"/>`; }
    if (draw === "wide") s += `<path d="M ${P(lerp(outer(B.thighY, -1), inner(B.thighY, -1), .5), B.thighY)} L ${P(lerp(outer(hemY, -1), inner(hemY, -1), .5), hemY - 2)} M ${P(lerp(outer(B.thighY, 1), inner(B.thighY, 1), .5), B.thighY)} L ${P(lerp(outer(hemY, 1), inner(hemY, 1), .5), hemY - 2)}" stroke="${shade(c, .8)}" stroke-width=".8" opacity=".7"/>`;
    s += `<path d="M ${P(outer(hemY, -1), hemY - 3)} L ${P(inner(hemY, -1), hemY - 3)} M ${P(inner(hemY, 1), hemY - 3)} L ${P(outer(hemY, 1), hemY - 3)}" stroke="${shade(c, .8)}" stroke-width="1"/>`;
    return { svg: s, e, hemY };
  }

  function shoesImg(B, gm) {
    const L = B.legL(B.ankleY - 2), R = B.legR(B.ankleY - 2);
    const span = L && R ? (R[1] - L[0]) : B.hipHalf * 2;
    const w = Math.max(span * 1.45, 40) * (gm.scale || 1), h = w * gm.h / gm.w;
    const x = B.cx - w / 2 + (gm.dx || 0), y = B.bottom - h * .82 + (gm.dy || 0);
    return { svg: `<image data-id="${gm.id}" href="${gm.url}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" preserveAspectRatio="none"/>`, box: { x, y, w, h } };
  }

  /* 업로드 옷(이미지): 몸 모델 기준으로 배치 */
  function imageGarment(B, gm) {
    const kind = gm.kind; let w, x, y; const s = gm.scale || 1;
    if (kind === "top" || kind === "dress" || kind === "outer") { w = (B.shHalf * 2 + (kind === "outer" ? 14 : 9)) * s * 1.18; x = B.cx - w / 2; y = B.shoulderY - 4; }
    else if (kind === "shoes") return shoesImg(B, gm);
    else { w = (B.hipHalf * 2 + 8) * s; x = B.cx - w / 2; y = B.waistY + (B.crotchY - B.waistY) * .25; }
    const h = w * gm.h / gm.w * (gm.ys || 1);
    x += gm.dx || 0; y += gm.dy || 0;
    return { svg: `<image data-id="${gm.id}" href="${gm.url}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" preserveAspectRatio="none"/>`, box: { x, y, w, h } };
  }

  /* 전체 렌더 */
  BF.fitRender = function (B, garments, opts = {}) {
    if (!B) return "";
    const order = { shoes: 0, bottom: 1, dress: 2, top: 3, outer: 4 };
    const gs = garments.slice().sort((a, b) => order[a.kind] - order[b.kind]);
    const gx = B.shHalf * 1.5;
    let s = `<defs><linearGradient id="fitShade" gradientUnits="userSpaceOnUse" x1="${f1(B.cx - gx)}" x2="${f1(B.cx + gx)}" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".18" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".06"/><stop offset=".85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs>`;
    s += `<image class="base" href="${B.url}" x="${f1(B.offX)}" y="0" width="${f1(B.imgW)}" height="${f1(B.imgH)}" preserveAspectRatio="xMidYMid meet"/>`;
    let longSleeve = false, anyTop = gs.some(g => g.kind === "top" || g.kind === "outer" || g.kind === "dress"); const info = [];
    if (anyTop) { const nw = B.neckHalf * 1.15, y0 = B.neckY - 6, y1 = B.shoulderY + 3; s += `<defs><linearGradient id="neckG" x1="0" x2="1"><stop offset="0" stop-color="#C9C9C9"/><stop offset=".35" stop-color="#EDEDED"/><stop offset=".7" stop-color="#E4E4E4"/><stop offset="1" stop-color="#BDBDBD"/></linearGradient></defs><path d="M ${P(B.cx - nw, y0)} L ${P(B.cx - nw * 1.05, y1 - 6)} Q ${P(B.cx - nw * 1.3, y1)} ${P(B.cx - nw * 2.2, y1)} L ${P(B.cx + nw * 2.2, y1)} Q ${P(B.cx + nw * 1.3, y1)} ${P(B.cx + nw * 1.05, y1 - 6)} L ${P(B.cx + nw, y0)} Z" fill="url(#neckG)"/>`; }
    const boxes = {};
    for (const gm of gs) {
      let r;
      if (gm.mine || !gm.draw) { r = imageGarment(B, gm); if (gm.kind === "top" || gm.kind === "outer") { anyTop = true; longSleeve = true; } }
      else if (gm.kind === "shoes") r = shoesImg(B, gm);
      else if (gm.kind === "bottom") { r = bottomPath(B, gm); info.push({ id: gm.id, part: "허리", e: 2 * r.e / B.kLow }); }
      else { r = topPath(B, gm); anyTop = true; if (r.sleeve === "long") longSleeve = true; info.push({ id: gm.id, part: gm.kind === "outer" ? "아우터 어깨" : "어깨", e: 2 * r.e / B.k, gHalf: r.gHalf }); }
      s += `<g data-id="${gm.id}" class="garment">${r.svg}</g>`;
      if (r.box) boxes[gm.id] = r.box;
    }
    // 팔·손 오버레이: 반팔이면 팔꿈치 아래, 긴팔이면 손목 아래만
    if (B.arms) {
      const clipY = longSleeve ? B.wristY : (anyTop ? B.elbowY : B.arms.y);
      s += `<clipPath id="armClip"><rect x="0" y="${f1(clipY)}" width="${VW}" height="${VH}"/></clipPath><image href="${B.arms.href}" x="${f1(B.arms.x)}" y="${f1(B.arms.y)}" width="${f1(B.arms.w)}" height="${f1(B.arms.h)}" clip-path="url(#armClip)" pointer-events="none"/>`;
    }
    // 치수선(여유량)
    if (opts.guides) {
      let gi = 0;
      info.forEach(it => {
        if (it.gHalf) { const y = B.shoulderY - 10 - (gi++) * 14; s += `<g class="fitguide"><path d="M ${P(B.cx - B.shHalf, y + 6)} V ${f1(y - 4)} M ${P(B.cx + B.shHalf, y + 6)} V ${f1(y - 4)} M ${P(B.cx - B.shHalf, y)} H ${f1(B.cx + B.shHalf)}" stroke="#8FB0FF" stroke-width="1"/><path d="M ${P(B.cx - it.gHalf, y - 8)} H ${f1(B.cx + it.gHalf)}" stroke="#FF8A4D" stroke-width="1"/><text x="${f1(B.cx)}" y="${f1(y - 11)}" text-anchor="middle" font-size="8" fill="#FF8A4D">${it.part} 여유 ${it.e >= 0 ? "+" : ""}${it.e.toFixed(1)}cm</text></g>`; }
        else { const y = B.waistY + (B.crotchY - B.waistY) * .28 - 4; s += `<g class="fitguide"><text x="${f1(B.cx)}" y="${f1(y)}" text-anchor="middle" font-size="8" fill="#FF8A4D">${it.part} 여유 ${it.e >= 0 ? "+" : ""}${it.e.toFixed(1)}cm</text></g>`; }
      });
    }
    if (opts.sel && boxes[opts.sel]) { const b = boxes[opts.sel]; s += `<rect x="${f1(b.x)}" y="${f1(b.y)}" width="${f1(b.w)}" height="${f1(b.h)}" fill="none" stroke="#6D95F2" stroke-dasharray="4 3" stroke-width="1" pointer-events="none"/>`; }
    return s;
  };
})();
