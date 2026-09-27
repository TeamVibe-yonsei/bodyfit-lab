/* BodyFit Lab — 화면 제어 v3 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const S = { sex: "M", age: "20", manual: {}, est: {}, sample: true, garments: [], sel: null, guides: true, photoLoaded: false, tab: "top", editing: null, view: "3d", lastType: null };
  const SAMPLE = { shoulder: 42.5, waist: 27.4, leg: 81.0 };

  /* ---------- 저장/복원 ---------- */
  const LS = "bodyfit.v4";
  const save = () => { try { localStorage.setItem(LS, JSON.stringify({ sex: S.sex, ageIn: $("ageIn").value, height: $("height").value, weight: $("weight").value, manual: S.manual, guides: S.guides })); } catch (e) { } };
  const load = () => { try { const d = JSON.parse(localStorage.getItem(LS) || "null"); if (!d) return; S.sex = d.sex || "M"; S.manual = d.manual || {}; S.guides = d.guides ?? true; if (d.ageIn) $("ageIn").value = d.ageIn; if (d.height) $("height").value = d.height; if (d.weight) $("weight").value = d.weight; } catch (e) { } };

  /* ---------- 테마 ---------- */

  /* ---------- 기본 정보 ---------- */
  const ageGroup = () => { const a = parseInt($("ageIn").value, 10); if (!a) return "20"; return a < 20 ? "T" : a <= 26 ? "20" : a <= 39 ? "30" : "40"; };
  const group = () => S.sex + ageGroup();
  $("sexSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.sex = b.dataset.v; [...$("sexSeg").children].forEach(x => x.classList.toggle("on", x === b)); update(); });
  $("ageIn").addEventListener("input", () => update());
  $("height").addEventListener("input", () => update()); $("weight").addEventListener("input", () => update());

  $("legend2").innerHTML = BF.POINTS.map(p => `<span><b>${p.n}</b>${p.label}</span>`).join("");

  /* ---------- 스테이지 ---------- */
  const stage = new BF.Stage($("cv"), () => update());
  const setStatus = (t, cls = "") => { const s = $("status"); s.className = "guide-line " + cls; s.textContent = t; };
  function loadImage(src) {
    const img = new Image();
    img.onload = () => {
      stage.setImage(img); S.photoLoaded = true; S.sample = false; $("placeholder").hidden = true; autoDetect();
    };
    img.onerror = () => setStatus("이미지를 열 수 없습니다. JPG/PNG 파일인지 확인하세요.", "err");
    img.src = src;
  }
  $("photo").addEventListener("change", e => { const f = e.target.files[0]; if (f) loadImage(URL.createObjectURL(f)); e.target.value = ""; });
  async function autoDetect() {
    if (!stage.img) return;
    setStatus("자동으로 위치를 잡는 중…", "busy");
    try {
      const res = await BF.pose.detect(stage.img);
      if (!res.poseLandmarks) throw new Error("사람을 찾지 못했습니다");
      const { pts, confidence } = BF.pose.toPoints(res.poseLandmarks, stage.cv.width, stage.cv.height);
      stage.setPoints(pts);
      setStatus("숫자를 몸의 올바른 위치에 놓아 주세요", "ok");
    } catch (err) { setStatus("숫자를 몸의 올바른 위치에 놓아 주세요", "err"); }
  }

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
    if (k === "height") return parseFloat($("height").value) || (S.sample && !S.photoLoaded ? BF.REF[group()].height[0] : 0);
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
    BF.KEYS.filter(k => !k.derived && !k.optional && k.k !== "height").forEach(K => {
      const src = source(K.k), v = used(K.k); const [lab, cls] = SRC_LABEL[src];
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
  function renderSpec(spec) {
    const box = $("spec"); box.innerHTML = "";
    if (!spec.length) { box.innerHTML = '<div class="empty">키와 치수가 있으면 스펙트럼이 표시됩니다.</div>'; return; }
    spec.forEach(p => {
      const it = document.createElement("div"); it.className = "item";
      const unitTxt = p.unit === "%" ? "%" : p.unit ? " " + p.unit : "";
      const vtxt = (p.unit === "" ? p.value.toFixed(p.fixed1 ? 1 : 2) : p.value.toFixed(1)) + unitTxt;
      const rankCls = p.topPct <= 25 ? "" : p.topPct >= 75 ? "lo" : "mid";
      const rankTxt = p.topPct <= 50 ? `상위 ${p.topPct.toFixed(0)}%` : `하위 ${p.pct.toFixed(0)}%`;
      it.innerHTML = `<div class="top"><b>${p.name} <span class="rank ${rankCls}">${rankTxt}</span></b><span class="val"><strong>${vtxt}</strong></span></div>
        <div class="bar"><span class="tick" style="left:${100 / 6}%"></span><span class="tick" style="left:${200 / 6}%"></span><span class="tick mean" style="left:50%"></span><span class="tick" style="left:${400 / 6}%"></span><span class="tick" style="left:${500 / 6}%"></span>
          <span class="lab" style="left:${p.pos}%">${p.z >= 0 ? "평균보다 " + (p.unit === "" ? (p.value - p.mean).toFixed(2) : "+" + (p.value - p.mean).toFixed(1) + unitTxt) : "평균보다 " + (p.unit === "" ? (p.value - p.mean).toFixed(2) : (p.value - p.mean).toFixed(1) + unitTxt)}</span>
          <span class="pin" style="left:${p.pos}%" tabindex="0" aria-label="${p.name} ${vtxt}, ${rankTxt}"></span></div>
        <div class="ends"><span>${p.loLabel} ${p.unit === "" ? p.lo.toFixed(2) : p.lo.toFixed(0)}</span><span>또래 평균 ${p.unit === "" ? p.mean.toFixed(2) : p.mean.toFixed(1)}</span><span>${p.unit === "" ? p.hi.toFixed(2) : p.hi.toFixed(0)} ${p.hiLabel}</span></div>`;
      const pin = it.querySelector(".pin");
      const show = () => { hide(); tip = document.createElement("div"); tip.className = "tooltip";
        tip.innerHTML = `<b>${p.name}</b> ${vtxt}<br>또래 평균 ${p.mean.toFixed(p.unit === "" ? 1 : 1)}<br>상위 ${p.topPct.toFixed(1)}% / 하위 ${p.pct.toFixed(1)}%`;
        it.appendChild(tip); tip.style.left = p.pos + "%"; tip.style.top = (pin.offsetTop - 4) + "px"; };
      const hide = () => { if (tip) { tip.remove(); tip = null; } };
      pin.addEventListener("mouseenter", show); pin.addEventListener("mouseleave", hide); pin.addEventListener("focus", show); pin.addEventListener("blur", hide);
      box.appendChild(it);
    });
  }

  /* ---------- 체형·추천 ---------- */
  const ICON = { top: "T", bottom: "B", outer: "O" };
  function renderType(spec, values) {
    const c = BF.classify(spec, values, S.sex); const T = $("typeCard"), R = $("reco");
    if (!c) { T.className = "empty"; T.textContent = "치수가 모두 있으면 체형과 추천이 표시됩니다."; R.innerHTML = ""; $("sizes").innerHTML = ""; return null; }
    T.className = "type-card";
    T.innerHTML = `<div><h3>${c.frame}<small>${c.leg} · ${c.stature}</small></h3><p>${c.description}</p></div>`;
    R.innerHTML = c.recommendations.map(r => `<div class="r"><h4>${r.part}</h4><p class="why">${r.why}</p>
      <div class="lbl">피하기</div><div class="chips no">${r.bad.slice(0, 3).map(b => `<span>${b}</span>`).join("")}</div>
      <div class="lbl">추천</div><div class="chips">${r.good.slice(0, 3).map(g => `<span>${g}</span>`).join("")}</div></div>`).join("");
    $("sizes").innerHTML = (c.sizes || []).map(s => `<div class="s"><span>${s.part} 사이즈 가이드</span><b>${s.size}</b></div>`).join("");
    return c;
  }
  function weightKpi() {
    const w = parseFloat($("weight").value), h = used("height") / 100; if (!w || !h) return "";
    return `<div class="kpi"><b>${(w / (h * h)).toFixed(1)}</b><span>BMI</span></div>`;
  }
  function renderRef() {
    const cols = [["height", "키"], ["shoulder", "어깨너비"], ["waist", "허리너비"], ["leg", "샅높이"], ["chestC", "가슴둘레"], ["waistC", "허리둘레"], ["hipC", "엉덩이둘레"], ["weight", "몸무게"]];
    let h = "<table><thead><tr><th>그룹</th>" + cols.map(c => `<th>${c[1]}</th>`).join("") + "</tr></thead><tbody>";
    for (const g in BF.REF) { const r = BF.REF[g]; h += `<tr><td style="font-family:var(--sans)">${r.label}</td>` + cols.map(c => `<td>${r[c[0]][0]}</td>`).join("") + "</tr>"; }
    $("refTable").innerHTML = h + "</tbody></table>";
  }

  /* ---------- 피팅룸: 옷장 ---------- */
  function renderWardrobe() {
    const g = $("wgrid"); g.innerHTML = "";
    const items = S.tab === "mine" ? S.garments.filter(x => x.mine) : BF.CATALOG.filter(c => c.kind === S.tab);
    if (!items.length) { g.innerHTML = `<div class="empty small" style="grid-column:1/-1">${S.tab === "mine" ? "아래 버튼으로 내 옷 사진을 추가하세요." : "준비 중"}</div>`; return; }
    items.forEach(it => {
      const worn = S.garments.some(x => x.catId === it.id || x.id === it.id);
      const el = document.createElement("div"); el.className = "witem" + (worn ? " on" : "");
      el.innerHTML = `<img src="${it.url}" alt="${it.name}"><div class="wn">${it.name}</div><div class="wc">${BF.KIND_LABEL[it.kind]}${it.fit ? " · " + it.fit : ""}</div>`;
      el.addEventListener("click", () => S.tab === "mine" ? selectGarment(it.id) : wearCatalog(it));
      g.appendChild(el);
    });
  }
  $("wtabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.tab = b.dataset.k; [...$("wtabs").children].forEach(x => x.classList.toggle("on", x === b)); renderWardrobe(); });

  function defaultSize(kind, values) {
    const keys = BF.sizeKeys(kind); const table = BF.SIZES[kind === "dress" ? "top" : kind];
    let target;
    if (kind === "top" || kind === "dress") target = (values.shoulder || 40) + 3.5;
    else if (kind === "outer") target = (values.shoulder || 40) + 6;
    else if (kind === "bottom") target = (values.waist || 28) * 1.30; // 허리 정면폭 → 의류 허리 반폭 근사(여유 포함)
    else target = 26;
    return keys.reduce((best, k) => Math.abs(table[k] - target) < Math.abs(table[best] - target) ? k : best, keys[0]);
  }
  function wearCatalog(it) {
    // 같은 부위(상의/아우터/하의/신발)는 하나만: 교체
    S.garments = S.garments.filter(x => !(x.kind === it.kind && !x.mine));
    const values = currentValues(); const size = defaultSize(it.kind, values);
    const gm = { id: "g" + Date.now(), catId: it.id, name: it.name, kind: it.kind, url: it.url, w: it.w, h: it.h, refFrac: it.refFrac, size, sizeCm: BF.SIZES[it.kind][size], scale: 1, ys: 1, dx: 0, dy: 0, fit: it.fit, color: it.color, draw: it.draw };
    S.garments.push(gm); S.sel = gm.id; renderAll();
  }
  function selectGarment(id) { S.sel = id; renderWorn(); syncCtrl(); renderAvatar(currentValues()); }
  $("garment").addEventListener("change", e => {
    [...e.target.files].forEach(f => {
      const img = new Image(); img.onload = () => {
        const kind = ["top", "outer", "bottom", "shoes"].includes(S.tab) ? S.tab : "top";
        const gm = { id: "g" + Date.now() + Math.random().toString(16).slice(2, 5), mine: true, name: f.name.replace(/\.[^.]+$/, ""), kind, src: img, thr: 34, scale: 1, ys: 1, dx: 0, dy: 0 };
        Object.assign(gm, BF.removeBackground(img, gm.thr)); S.garments.push(gm); S.sel = gm.id; S.tab = "mine";
        [...$("wtabs").children].forEach(x => x.classList.toggle("on", x.dataset.k === "mine")); renderAll();
      }; img.src = URL.createObjectURL(f);
    }); e.target.value = "";
  });

  function fitBadge(gm, values) {
    if (!gm.sizeCm) return "";
    if (gm.kind === "top" || gm.kind === "outer" || gm.kind === "dress") {
      const ease = gm.sizeCm - (values.shoulder || 0); if (!values.shoulder) return "";
      const [t, cls] = ease < 1.5 ? ["타이트", "tight"] : ease < 3 ? ["슬림핏", ""] : ease < 5 ? ["레귤러핏", ""] : ease < 7.5 ? ["세미오버", "loose"] : ["오버핏", "loose"];
      return `<span class="fitbadge ${cls}">${t} · 어깨 여유 ${ease >= 0 ? "+" : ""}${ease.toFixed(1)}cm</span>`;
    }
    if (gm.kind === "bottom") {
      const ease = gm.sizeCm - (values.waist || 0) * 1.25; if (!values.waist) return "";
      const [t, cls] = ease < 0 ? ["꽉 맞음", "tight"] : ease < 2.5 ? ["딱 맞음", ""] : ease < 5 ? ["여유 있음", "loose"] : ["헐렁함", "loose"];
      return `<span class="fitbadge ${cls}">${t}</span>`;
    }
    return "";
  }
  function renderWorn() {
    const L = $("wlist"); const values = currentValues();
    if (!S.garments.length) { L.innerHTML = '<div class="empty small">왼쪽에서 옷을 골라 보세요.</div>'; $("gctrl").hidden = true; return; }
    const order = S.garments.slice().sort((a, b) => BF.KIND_ORDER[b.kind] - BF.KIND_ORDER[a.kind]);
    L.innerHTML = order.map(g => `<div class="wl ${S.sel === g.id ? "sel" : ""}" data-id="${g.id}"><img src="${g.url}" alt=""><div><div class="wn">${g.name} <small style="color:var(--muted);font-weight:400">${BF.KIND_LABEL[g.kind]}</small></div>
      <div class="fitline">${g.refFrac ? `<select data-size="${g.id}">${BF.sizeKeys(g.kind).map(k => `<option value="${k}" ${k == g.size ? "selected" : ""}>${k}</option>`).join("")}</select>` : `<select data-kind="${g.id}">${Object.entries(BF.KIND_LABEL).map(([k, v]) => `<option value="${k}" ${k === g.kind ? "selected" : ""}>${v}</option>`).join("")}</select>`}${fitBadge(g, values)}</div></div></div>`).join("");
    L.querySelectorAll(".wl").forEach(el => el.addEventListener("click", e => { if (e.target.tagName === "SELECT") return; selectGarment(el.dataset.id); }));
    L.querySelectorAll("select[data-size]").forEach(sel => sel.addEventListener("change", () => { const g = S.garments.find(x => x.id === sel.dataset.size); g.size = sel.value; g.sizeCm = BF.SIZES[g.kind][sel.value]; g.sizeLocked = true; renderWorn(); renderAvatar(values); }));
    L.querySelectorAll("select[data-kind]").forEach(sel => sel.addEventListener("change", () => { const g = S.garments.find(x => x.id === sel.dataset.kind); g.kind = sel.value; g.dx = g.dy = 0; renderAll(); }));
    const g = S.garments.find(x => x.id === S.sel); $("gctrl").hidden = !g; if (g) { $("gthr").parentElement.hidden = !g.mine; }
  }
  function syncCtrl() { const g = S.garments.find(x => x.id === S.sel); if (!g) return; $("gthr").value = g.thr || 34; $("gthrO").textContent = g.thr || 34; $("gscale").value = Math.round(g.scale * 100); $("gscaleO").textContent = Math.round(g.scale * 100) + "%"; $("gys").value = Math.round(g.ys * 100); $("gysO").textContent = Math.round(g.ys * 100) + "%"; }
  $("gthr").addEventListener("input", e => { const g = S.garments.find(x => x.id === S.sel); if (!g || !g.mine) return; g.thr = +e.target.value; $("gthrO").textContent = g.thr; Object.assign(g, BF.removeBackground(g.src, g.thr)); renderWorn(); renderAvatar(currentValues()); });
  $("gscale").addEventListener("input", e => { const g = S.garments.find(x => x.id === S.sel); if (!g) return; g.scale = e.target.value / 100; $("gscaleO").textContent = e.target.value + "%"; renderAvatar(currentValues()); });
  $("gys").addEventListener("input", e => { const g = S.garments.find(x => x.id === S.sel); if (!g) return; g.ys = e.target.value / 100; $("gysO").textContent = e.target.value + "%"; renderAvatar(currentValues()); });
  $("gcenter").addEventListener("click", () => { const g = S.garments.find(x => x.id === S.sel); if (!g) return; g.dx = g.dy = 0; g.scale = 1; g.ys = 1; syncCtrl(); renderAvatar(currentValues()); });
  $("gdel").addEventListener("click", () => { S.garments = S.garments.filter(x => x.id !== S.sel); S.sel = S.garments[0]?.id || null; renderAll(); });

  /* ---------- 아바타 ---------- */
  const svg = $("avatar"); let geo = null;
  function renderAvatar(values) {
    geo = BF.avatarGeometry(values, S.sex);
    let s = BF.avatarSvg(geo, { guides: S.guides });
    const gs = S.garments.slice().sort((a, b) => BF.KIND_ORDER[a.kind] - BF.KIND_ORDER[b.kind]);
    s += gs.map(gm => { const p = BF.garmentPlacement(gm, geo); return `<image data-id="${gm.id}" href="${gm.url}" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" width="${p.w.toFixed(1)}" height="${p.h.toFixed(1)}" preserveAspectRatio="none"/>` +
      (S.sel === gm.id ? `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="none" stroke="var(--accent)" stroke-dasharray="4 3" stroke-width="1" pointer-events="none"/>` : ""); }).join("");
    svg.innerHTML = s;
    render3d(values);
  }
  function render3d(values) {
    if (!BF.av3d) return;
    const w = values.weight, h = (values.height || 170) / 100; const ref = BF.REF[group()];
    const bmiRatio = w ? (w / (h * h)) / (ref.weight[0] / ((ref.height[0] / 100) ** 2)) : 1;
    BF.av3d.update({ values, sex: S.sex, frame: S.lastType ? S.lastType.frame : "균형형", bmiRatio, garments: S.garments });
  }
  window.addEventListener("av3d-ready", () => { BF.av3d.mount($("studio3d")); render3d(currentValues()); });
  if (BF.av3d) { BF.av3d.mount($("studio3d")); }
  $("viewSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.view = b.dataset.v; [...$("viewSeg").children].forEach(x => x.classList.toggle("on", x === b));
    $("studio3d").hidden = S.view !== "3d"; $("hint3d").hidden = S.view !== "3d"; $("avatar").hidden = S.view !== "2d"; $("guideBtn").hidden = S.view !== "2d"; if (BF.av3d?.inst) BF.av3d.inst.resize(); });
  let gdrag = null;
  const svgPos = e => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  svg.addEventListener("pointerdown", e => { const im = e.target.closest("image"); if (!im) return; const gm = S.garments.find(g => g.id === im.dataset.id); S.sel = gm.id; const q = svgPos(e); gdrag = { gm, sx: q.x - gm.dx, sy: q.y - gm.dy }; svg.setPointerCapture(e.pointerId); renderWorn(); syncCtrl(); renderAvatar(currentValues()); e.preventDefault(); });
  svg.addEventListener("pointermove", e => { if (!gdrag) return; const q = svgPos(e); gdrag.gm.dx = q.x - gdrag.sx; gdrag.gm.dy = q.y - gdrag.sy; renderAvatar(currentValues()); });
  svg.addEventListener("pointerup", () => { gdrag = null; });
  svg.addEventListener("wheel", e => { const im = e.target.closest("image"); if (!im) return; e.preventDefault(); const gm = S.garments.find(g => g.id === im.dataset.id); gm.scale = Math.max(.5, Math.min(2, gm.scale * (e.deltaY < 0 ? 1.04 : 0.96))); syncCtrl(); renderAvatar(currentValues()); }, { passive: false });
  $("guideBtn").addEventListener("click", () => { S.guides = !S.guides; save(); renderAvatar(currentValues()); });

  /* ---------- PNG ---------- */
  function svgToPng(svgEl, w, h, bg) {
    return new Promise(resolve => {
      const clone = svgEl.cloneNode(true); const cs = getComputedStyle(document.documentElement);
      const style = `<style>.body{fill:${cs.getPropertyValue("--av-fill")};stroke:${cs.getPropertyValue("--av-stroke")}} .guides{stroke:${cs.getPropertyValue("--av-guide")};fill:${cs.getPropertyValue("--av-guide")}} text{font-family:monospace}</style>`;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg"); clone.insertAdjacentHTML("afterbegin", style);
      clone.querySelectorAll("rect[stroke]").forEach(r => r.remove());
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" })); const img = new Image();
      img.onload = () => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url); resolve(c); };
      img.src = url;
    });
  }
  const download = (canvas, name) => { const a = document.createElement("a"); a.download = name; a.href = canvas.toDataURL("image/png"); a.click(); };
  $("exportAv").addEventListener("click", async () => { if (S.view === "3d" && BF.av3d?.inst) { const a = document.createElement("a"); a.download = "teamvibe_avatar_3d.png"; a.href = BF.av3d.inst.snapshot(1200, 1600); a.click(); return; } const c = await svgToPng(svg, 960, 1260, getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#fff"); download(c, "teamvibe_avatar.png"); });
  $("shareBtn").addEventListener("click", async () => {
    const values = currentValues(); const spec = BF.spectrum(values, group()); const c = BF.classify(spec, values, S.sex);
    const W = 1080, H = 1350; const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d");
    x.fillStyle = "#F3F5F8"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#16191F"; x.font = "800 44px Manrope, 'Noto Sans KR', sans-serif"; x.fillText("Team Vibe", 60, 90);
    x.fillStyle = "#6B7480"; x.font = "500 20px 'Noto Sans KR', sans-serif"; x.fillText(`${BF.REF[group()].label} 기준 · ${new Date().toLocaleDateString("ko-KR")}`, 60, 124);
    x.fillStyle = "#2F5FD9"; x.font = "700 34px 'Noto Sans KR', sans-serif"; x.fillText(c ? c.label : "치수 입력 필요", 60, 190);
    let y = 250;
    spec.forEach(p => {
      x.fillStyle = "#16191F"; x.font = "600 22px 'Noto Sans KR', sans-serif"; x.fillText(p.name, 60, y);
      x.fillStyle = "#3D444D"; x.font = "500 20px 'JetBrains Mono', monospace"; x.textAlign = "right";
      x.fillText(`${p.unit === "" ? p.value.toFixed(2) : p.value.toFixed(1)}${p.unit === "%" ? "%" : p.unit ? p.unit : ""} · 상위 ${p.topPct.toFixed(1)}%`, W - 60, y); x.textAlign = "left";
      const bx = 60, bw = W - 120, by = y + 16;
      const grad = x.createLinearGradient(bx, 0, bx + bw, 0); grad.addColorStop(0, "#BFD4F2"); grad.addColorStop(.5, "#E9ECEF"); grad.addColorStop(1, "#F2CDBA");
      x.fillStyle = grad; x.beginPath(); x.roundRect(bx, by, bw, 16, 8); x.fill();
      x.fillStyle = "#6B7480"; x.fillRect(bx + bw / 2 - 1, by - 4, 2, 24);
      x.fillStyle = "#E0653B"; x.beginPath(); x.arc(bx + bw * p.pos / 100, by + 8, 13, 0, Math.PI * 2); x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 3; x.stroke();
      y += 82;
    });
    if (c) { y += 10; x.fillStyle = "#16191F"; x.font = "600 22px 'Noto Sans KR', sans-serif"; x.fillText("추천 스타일", 60, y); y += 34; x.font = "400 19px 'Noto Sans KR', sans-serif";
      c.recommendations.forEach(r => { x.fillStyle = "#2F5FD9"; x.fillText(r.part, 60, y); x.fillStyle = "#3D444D"; x.fillText(r.good.slice(0, 2).join(" · "), 200, y); y += 32; }); }
    if (geo) { const av = await svgToPng(svg, 640, 840, "rgba(0,0,0,0)"); x.drawImage(av, W - 60 - 300, 130, 300, 394); }
    x.fillStyle = "#6B7480"; x.font = "400 16px 'Noto Sans KR', sans-serif"; x.fillText("출처: 사이즈코리아 제8차 한국인 인체치수조사 · 사진 1장 추정 ±2~3cm · Team Vibe", 60, H - 50);
    download(cv, "teamvibe_result.png");
  });

  /* ---------- 룩북 카드 ---------- */
  const loadImg = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  async function avatarSnapshot() {
    if (S.view === "3d" && BF.av3d?.inst) return await loadImg(BF.av3d.inst.snapshot(900, 1200));
    const c = await svgToPng(svg, 640, 840, "rgba(0,0,0,0)"); return await loadImg(c.toDataURL("image/png"));
  }
  const rr = (x, X, y, w, h, r) => { x.beginPath(); x.roundRect(X, y, w, h, r); };
  async function makeLookbook() {
    if (!S.garments.length) { alert("먼저 옷을 골라 주세요."); return; }
    const W = 1080, H = 1350; const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d");
    x.fillStyle = "#F4F1EC"; x.fillRect(0, 0, W, H);
    // 헤더
    x.fillStyle = "#1B1D22"; x.font = "800 30px Manrope, 'Noto Sans KR', sans-serif"; x.fillText("Team Vibe", 56, 66);
    x.fillStyle = "#8A8F98"; x.font = "500 16px 'Noto Sans KR', sans-serif"; x.fillText(`${BF.REF[group()].label} · ${S.lastType ? S.lastType.frame : ""} · ${new Date().toLocaleDateString("ko-KR")}`, 56, 92);
    x.textAlign = "right"; x.fillStyle = "#1B1D22"; x.font = "600 15px 'JetBrains Mono', monospace"; x.fillText("LOOK 01", W - 56, 66); x.textAlign = "left";
    // 오른쪽: 아바타 착용 컷
    const av = await avatarSnapshot();
    const ax = 470, ay = 120, aw = W - ax - 56, ah = H - ay - 120;
    rr(x, ax, ay, aw, ah, 22); x.fillStyle = "#FFFFFF"; x.fill();
    const g = x.createRadialGradient(ax + aw / 2, ay + ah * 0.92, 10, ax + aw / 2, ay + ah * 0.92, aw * 0.5); g.addColorStop(0, "rgba(0,0,0,.10)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(ax, ay, aw, ah);
    if (av) { const sc = Math.min((aw - 40) / av.width, (ah - 40) / av.height); const dw = av.width * sc, dh = av.height * sc; x.drawImage(av, ax + (aw - dw) / 2, ay + (ah - dh) / 2 + 10, dw, dh); }
    // 왼쪽: 상품 컷 + 라벨
    const items = S.garments.slice().sort((a, b) => BF.KIND_ORDER[b.kind] - BF.KIND_ORDER[a.kind]);
    const lx = 56, lw = 380, top = 120, bottom = H - 120, gap = 18; const cardH = Math.min(420, (bottom - top - gap * (items.length - 1)) / items.length);
    for (let i = 0; i < items.length; i++) {
      const gm = items[i], y = top + i * (cardH + gap);
      rr(x, lx, y, lw, cardH, 18); x.fillStyle = "#FFFFFF"; x.fill();
      const im = await loadImg(gm.url);
      if (im) { const pad = 26, bw = lw - pad * 2, bh = cardH - 74; const sc = Math.min(bw / im.width, bh / im.height); const dw = im.width * sc, dh = im.height * sc; x.drawImage(im, lx + (lw - dw) / 2, y + pad + (bh - dh) / 2, dw, dh); }
      // 라벨(밑줄 태그 스타일)
      const label = `${gm.name}${gm.size ? " · " + gm.size : ""}`; x.font = "600 17px 'Noto Sans KR', sans-serif"; const tw = x.measureText(label).width;
      x.fillStyle = "#1B1D22"; x.fillText(label, lx + 22, y + cardH - 26);
      x.strokeStyle = "#1B1D22"; x.lineWidth = 2; x.beginPath(); x.moveTo(lx + 22, y + cardH - 18); x.lineTo(lx + 22 + tw, y + cardH - 18); x.stroke();
      const fb = fitBadge(gm, currentValues()).replace(/<[^>]+>/g, ""); if (fb) { x.fillStyle = "#8A8F98"; x.font = "500 13px 'Noto Sans KR', sans-serif"; x.fillText(fb, lx + 22 + tw + 12, y + cardH - 26); }
    }
    // 하단 요약
    const v = currentValues(); x.fillStyle = "#8A8F98"; x.font = "500 14px 'JetBrains Mono', monospace";
    x.fillText(`키 ${v.height || "-"} · 어깨 ${v.shoulder ? v.shoulder.toFixed(1) : "-"} · 허리 ${v.waist ? v.waist.toFixed(1) : "-"} · 다리 ${v.leg ? v.leg.toFixed(1) : "-"} cm`, 56, H - 70);
    x.fillText("teamvibe-yonsei.github.io/bodyfit-lab", 56, H - 46);
    // 미리보기 모달
    const modal = document.createElement("div"); modal.className = "modal";
    modal.innerHTML = `<div class="box look"><img alt="룩북 카드"><div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn" id="lkClose">닫기</button><button class="btn primary" id="lkSave">PNG 저장</button></div></div>`;
    modal.querySelector("img").src = cv.toDataURL("image/png"); document.body.appendChild(modal);
    modal.querySelector("#lkClose").onclick = () => modal.remove(); modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    modal.querySelector("#lkSave").onclick = () => download(cv, "teamvibe_lookbook.png");
  }
  $("lookBtn").addEventListener("click", makeLookbook);

  /* ---------- 요약 ---------- */
  function renderSummary(spec, c) {
    if (!spec.length) { $("summary").textContent = "아직 결과가 없습니다."; return; }
    const lines = [`[Team Vibe] ${BF.REF[group()].label} 기준`];
    spec.forEach(p => lines.push(`${p.name} ${p.unit === "" ? p.value.toFixed(2) : p.value.toFixed(1)}${p.unit === "%" ? "%" : p.unit ? p.unit : ""} (상위 ${p.topPct.toFixed(1)}%)`));
    if (c) { lines.push(`체형: ${c.label}`); c.recommendations.forEach(r => lines.push(`${r.part}: ${r.good.slice(0, 2).join(", ")}`)); }
    if (S.garments.length) lines.push("착용: " + S.garments.map(g => g.name + (g.size ? " " + g.size : "")).join(", "));
    $("summary").textContent = lines.join("\n");
  }
  $("copyBtn").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("summary").textContent); $("copyBtn").textContent = "복사됨"; setTimeout(() => $("copyBtn").textContent = "복사", 1500); } catch (e) { } });

  /* ---------- 갱신 ---------- */
  function currentValues() { const v = {}; ["height", "shoulder", "waist", "leg", "weight"].forEach(k => { const u = used(k); if (u) v[k] = u; }); return v; }
  function renderAll() { renderWardrobe(); renderWorn(); syncCtrl(); renderAvatar(currentValues()); renderSummary(BF.spectrum(currentValues(), group()), BF.classify(BF.spectrum(currentValues(), group()), currentValues(), S.sex)); }
  function update(rebuild = true) {
    S.est = stage.measure(parseFloat($("height").value) || 0);
    renderMeasures();
    const values = currentValues(); const spec = BF.spectrum(values, group());
    const r = BF.REF[group()]; $("groupChip").textContent = r.label.replace(" (근사)", "") + " 기준" + (S.sample && !S.photoLoaded ? " · 예시" : "");
    renderSpec(spec); const c = renderType(spec, values); S.lastType = c;
    // 옷 사이즈 자동 재선택(치수 바뀌면)
    S.garments.forEach(g => { if (g.refFrac && !g.sizeLocked) { g.size = defaultSize(g.kind, values); g.sizeCm = BF.SIZES[g.kind][g.size]; } });
    renderWorn(); renderAvatar(values); renderSummary(spec, c); save();
  }
  $("resetAll").addEventListener("click", () => { if (!confirm("입력값·사진·옷을 모두 지울까요?")) return; try { localStorage.removeItem(LS); } catch (e) { } location.reload(); });

  load();
  [...$("sexSeg").children].forEach(b => b.classList.toggle("on", b.dataset.v === S.sex));
  renderRef(); renderWardrobe(); update();
  setTimeout(() => BF.pose.load().catch(() => { }), 1500);
})();
