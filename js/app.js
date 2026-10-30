/* BodyFit Lab — 화면 제어 v3 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id) || Object.assign(document.createElement("div"), { id });
  const S = { sex: "M", age: "20", manual: {}, est: {}, sample: false, diagnosed: false, photoLoaded: false, editing: null, lastType: null, placeMode: "none", showBasis: false };
  const SAMPLE = { shoulder: 42.5, waist: 27.4, leg: 81.0 };

  /* ---------- 저장/복원 ---------- */
  const LS = "bodyfit.v4";
  const save = () => { try { localStorage.setItem(LS, JSON.stringify({ sex: S.sex, ageIn: $("ageIn").value, height: $("height").value, weight: $("weight").value, chestIn: $("chestIn").value, waistCIn: $("waistCIn").value, manual: S.manual})); } catch (e) { } };
  const load = () => { try { const d = JSON.parse(localStorage.getItem(LS) || "null"); if (!d) return; S.sex = d.sex || "M"; S.manual = d.manual || {}; if (d.ageIn) $("ageIn").value = d.ageIn; if (d.height) $("height").value = d.height; if (d.weight) $("weight").value = d.weight; if (d.chestIn) $("chestIn").value = d.chestIn; if (d.waistCIn) $("waistCIn").value = d.waistCIn; if (d.chestIn || d.waistCIn) $("moreIn").open = true; } catch (e) { } };

  /* ---------- 테마 ---------- */

  /* ---------- 기본 정보 ---------- */
  const ageGroup = () => { const a = parseInt($("ageIn").value, 10); if (!a) return "20"; return a < 20 ? "T" : a <= 26 ? "20" : a <= 39 ? "30" : "40"; };
  const group = () => S.sex + ageGroup();
  $("sexSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.sex = b.dataset.v; [...$("sexSeg").children].forEach(x => x.classList.toggle("on", x === b)); update(); });
  $("ageIn").addEventListener("input", () => update());
  $("height").addEventListener("input", () => update()); $("weight").addEventListener("input", () => update()); $("chestIn").addEventListener("input", () => update()); $("waistCIn").addEventListener("input", () => update());


  /* ---------- 스테이지 ---------- */
  const stage = new BF.Stage($("cv"), () => update());
  const setStatus = (t, cls = "") => { const s = $("status"); s.className = "guide-line " + cls; s.textContent = t; };
  function loadImage(src) {
    const img = new Image();
    img.onload = () => {
      stage.setImage(img); S.photoLoaded = true; S.sample = false; $("placeholder").hidden = true; $("diagBtn").disabled = false; autoDetect();
    };
    img.onerror = () => setStatus("이미지를 열 수 없습니다 JPG/PNG 파일인지 확인하세요", "err");
    img.src = src;
  }
  $("cardToggle").addEventListener("change", e => {
    stage.setUseCard(e.target.checked);
    if (e.target.checked) setStatus("초록 A·B 점을 카드의 긴 변 양 끝에 놓아 주세요 (키는 사진에서 계산됩니다)", "ok");
    else setStatus("숫자를 몸의 올바른 위치에 놓아 주세요");
    update();
  });
  $("photo").addEventListener("change", e => { const f = e.target.files[0]; if (f) loadImage(URL.createObjectURL(f)); e.target.value = ""; });
  async function autoDetect() {
    if (!stage.img) return;
    setStatus("자동으로 위치를 잡는 중…", "busy"); S.placeMode = "none";
    try {
      const res = await BF.pose.detect(stage.img);
      if (!res.poseLandmarks) throw new Error("사람을 찾지 못했습니다");
      const { pts, confidence } = BF.pose.toPoints(res.poseLandmarks, stage.cv.width, stage.cv.height);
      stage.setPoints(pts); S.placeMode = "auto";
      setStatus("숫자를 몸의 올바른 위치에 놓아 주세요", "ok");
    } catch (err) { setStatus("숫자를 몸의 올바른 위치에 놓아 주세요", "err"); }
    if (BF.ai.key()) aiPlace();
  }
  /* Gemini 좌표 찍기로 기준점 정밀 배치 (키가 있으면 사진 올릴 때 자동, 버튼으로 재실행) */
  let aiPlacing = false;
  async function aiPlace() {
    if (!stage.img || aiPlacing) return;
    if (!BF.ai.key()) { setStatus("AI 정밀 배치는 STEP 4에서 Gemini 키를 넣으면 사용할 수 있습니다", "err"); return; }
    aiPlacing = true; $("aiPlaceBtn").disabled = true; setStatus("AI가 기준점을 찾는 중… (5~10초)", "busy");
    try {
      const b64 = await BF.ai.toPng(stage.img.src, 1280);
      const pts = await BF.ai.locatePoints({ b64, useCard: stage.useCard, key: BF.ai.key() });
      const W = stage.cv.width, H = stage.cv.height; const P = {};
      ["head", "heel", "shL", "shR", "wL", "wR", "crotch"].forEach(k => { if (pts[k]) P[k] = { x: pts[k].x * W, y: pts[k].y * H }; });
      const cur = stage.pts || {}; for (const k in cur) if (!P[k]) P[k] = cur[k];
      // 좌우 어깨/허리는 화면 기준으로 정렬
      if (P.shL.x > P.shR.x) [P.shL, P.shR] = [P.shR, P.shL]; if (P.wL.x > P.wR.x) [P.wL, P.wR] = [P.wR, P.wL];
      if (stage.useCard && pts.cardA && pts.cardB) { P.cA = { x: pts.cardA.x * W, y: pts.cardA.y * H }; P.cB = { x: pts.cardB.x * W, y: pts.cardB.y * H }; }
      stage.setPoints(P); if (P.cA) { stage.pts.cA = P.cA; stage.pts.cB = P.cB; stage.draw(); }
      S.placeMode = "ai"; setStatus("AI가 기준점을 놓았습니다 어긋난 점이 있으면 드래그로 고쳐 주세요", "ok"); update();
    } catch (err) { setStatus("AI 배치 실패: " + (err.message || err) + " · 자동 배치 값을 사용해요", "err"); }
    finally { aiPlacing = false; $("aiPlaceBtn").disabled = false; }
  }
  $("aiPlaceBtn").addEventListener("click", aiPlace);
  stage.onUser = () => { S.placeMode = "manual"; };

  /* ---------- 진단 ---------- */
  function diagnose() {
    if (!(parseFloat($("height").value) > 0) && !(S.est.scaleSource === "card" && S.est.height)) { setStatus("키를 입력하거나 카드 정밀 측정을 켜 주세요", "err"); $("height").focus(); return; }
    S.diagnosed = true;
    ["s2", "s3"].forEach((id, i) => { const el = $(id); el.classList.remove("locked"); el.classList.add("reveal"); el.style.animationDelay = (i * 0.12) + "s"; });
    update();
    $("s2").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("diagBtn").addEventListener("click", diagnose);
  ["height", "ageIn", "weight"].forEach(id => $(id).addEventListener("input", () => { if (!S.photoLoaded && Object.values(S.manual).some(v => parseFloat(v) > 0)) $("diagBtn").disabled = false; }));

  /* ---------- 치수: 사진 → 사용값, 직접 입력 시 우선 ---------- */
  function source(k) {
    if (k === "height") return "input";
    const m = parseFloat(S.manual[k]); if (!isNaN(m) && m > 0) return "manual";
    if (S.est[k]) return "photo";
    if (S.sample) return "sample";
    return "none";
  }
  function used(k) {
    const src = source(k);
    if (k === "height") { const inp = parseFloat($("height").value); if (S.est.scaleSource === "card" && S.est.height) return inp || S.est.height; return inp || (S.sample && !S.photoLoaded ? BF.REF[group()].height[0] : 0); }
    if (k === "weight") return parseFloat($("weight").value) || 0;
    if (src === "manual") return parseFloat(S.manual[k]);
    if (src === "photo") return S.est[k];
    if (src === "sample") return SAMPLE[k];
    return 0;
  }
  const SRC_LABEL = { manual: ["직접 입력", ""], photo: ["사진 추정", "muted"], sample: ["예시 값", "warn"], none: ["값 없음", "muted"], input: ["입력", "muted"] };
  const PENCIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  function renderMeasures() {
    const L = $("mlist"); L.innerHTML = "";
    BF.KEYS.filter(k => !k.derived && !k.optional && (k.k !== "height" || S.est.scaleSource === "card")).forEach(K => {
      const src = K.k === "height" ? "photo" : source(K.k), v = used(K.k); const [lab, cls] = SRC_LABEL[src];
      const row = document.createElement("div"); row.className = "mrow" + (v ? "" : " empty-val");
      row.innerHTML = `<div class="mname">${K.name}<small>${K.desc}</small></div>
        <div class="mval">${v ? v.toFixed(1) : "—"}<small>cm</small></div>
        <div class="msrc">${src === "sample" ? '<span class="chip warn">예시</span>' : ""}<button class="edit ${S.editing === K.k ? "on" : ""}" title="직접 입력" aria-label="${K.name} 직접 입력">${PENCIL}</button></div>
        ${S.editing === K.k ? `<div class="medit">줄자 실측값 <input type="number" step="0.1" min="0" placeholder="cm" value="${S.manual[K.k] || ""}" autofocus> ${S.est[K.k] ? `<span>사진 추정 ${S.est[K.k].toFixed(1)}</span>` : ""} <button class="btn ghost" data-clear>사진 값 사용</button></div>` : ""}`;
      row.querySelector(".edit").addEventListener("click", () => { S.editing = S.editing === K.k ? null : K.k; renderMeasures(); const i = L.querySelector("input"); if (i) i.focus(); });
      const inp = row.querySelector("input"); if (inp) inp.addEventListener("input", () => { S.manual[K.k] = inp.value; update(false); });
      const clr = row.querySelector("[data-clear]"); if (clr) clr.addEventListener("click", () => { delete S.manual[K.k]; S.editing = null; update(); });
      L.appendChild(row);
    });
  }

  /* ---------- 스펙트럼 ---------- */
  let tip = null;
  // 스펙트럼 위치(0~100) → 색 (왼쪽 파랑 → 가운데 중립 → 오른쪽 주황)
  const lerp = (a, b, t) => a + (b - a) * t;
  const hex2 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function posColor(pos) {
    const lo = hex2("#4D8DFF"), mid = hex2("#B8BEC8"), hi = hex2("#FF8A4D");
    const t = pos / 100; const [a, b, u] = t < .5 ? [lo, mid, t / .5] : [mid, hi, (t - .5) / .5];
    return `rgb(${Math.round(lerp(a[0], b[0], u))},${Math.round(lerp(a[1], b[1], u))},${Math.round(lerp(a[2], b[2], u))})`;
  }
  /* 정규분포 곡선: 또래 평균·표준편차로 종 모양 곡선을 그리고 내 위치를 표시 */
  const CURVE_KEYS = ["height", "weight", "bmi"];
  function renderCurves(spec) {
    const box = $("curves"); if (!box) return; box.innerHTML = "";
    const items = CURVE_KEYS.map(k => spec.find(p => p.key === k)).filter(Boolean);
    if (!items.length) { box.innerHTML = '<div class="empty">키와 몸무게를 넣으면 또래 분포와 모델 분포가 표시됩니다</div>'; return; }
    const MR = BF.MODEL_REF[S.sex];
    const lg = document.createElement("div"); lg.className = "clegend";
    lg.innerHTML = `<span><i class="sw pop"></i>또래 (사이즈코리아)</span><span><i class="sw mod"></i>쇼핑몰 모델 (n=${MR.n})</span><span><i class="sw me"></i>나</span>`;
    box.appendChild(lg);
    items.forEach(p => {
      const W = 520, H = 140, padL = 10, padR = 10, base = H - 24, top = 14;
      const zmin = -3.6, zmax = 3.6; const X = z => padL + (z - zmin) / (zmax - zmin) * (W - padL - padR);
      const pdf = z => Math.exp(-0.5 * z * z); const Y = z => base - pdf(z) * (base - top);
      const zc = Math.max(zmin, Math.min(zmax, p.z));
      const bell = (mu, sg) => { let d = `M ${X(zmin).toFixed(1)} ${base}`; for (let z = zmin; z <= zmax + 1e-9; z += 0.08) { const y = base - pdf((z - mu) / sg) * (base - top); d += ` L ${X(z).toFixed(1)} ${y.toFixed(1)}`; } return d + ` L ${X(zmax).toFixed(1)} ${base} Z`; };
      const lo = p.invert ? zc : zmin, hi = p.invert ? zmax : zc;
      let f = `M ${X(lo).toFixed(1)} ${base}`; for (let z = lo; z <= hi + 1e-9; z += 0.08) f += ` L ${X(z).toFixed(1)} ${Y(z).toFixed(1)}`; f += ` L ${X(hi).toFixed(1)} ${base} Z`;
      const m = MR[p.key]; let modelPath = "", modelLine = "", modelNote = "";
      if (m) {
        const mu = (m[0] - p.mean) / p.sd, sg = m[1] / p.sd;
        modelPath = `<path d="${bell(mu, sg)}" fill="rgba(255,138,77,.14)" stroke="#FF8A4D" stroke-width="1.5" stroke-dasharray="5 3"/>`;
        modelLine = `<line x1="${X(mu).toFixed(1)}" x2="${X(mu).toFixed(1)}" y1="${(base - (base - top)).toFixed(1)}" y2="${base}" stroke="#FF8A4D" stroke-dasharray="2 3" opacity=".7"/>`;
        const zm = (p.value - m[0]) / m[1]; const cdfm = BF.normCdf(zm); const topM = (p.invert ? cdfm : 1 - cdfm) * 100;
        modelNote = `모델 기준 ${topM <= 50 ? "상위 " + Math.max(0.1, topM).toFixed(0) : "하위 " + Math.max(0.1, 100 - topM).toFixed(0)}%`;
      }
      const ticks = [-3, -2, -1, 0, 1, 2, 3].map(z => `<line x1="${X(z).toFixed(1)}" x2="${X(z).toFixed(1)}" y1="${base}" y2="${base + 4}" stroke="var(--line)"/>`).join("");
      const unit = p.unit === "%" ? "%" : p.unit ? " " + p.unit : "";
      const fmt = v => p.unit === "" ? v.toFixed(1) : v.toFixed(1);
      const rank = p.topPct <= 50 ? `<small>또래 상위</small>${p.topPct.toFixed(0)}%` : `<small>또래 하위</small>${p.pct.toFixed(0)}%`;
      const el = document.createElement("div"); el.className = "curve";
      el.innerHTML = `<div class="ch"><b>${p.name}</b><span class="rk">${rank}${modelNote ? `<em>${modelNote}</em>` : ""}</span></div>
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${p.name} 분포에서 내 위치">
          <path d="${bell(0, 1)}" fill="rgba(109,149,242,.10)" stroke="rgba(109,149,242,.9)" stroke-width="1.5"/>
          <path d="${f}" fill="rgba(109,149,242,.28)"/>
          ${modelPath}${modelLine}
          <line x1="${X(0).toFixed(1)}" x2="${X(0).toFixed(1)}" y1="${top}" y2="${base}" stroke="var(--muted)" stroke-dasharray="3 3"/>
          <line x1="${padL}" x2="${W - padR}" y1="${base}" y2="${base}" stroke="var(--line)"/>${ticks}
          <line x1="${X(zc).toFixed(1)}" x2="${X(zc).toFixed(1)}" y1="${Y(zc).toFixed(1)}" y2="${base}" stroke="#fff" stroke-width="2"/>
          <circle cx="${X(zc).toFixed(1)}" cy="${Y(zc).toFixed(1)}" r="5.5" fill="#fff" stroke="#0F1114" stroke-width="2"/>
          <text x="${X(0).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="rgba(109,149,242,.95)">또래 평균 ${fmt(p.mean)}${unit}</text>
          ${m ? `<text x="${X((m[0] - p.mean) / p.sd).toFixed(1)}" y="${top - 2}" text-anchor="middle" font-size="11" fill="#FF8A4D">모델 평균 ${fmt(m[0])}${unit}</text>` : ""}
          <text x="${(X(zc) + (zc >= 0 ? 9 : -9)).toFixed(1)}" y="${Math.max(24, Y(zc) - 6).toFixed(1)}" text-anchor="${zc >= 0 ? "start" : "end"}" font-size="12" font-weight="700" fill="#fff">나 ${fmt(p.value)}${unit}</text>
        </svg>
        <div class="cf"><span>${p.invert ? p.hiLabel : p.loLabel}</span><span>${p.invert ? p.loLabel : p.hiLabel}</span></div>`;
      box.appendChild(el);
    });
    const src = document.createElement("div"); src.className = "note csrc"; src.textContent = `모델 분포 출처: ${BF.MODEL_SRC} · 인물 ${BF.MODEL_REF.M.n + BF.MODEL_REF.F.n}명`; box.appendChild(src);
  }

  /* ---------- 연구 기록 (참여자 데이터 수집) ---------- */
  const RK = "tv.records";
  const loadRecords = () => { try { return JSON.parse(localStorage.getItem(RK) || "[]"); } catch (e) { return []; } };
  const saveRecords = list => { try { localStorage.setItem(RK, JSON.stringify(list)); } catch (e) { } };
  function renderRecords() { const n = loadRecords().length; const c = $("recCount"); if (c) c.textContent = n ? `${n}건 저장됨` : "저장된 기록이 없어요"; const e = $("recExport"); if (e) e.disabled = !n; }
  const REC_COLS = ["id", "label", "sex", "age", "height", "weight", "bmi", "shoulder", "waist", "leg", "height_top", "weight_top", "bmi_top", "shoulder_top", "waist_top", "leg_top", "scale", "placeMode", "group", "saved_at"];
  function addRecord() {
    const v = currentValues(); const spec = BF.spectrum(v, group());
    if (!v.height) { toast("키가 있어야 기록할 수 있어요", 2000); return; }
    const top = k => { const p = spec.find(x => x.key === k); return p ? +p.topPct.toFixed(1) : ""; };
    const list = loadRecords();
    const r = { id: "P" + String(list.length + 1).padStart(3, "0"), label: ($("recLabel").value || "").trim(), sex: S.sex, age: $("ageIn").value || "", height: v.height || "", weight: v.weight || "",
      bmi: v.weight && v.height ? +(v.weight / (v.height / 100) ** 2).toFixed(1) : "", shoulder: v.shoulder ? +v.shoulder.toFixed(1) : "", waist: v.waist ? +v.waist.toFixed(1) : "", leg: v.leg ? +v.leg.toFixed(1) : "",
      height_top: top("height"), weight_top: top("weight"), bmi_top: top("bmi"), shoulder_top: top("shoulder"), waist_top: top("waist"), leg_top: top("leg"),
      scale: S.est?.scaleSource || "", placeMode: S.placeMode || "", group: group(), saved_at: new Date().toISOString().slice(0, 19).replace("T", " ") };
    list.push(r); saveRecords(list); renderRecords(); $("recLabel").value = ""; toast(`${r.id} 저장했어요`, 1500);
  }
  function exportRecords() {
    const list = loadRecords(); if (!list.length) return;
    const esc = x => { const s = String(x ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = "﻿" + REC_COLS.join(",") + "\n" + list.map(r => REC_COLS.map(k => esc(r[k])).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `teamvibe_records_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  $("recSave").addEventListener("click", addRecord);
  $("recExport").addEventListener("click", exportRecords);
  $("recClear").addEventListener("click", () => { if (!confirm("저장된 연구 기록을 모두 지울까요?")) return; saveRecords([]); renderRecords(); });
  $("recLabel").addEventListener("keydown", e => { if (e.key === "Enter") addRecord(); });
  renderRecords();

  function renderSpec(spec) {
    renderCurves(spec);
    const box = $("spec"); box.innerHTML = "";
    if (!spec.length) { box.innerHTML = '<div class="empty">키와 치수가 있으면 스펙트럼이 표시됩니다</div>'; return; }
    spec.forEach(p => {
      const it = document.createElement("div"); it.className = "item";
      const unitTxt = p.unit === "%" ? "%" : p.unit ? " " + p.unit : "";
      const vtxt = (p.unit === "" ? p.value.toFixed(p.fixed1 ? 1 : 2) : p.value.toFixed(1)) + unitTxt;
      const showVal = ["height", "weight", "bmi"].includes(p.key);
      // 막대는 항상 오른쪽 = 상위(우세): 허리너비처럼 작을수록 상위인 항목은 좌우를 뒤집어 표시
      const pos = p.invert ? 100 - p.pos : p.pos, loL = p.invert ? p.hiLabel : p.loLabel, hiL = p.invert ? p.loLabel : p.hiLabel;
      const col = posColor(pos);
      const rank = p.topPct <= 50 ? `<small>상위</small><b>${p.topPct.toFixed(0)}%</b>` : `<small>하위</small><b>${p.pct.toFixed(0)}%</b>`;
      const diff = p.value - p.mean; const diffTxt = p.unit === "" ? diff.toFixed(p.fixed1 ? 1 : 2) : (diff >= 0 ? "+" : "") + diff.toFixed(1) + unitTxt;
      it.innerHTML = `<div class="top"><b>${p.name}${showVal ? ` <span class="val"><strong>${vtxt}</strong></span>` : ""}</b><span class="rank">${rank}</span></div>
        <div class="bar"><span class="tick" style="left:${100 / 6}%"></span><span class="tick" style="left:${200 / 6}%"></span><span class="tick mean" style="left:50%"></span><span class="tick" style="left:${400 / 6}%"></span><span class="tick" style="left:${500 / 6}%"></span>
          ${showVal ? `<span class="lab" style="left:${pos}%">평균보다 ${diffTxt}</span>` : ""}
          <span class="pin" style="left:${pos}%;--c:${col}" tabindex="0" aria-label="${p.name} ${vtxt}"></span></div>
        <div class="ends"><span>${loL}</span><span>평균</span><span>${hiL}</span></div>`;
      const pin = it.querySelector(".pin");
      const show = () => { hide(); tip = document.createElement("div"); tip.className = "tooltip";
        tip.innerHTML = `<b>${p.name}</b> ${vtxt}<br>또래 평균 ${p.mean.toFixed(1)}<br>상위 ${p.topPct.toFixed(1)}% / 하위 ${p.pct.toFixed(1)}%`;
        it.appendChild(tip); tip.style.left = pos + "%"; tip.style.top = (pin.offsetTop - 4) + "px"; };
      const hide = () => { if (tip) { tip.remove(); tip = null; } };
      pin.addEventListener("mouseenter", show); pin.addEventListener("mouseleave", hide); pin.addEventListener("focus", show); pin.addEventListener("blur", hide);
      box.appendChild(it);
    });
  }

  /* ---------- 체형·추천 ---------- */
  const ICON = { top: "T", bottom: "B", outer: "O" };
  function renderType(spec, values) {
    const c = BF.classify(spec, values, S.sex); const T = $("typeCard"), R = $("reco");
    if (!c) { T.className = "empty"; T.textContent = "치수가 모두 있으면 체형과 추천이 표시됩니다"; R.innerHTML = ""; $("sizes").innerHTML = ""; return null; }
    T.className = "type-card";
    T.innerHTML = `<div><h3>${c.frame}<small>${c.leg} · ${c.stature}</small></h3><p>${c.description}</p></div>`;
    const josa = (w, a, b) => { const ch = w.trim().replace(/[)\]]+$/, "").slice(-1); const code = ch.charCodeAt(0); const bat = code >= 0xAC00 && code <= 0xD7A3 ? (code - 0xAC00) % 28 : 0; return w + (bat ? a : b); };
    const sentBad = t => josa(t, "은", "는") + " 피하는 게 좋아요";
    const sentGood = t => josa(t, "이", "가") + " 잘 어울려요";
    R.innerHTML = c.recommendations.map(r => `<div class="r"><h4>${r.part}</h4><p class="why">${r.why}</p>
      <ul class="rlist">${r.bad.slice(0, 3).map(b => `<li class="no">${sentBad(b)}</li>`).join("")}${r.good.slice(0, 3).map(g => `<li class="ok">${sentGood(g)}</li>`).join("")}</ul></div>`).join("");
    $("sizes").innerHTML = (c.sizes || []).map(s => `<div class="s"><span>${s.part} 사이즈</span><b>${s.size}${s.tag ? ` <em>(${s.tag})</em>` : ""}</b>${s.note ? `<small class="tip">${s.note}</small>` : ""}<small class="basis" ${S.showBasis ? "" : "hidden"}>${s.basis}</small></div>`).join("") + (c.sizes ? `<button class="btn ghost basis-btn" id="basisBtn">${S.showBasis ? "추정치 숨기기" : "추정치 보기"}</button>` : "");
    const bb = $("basisBtn"); if (bb) bb.addEventListener("click", () => { S.showBasis = !S.showBasis; update(false); });
    return c;
  }
  function weightKpi() {
    const w = parseFloat($("weight").value), h = used("height") / 100; if (!w || !h) return "";
    return `<div class="kpi"><b>${(w / (h * h)).toFixed(1)}</b><span>BMI</span></div>`;
  }
  let refSex = null;
  function renderRef() {
    const sex = refSex || S.sex; [...$("refSex").children].forEach(b => b.classList.toggle("on", b.dataset.v === sex));
    const groups = [["T", "16~19세"], ["20", "20~26세"], ["30", "27~39세"], ["40", "40대"]];
    const rows = [["height", "키"], ["weight", "몸무게"], ["bmi", "BMI"], ["shoulder", "어깨너비"], ["waist", "허리너비"], ["leg", "다리길이"], ["chestC", "가슴둘레"], ["waistC", "허리둘레"], ["hipC", "엉덩이둘레"]];
    let h = "<table><thead><tr><th>항목</th>" + groups.map(g => `<th>${g[1]}</th>`).join("") + "</tr></thead><tbody>";
    rows.forEach(([k, name]) => { h += `<tr><td>${name}</td>` + groups.map(g => { const v = BF.REF[sex + g[0]][k]; return `<td>${v ? Math.round(v[0]) : "—"}</td>`; }).join("") + "</tr>"; });
    $("refTable").innerHTML = h + "</tbody></table>";
  }
  $("refSex").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; refSex = b.dataset.v; renderRef(); });
  const toast = (t, ms = 0) => { let d = $("tvToast"); if (!d || !d.parentElement) { d = document.createElement("div"); d.id = "tvToast"; d.className = "tv-toast"; document.body.appendChild(d); } d.textContent = t; d.hidden = !t; if (ms) setTimeout(() => { d.hidden = true; }, ms); };

  /* ---------- AI 연결(Gemini 키) ---------- */
  function renderGate() {
    const has = !!BF.ai.key();
    $("keyBtn").hidden = !has; $("keyBody").hidden = has; $("keyState").textContent = has ? "연결됨" : "키 없음"; $("keyState").classList.toggle("on", has);
    $("aiPlaceBtn").hidden = !has;
  }
  $("gateGo").addEventListener("click", () => { const k = $("gateKey").value.trim(); if (k.length < 20 || /\s/.test(k)) { $("gateErr").textContent = "키 전체를 그대로 붙여 넣어 주세요 (AIza… 또는 AQ.… 로 시작하는 긴 문자열)"; $("gateErr").hidden = false; return; } BF.ai.setKey(k); $("gateKey").value = ""; $("gateErr").hidden = true; renderGate(); toast("AI 연결됨", 1500); if (stage.img && S.placeMode !== "manual") aiPlace(); });
  $("gateKey").addEventListener("keydown", e => { if (e.key === "Enter") $("gateGo").click(); });
  $("keyBtn").addEventListener("click", () => { if (!confirm("저장된 Gemini API 키를 지우고 다시 입력할까요?")) return; BF.ai.setKey(""); $("gateKey").value = ""; renderGate(); });
  renderGate();


  /* ---------- 갱신 ---------- */
  function currentValues() { const v = {}; ["height", "shoulder", "waist", "leg", "weight"].forEach(k => { const u = used(k); if (u) v[k] = u; }); const cc = parseFloat($("chestIn").value), wc = parseFloat($("waistCIn").value); if (cc > 0) v.chestC = cc; if (wc > 0) v.waistC = wc; v.group = group(); return v; }
  function update(rebuild = true) {
    S.est = stage.measure(parseFloat($("height").value) || 0);
    renderMeasures();
    const values = currentValues(); const spec = BF.spectrum(values, group());
    const r = BF.REF[group()]; $("groupChip").textContent = r.label.replace(" (근사)", "") + " 기준";
    renderSpec(spec); const c = renderType(spec, values); S.lastType = c; save();
  }
  $("resetAll").addEventListener("click", () => { if (!confirm("입력값과 사진을 모두 지울까요?")) return; try { localStorage.removeItem(LS); } catch (e) { } location.reload(); });

  load();
  [...$("sexSeg").children].forEach(b => b.classList.toggle("on", b.dataset.v === S.sex));
  renderRef(); update();
  setTimeout(() => BF.pose.load().catch(() => { }), 1500);
})();
