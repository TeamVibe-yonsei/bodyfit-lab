/* BodyFit Lab — 화면 제어 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const S = { sex: "M", age: "20", manual: {}, est: {}, garments: [], sel: null, guides: true, photoLoaded: false };

  /* ---------- 저장/복원 (개인 편의용) ---------- */
  const LS = "bodyfit.v2";
  const save = () => { try { localStorage.setItem(LS, JSON.stringify({ sex: S.sex, age: S.age, height: $("height").value, weight: $("weight").value, manual: S.manual, guides: S.guides })); } catch (e) { } };
  const load = () => { try { const d = JSON.parse(localStorage.getItem(LS) || "null"); if (!d) return; S.sex = d.sex || "M"; S.age = d.age || "20"; S.manual = d.manual || {}; S.guides = d.guides ?? true; if (d.height) $("height").value = d.height; if (d.weight) $("weight").value = d.weight; } catch (e) { } };

  /* ---------- 테마 ---------- */
  $("themeBtn").addEventListener("click", () => {
    const r = document.documentElement; const cur = r.getAttribute("data-theme");
    const sysDark = matchMedia("(prefers-color-scheme: dark)").matches;
    const next = cur ? (cur === "dark" ? "light" : "dark") : (sysDark ? "light" : "dark");
    r.setAttribute("data-theme", next); try { localStorage.setItem("bodyfit.theme", next); } catch (e) { }
  });
  try { const t = localStorage.getItem("bodyfit.theme"); if (t) document.documentElement.setAttribute("data-theme", t); } catch (e) { }

  /* ---------- 기본 정보 ---------- */
  const group = () => S.sex + S.age;
  $("sexSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.sex = b.dataset.v; [...$("sexSeg").children].forEach(x => x.classList.toggle("on", x === b)); if (!S.photoLoaded && !S.manual.height) $("height").value = BF.REF[group()].height[0]; update(); });
  $("age").addEventListener("change", e => { S.age = e.target.value; update(); });
  $("height").addEventListener("input", update); $("weight").addEventListener("input", update);

  /* ---------- 기준점 범례 ---------- */
  const legendHtml = BF.POINTS.map(p => `<span><b>${p.n}</b>${p.label}</span>`).join("");
  $("legend").innerHTML = legendHtml;
  $("legend2").innerHTML = BF.POINTS.map(p => `<span><b>${p.n}</b>${p.label} <small style="color:var(--muted)">— ${p.tip}</small></span>`).join("");

  /* ---------- 스테이지 ---------- */
  const stage = new BF.Stage($("cv"), () => update());
  const setStatus = (t, cls = "") => { const s = $("status"); s.className = "status " + cls; s.children[1].textContent = t; };

  function loadImage(src) {
    const img = new Image();
    img.onload = () => {
      stage.setImage(img); S.photoLoaded = true; $("placeholder").hidden = true;
      $("autoBtn").disabled = false; $("resetPts").disabled = false;
      autoDetect(true);
    };
    img.onerror = () => setStatus("이미지를 열 수 없습니다. JPG/PNG 파일인지 확인하세요.", "err");
    img.src = src;
  }
  $("photo").addEventListener("change", e => { const f = e.target.files[0]; if (f) loadImage(URL.createObjectURL(f)); e.target.value = ""; });
  $("resetPts").addEventListener("click", () => { stage.resetPoints(); stage.draw(); setStatus("기준점을 기본 위치로 되돌렸습니다. 드래그로 맞춰 주세요."); });
  $("autoBtn").addEventListener("click", () => autoDetect(false));

  async function autoDetect(silent) {
    if (!stage.img) return;
    setStatus("포즈 인식 중… (처음 한 번은 모델을 불러오느라 수 초 걸립니다)", "busy");
    try {
      const res = await BF.pose.detect(stage.img);
      if (!res.poseLandmarks) throw new Error("사람을 찾지 못했습니다");
      const { pts, confidence } = BF.pose.toPoints(res.poseLandmarks, stage.cv.width, stage.cv.height);
      stage.setPoints(pts);
      setStatus(`자동 인식 완료 (신뢰도 ${(confidence * 100).toFixed(0)}%). ① 머리 꼭대기·⑤⑥ 허리·⑦ 샅은 눈으로 확인해 보정하세요.`, "ok");
    } catch (err) {
      setStatus("자동 인식을 할 수 없습니다 (" + (err.message || "오류") + "). 기준점을 직접 드래그해 주세요.", "err");
    }
  }

  /* ---------- 카메라 ---------- */
  $("camBtn").addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus("이 브라우저는 카메라를 지원하지 않습니다.", "err"); return; }
    const modal = document.createElement("div"); modal.className = "modal";
    modal.innerHTML = `<div class="box"><video autoplay playsinline muted></video><div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn" id="camCancel">취소</button><button class="btn primary" id="camShot">촬영</button></div><p class="note">3초 타이머 후 촬영됩니다. 카메라를 허리 높이에 두고 전신이 보이도록 물러나세요.</p></div>`;
    document.body.appendChild(modal);
    const video = modal.querySelector("video"); let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false }); video.srcObject = stream; }
    catch (e) { modal.remove(); setStatus("카메라 권한이 없거나 사용할 수 없습니다.", "err"); return; }
    const close = () => { stream.getTracks().forEach(t => t.stop()); modal.remove(); };
    modal.querySelector("#camCancel").onclick = close;
    modal.querySelector("#camShot").onclick = () => {
      const btn = modal.querySelector("#camShot"); let n = 3; btn.disabled = true; btn.textContent = n;
      const iv = setInterval(() => { n--; if (n > 0) { btn.textContent = n; return; } clearInterval(iv);
        const c = document.createElement("canvas"); c.width = video.videoWidth; c.height = video.videoHeight; c.getContext("2d").drawImage(video, 0, 0);
        close(); loadImage(c.toDataURL("image/jpeg", 0.92)); }, 1000);
    };
  });

  /* ---------- 치수 계산 ---------- */
  const used = k => { const m = parseFloat(S.manual[k]); if (!isNaN(m) && m > 0) return m; if (k === "height") return parseFloat($("height").value) || 0; return S.est[k] || 0; };
  const fmt = (v, d = 1) => v ? v.toFixed(d) : "—";

  function renderRows() {
    const tb = $("mrows"); tb.innerHTML = "";
    BF.KEYS.filter(k => !k.derived).forEach(K => {
      const est = S.est[K.k], u = used(K.k);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${K.name}<br><small style="color:var(--muted)">${K.desc}</small></td><td class="n">${est ? est.toFixed(1) + " cm" : "—"}</td>
        <td>${K.k === "height" ? '<span class="chip muted">상단 입력</span>' : `<input type="number" step="0.1" min="0" placeholder="cm" data-k="${K.k}" value="${S.manual[K.k] || ""}">`}</td>
        <td class="n"><b>${u ? u.toFixed(1) + " cm" : "—"}</b></td>`;
      tb.appendChild(tr);
    });
    tb.querySelectorAll("input").forEach(i => i.addEventListener("input", () => { S.manual[i.dataset.k] = i.value; update(false); }));
  }
  function refreshRows() {
    [...$("mrows").rows].forEach((tr, i) => { const K = BF.KEYS.filter(k => !k.derived)[i]; const e = S.est[K.k], u = used(K.k); tr.cells[1].textContent = e ? e.toFixed(1) + " cm" : "—"; tr.cells[3].innerHTML = "<b>" + (u ? u.toFixed(1) + " cm" : "—") + "</b>"; });
  }

  /* ---------- 스펙트럼 ---------- */
  let tip = null;
  function renderSpec(spec) {
    const box = $("spec"); box.innerHTML = "";
    if (!spec.length) { box.innerHTML = '<div class="empty">키와 치수를 입력하거나 사진을 올리면 스펙트럼이 표시됩니다.</div>'; return; }
    spec.forEach(p => {
      const it = document.createElement("div"); it.className = "item";
      const unit = p.unit === "%" ? "%" : p.unit ? " " + p.unit : "";
      const vtxt = p.unit === "" ? p.value.toFixed(2) : p.value.toFixed(1) + unit;
      it.innerHTML = `<div class="top"><b>${p.name}<small>${p.desc}</small></b><span class="val"><strong>${vtxt}</strong> · 상위 ${p.topPct.toFixed(1)}% · z ${p.z >= 0 ? "+" : ""}${p.z.toFixed(2)}</span></div>
        <div class="bar"><span class="tick" style="left:${100 / 6}%"></span><span class="tick" style="left:${200 / 6}%"></span><span class="tick mean" style="left:50%"></span><span class="tick" style="left:${400 / 6}%"></span><span class="tick" style="left:${500 / 6}%"></span><span class="pin" style="left:${p.pos}%" tabindex="0" aria-label="${p.name} ${vtxt}, 상위 ${p.topPct.toFixed(1)}%"></span></div>
        <div class="ends"><span>${p.loLabel} ${p.unit === "" ? p.lo.toFixed(2) : p.lo.toFixed(0)}</span><span>평균 ${p.unit === "" ? p.mean.toFixed(2) : p.mean.toFixed(1)}</span><span>${p.unit === "" ? p.hi.toFixed(2) : p.hi.toFixed(0)} ${p.hiLabel}</span></div>`;
      const pin = it.querySelector(".pin");
      const show = () => { hide(); tip = document.createElement("div"); tip.className = "tooltip";
        tip.innerHTML = `<b>${p.name}</b> ${vtxt}<br>또래 평균 ${p.mean.toFixed(p.unit === "" ? 2 : 1)} (σ ${p.sd.toFixed(2)})<br>상위 ${p.topPct.toFixed(1)}% · 하위 ${p.pct.toFixed(1)}% · z ${p.z.toFixed(2)}`;
        it.appendChild(tip); tip.style.left = p.pos + "%"; tip.style.top = (pin.offsetTop) + "px"; };
      const hide = () => { if (tip) { tip.remove(); tip = null; } };
      pin.addEventListener("mouseenter", show); pin.addEventListener("mouseleave", hide); pin.addEventListener("focus", show); pin.addEventListener("blur", hide);
      box.appendChild(it);
    });
  }

  /* ---------- 체형·추천 ---------- */
  const ICON = { top: "T", bottom: "B", outer: "O" };
  function renderType(spec, values) {
    const c = BF.classify(spec, values, S.sex); const T = $("typeCard"), R = $("reco");
    if (!c) { T.className = "empty"; T.textContent = "어깨너비·허리너비·다리길이·키가 모두 있으면 체형과 추천이 표시됩니다."; R.innerHTML = ""; $("sizeBox").hidden = true; return null; }
    T.className = "type-card";
    T.innerHTML = `<div class="tag">${c.tag} · 분류 신뢰도 ${c.confidence}%</div><h3>${c.frame} · ${c.leg} · ${c.stature}</h3><p>${c.description}</p>
      <div class="meta"><span>어깨/허리 비 ${c.swr.toFixed(2)}</span><span>다리 비율 ${(c.legRatio * 100).toFixed(1)}%</span>${weightMeta()}</div>`;
    R.innerHTML = c.recommendations.map(r => `<div class="r"><h4><span>${ICON[r.icon]}</span>${r.part}</h4>
      <ul>${r.good.map(g => `<li>${g}</li>`).join("")}</ul><ul class="no">${r.bad.map(b => `<li>${b}</li>`).join("")}</ul><p class="why">${r.why}</p></div>`).join("");
    $("sizeBox").hidden = !c.sizes;
    if (c.sizes) $("sizes").innerHTML = c.sizes.map(s => `<div class="s"><span>${s.label}</span><b>${s.size}</b><em>의류 어깨 ${s.garmentShoulder.toFixed(1)}cm</em></div>`).join("");
    return c;
  }
  function weightMeta() {
    const w = parseFloat($("weight").value), h = used("height") / 100; if (!w || !h) return "";
    const bmi = w / (h * h); const [m, sd] = BF.REF[group()].weight; const z = (w - m) / sd;
    return `<span>BMI ${bmi.toFixed(1)}</span><span>몸무게 상위 ${((1 - BF.normCdf(z)) * 100).toFixed(0)}%</span>`;
  }

  /* ---------- 기준 통계 표 ---------- */
  function renderRef() {
    const cols = [["height", "키"], ["shoulder", "어깨너비"], ["waist", "허리너비"], ["leg", "샅높이"], ["chestC", "가슴둘레"], ["waistC", "허리둘레"], ["hipC", "엉덩이둘레"], ["weight", "몸무게"]];
    let h = "<table><thead><tr><th>그룹</th>" + cols.map(c => `<th>${c[1]}</th>`).join("") + "</tr></thead><tbody>";
    for (const g in BF.REF) { const r = BF.REF[g]; h += `<tr><td style="font-family:var(--sans)">${r.label}</td>` + cols.map(c => `<td>${r[c[0]][0]} / ${r[c[0]][1]}</td>`).join("") + "</tr>"; }
    $("refTable").innerHTML = h + "</tbody></table>";
  }

  /* ---------- 아바타 ---------- */
  const svg = $("avatar"); let geo = null;
  function renderAvatar(values) {
    geo = BF.avatarGeometry(values, S.sex);
    let s = BF.avatarSvg(geo, { guides: S.guides });
    const gs = S.garments.slice().sort((a, b) => BF.KIND_ORDER[a.kind] - BF.KIND_ORDER[b.kind]);
    s += gs.map(gm => { const p = BF.garmentPlacement(gm, geo); return `<image data-id="${gm.id}" class="${S.sel === gm.id ? "sel" : ""}" href="${gm.url}" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" width="${p.w.toFixed(1)}" height="${p.h.toFixed(1)}" preserveAspectRatio="none"/>` +
      (S.sel === gm.id ? `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="none" stroke="var(--accent)" stroke-dasharray="4 3" stroke-width="1" pointer-events="none"/>` : ""); }).join("");
    svg.innerHTML = s;
  }
  // 드래그·휠
  let gdrag = null;
  const svgPos = e => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  svg.addEventListener("pointerdown", e => { const im = e.target.closest("image"); if (!im) return; const id = im.dataset.id; S.sel = id; const gm = S.garments.find(g => g.id === id); const q = svgPos(e); gdrag = { gm, sx: q.x - gm.dx, sy: q.y - gm.dy }; svg.setPointerCapture(e.pointerId); renderGarmentList(); renderAvatar(currentValues()); e.preventDefault(); });
  svg.addEventListener("pointermove", e => { if (!gdrag) return; const q = svgPos(e); gdrag.gm.dx = q.x - gdrag.sx; gdrag.gm.dy = q.y - gdrag.sy; renderAvatar(currentValues()); });
  svg.addEventListener("pointerup", () => { gdrag = null; });
  svg.addEventListener("wheel", e => { const im = e.target.closest("image"); if (!im) return; e.preventDefault(); const gm = S.garments.find(g => g.id === im.dataset.id); gm.scale = Math.max(.5, Math.min(2, gm.scale * (e.deltaY < 0 ? 1.04 : 0.96))); syncCtrl(); renderAvatar(currentValues()); }, { passive: false });
  $("guideBtn").addEventListener("click", () => { S.guides = !S.guides; save(); renderAvatar(currentValues()); });

  // 의류 추가
  $("garment").addEventListener("change", e => {
    [...e.target.files].forEach(f => {
      const img = new Image(); img.onload = () => {
        const gm = { id: "g" + Date.now() + Math.random().toString(16).slice(2, 6), name: f.name.replace(/\.[^.]+$/, ""), kind: $("gkind").value, src: img, thr: 34, scale: 1, ys: 1, dx: 0, dy: 0 };
        Object.assign(gm, BF.removeBackground(img, gm.thr)); S.garments.push(gm); S.sel = gm.id; renderGarmentList(); syncCtrl(); renderAvatar(currentValues());
      }; img.src = URL.createObjectURL(f);
    }); e.target.value = "";
  });
  function renderGarmentList() {
    const L = $("glist"); L.innerHTML = S.garments.map(g => `<div class="g ${S.sel === g.id ? "sel" : ""}" data-id="${g.id}"><img src="${g.url}" alt=""><div><div class="gname">${g.name}</div><div class="gmeta">${{ top: "상의", outer: "아우터", bottom: "하의", dress: "원피스", shoes: "신발" }[g.kind]} · 크기 ${(g.scale * 100).toFixed(0)}%</div></div><select data-id="${g.id}"><option value="top">상의</option><option value="outer">아우터</option><option value="bottom">하의</option><option value="dress">원피스</option><option value="shoes">신발</option></select></div>`).join("");
    L.querySelectorAll(".g").forEach(el => { el.addEventListener("click", e => { if (e.target.tagName === "SELECT") return; S.sel = el.dataset.id; renderGarmentList(); syncCtrl(); renderAvatar(currentValues()); }); });
    L.querySelectorAll("select").forEach(sel => { const g = S.garments.find(x => x.id === sel.dataset.id); sel.value = g.kind; sel.addEventListener("change", () => { g.kind = sel.value; g.dx = g.dy = 0; renderGarmentList(); renderAvatar(currentValues()); }); });
    $("gctrl").hidden = !S.sel;
  }
  function syncCtrl() { const g = S.garments.find(x => x.id === S.sel); if (!g) return; $("gthr").value = g.thr; $("gthrO").textContent = g.thr; $("gscale").value = Math.round(g.scale * 100); $("gscaleO").textContent = Math.round(g.scale * 100) + "%"; $("gys").value = Math.round(g.ys * 100); $("gysO").textContent = Math.round(g.ys * 100) + "%"; }
  $("gthr").addEventListener("input", e => { const g = S.garments.find(x => x.id === S.sel); if (!g) return; g.thr = +e.target.value; $("gthrO").textContent = g.thr; Object.assign(g, BF.removeBackground(g.src, g.thr)); renderGarmentList(); renderAvatar(currentValues()); });
  $("gscale").addEventListener("input", e => { const g = S.garments.find(x => x.id === S.sel); if (!g) return; g.scale = e.target.value / 100; $("gscaleO").textContent = e.target.value + "%"; renderGarmentList(); renderAvatar(currentValues()); });
  $("gys").addEventListener("input", e => { const g = S.garments.find(x => x.id === S.sel); if (!g) return; g.ys = e.target.value / 100; $("gysO").textContent = e.target.value + "%"; renderAvatar(currentValues()); });
  $("gcenter").addEventListener("click", () => { const g = S.garments.find(x => x.id === S.sel); if (!g) return; g.dx = g.dy = 0; g.scale = 1; g.ys = 1; syncCtrl(); renderGarmentList(); renderAvatar(currentValues()); });
  $("gdel").addEventListener("click", () => { S.garments = S.garments.filter(x => x.id !== S.sel); S.sel = S.garments[0]?.id || null; renderGarmentList(); syncCtrl(); renderAvatar(currentValues()); });

  /* ---------- PNG 내보내기 ---------- */
  function svgToPng(svgEl, w, h, bg) {
    return new Promise(resolve => {
      const clone = svgEl.cloneNode(true);
      const cs = getComputedStyle(document.documentElement);
      const style = `<style>.body{fill:${cs.getPropertyValue("--av-fill")};stroke:${cs.getPropertyValue("--av-stroke")}} .guides{stroke:${cs.getPropertyValue("--av-guide")};fill:${cs.getPropertyValue("--av-guide")}} text{font-family:monospace}</style>`;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg"); clone.insertAdjacentHTML("afterbegin", style);
      clone.querySelectorAll("rect[stroke]").forEach(r => r.setAttribute("stroke", "#2F5FD9"));
      const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob); const img = new Image();
      img.onload = () => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url); resolve(c); };
      img.src = url;
    });
  }
  const download = (canvas, name) => { const a = document.createElement("a"); a.download = name; a.href = canvas.toDataURL("image/png"); a.click(); };
  $("exportAv").addEventListener("click", async () => { const c = await svgToPng(svg, 960, 1260, getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#fff"); download(c, "bodyfit_avatar.png"); });

  $("shareBtn").addEventListener("click", async () => {
    const values = currentValues(); const spec = BF.spectrum(values, group()); const c = BF.classify(spec, values, S.sex);
    const W = 1080, H = 1350; const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d");
    x.fillStyle = "#F3F5F8"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#16191F"; x.font = "800 44px Manrope, 'Noto Sans KR', sans-serif"; x.fillText("BodyFit Lab", 60, 90);
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
    if (c) {
      y += 10; x.fillStyle = "#16191F"; x.font = "600 22px 'Noto Sans KR', sans-serif"; x.fillText("추천 스타일", 60, y); y += 34;
      x.font = "400 19px 'Noto Sans KR', sans-serif";
      c.recommendations.forEach(r => { x.fillStyle = "#2F5FD9"; x.fillText(r.part, 60, y); x.fillStyle = "#3D444D"; x.fillText(r.good.slice(0, 2).join(" · "), 200, y); y += 32; });
    }
    if (geo) { const av = await svgToPng(svg, 320 * 2, 420 * 2, "rgba(0,0,0,0)"); x.drawImage(av, W - 60 - 300, 130, 300, 394); }
    x.fillStyle = "#6B7480"; x.font = "400 16px 'Noto Sans KR', sans-serif"; x.fillText("출처: 사이즈코리아 제8차 한국인 인체치수조사 · 사진 1장 추정 ±2~3cm · bodyfit lab", 60, H - 50);
    download(cv, "bodyfit_result.png");
  });

  /* ---------- 요약 ---------- */
  function renderSummary(spec, c, values) {
    if (!spec.length) { $("summary").textContent = "아직 결과가 없습니다."; return; }
    const lines = [`[BodyFit Lab] ${BF.REF[group()].label} 기준`];
    spec.forEach(p => lines.push(`${p.name.padEnd(7, " ")} ${p.unit === "" ? p.value.toFixed(2) : p.value.toFixed(1)}${p.unit === "%" ? "%" : p.unit ? p.unit : ""}  (상위 ${p.topPct.toFixed(1)}%, z ${p.z >= 0 ? "+" : ""}${p.z.toFixed(2)})`));
    if (c) { lines.push(`체형: ${c.label}`); c.recommendations.forEach(r => lines.push(`${r.part}: ${r.good.join(", ")}`)); }
    $("summary").textContent = lines.join("\n");
  }
  $("copyBtn").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("summary").textContent); $("copyBtn").textContent = "복사됨"; setTimeout(() => $("copyBtn").textContent = "요약 복사", 1500); } catch (e) { } });

  /* ---------- 전체 갱신 ---------- */
  function currentValues() { const v = {}; ["height", "shoulder", "waist", "leg"].forEach(k => { const u = used(k); if (u) v[k] = u; }); return v; }
  function update(rebuild = true) {
    S.est = stage.measure(parseFloat($("height").value) || 0);
    if (rebuild) renderRows(); else refreshRows();
    const values = currentValues();
    const spec = BF.spectrum(values, group());
    $("groupChip").textContent = BF.REF[group()].label + (BF.REF[group()].status === "approx" ? " · 근사 기준" : "");
    $("srcChip").textContent = Object.values(S.manual).some(v => parseFloat(v) > 0) ? (S.photoLoaded ? "사진 + 직접 입력" : "직접 입력") : (S.photoLoaded ? "사진 추정" : "입력 대기");
    renderSpec(spec);
    const c = renderType(spec, values);
    renderAvatar(values);
    renderSummary(spec, c, values);
    save();
  }
  $("resetAll").addEventListener("click", () => { if (!confirm("입력값·사진·옷을 모두 지울까요?")) return; try { localStorage.removeItem(LS); } catch (e) { } location.reload(); });

  // 초기 상태: 예시 치수(직접 입력)로 화면이 동작하는 모습을 보여줌
  load();
  [...$("sexSeg").children].forEach(b => b.classList.toggle("on", b.dataset.v === S.sex)); $("age").value = S.age;
  if (!Object.keys(S.manual).length) S.manual = { shoulder: "42.5", waist: "27.4", leg: "81.0" };
  renderRef(); update(true);
  // 네비 활성화
  const links = [...document.querySelectorAll(".nav-steps a")];
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id)); }), { rootMargin: "-40% 0px -50% 0px" });
  ["s1", "s2", "s3", "s4"].forEach(id => io.observe($(id)));
  // 모델 미리 로드(백그라운드)
  setTimeout(() => BF.pose.load().catch(() => { }), 1500);
})();
