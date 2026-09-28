/* Team Vibe — AI 실사 착용 (Google Gemini 이미지 모델, 사용자 본인 API 키로 브라우저에서 직접 호출) */
window.BF = window.BF || {};

BF.ai = {
  MODELS: ["gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview", "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"],
  POINT_MODELS: ["gemini-3.1-flash", "gemini-3-flash-preview", "gemini-3.1-pro-preview", "gemini-3-pro-preview", "gemini-2.5-flash", "gemini-flash-latest"],
  _models: null,
  /* 계정에서 실제 쓸 수 있는 모델 목록 (하루 캐시) */
  async listModels(key) {
    if (this._models) return this._models;
    try { const c = JSON.parse(localStorage.getItem("tv.gemini.models") || "null"); if (c && c.key === key.slice(-6) && Date.now() - c.t < 864e5) return (this._models = c.list); } catch (e) { }
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(key)}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error?.message || `HTTP ${r.status}`);
    const list = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent")).map(m => m.name.replace(/^models\//, ""));
    this._models = list; try { localStorage.setItem("tv.gemini.models", JSON.stringify({ key: key.slice(-6), t: Date.now(), list })); } catch (e) { }
    return list;
  },
  /* 용도별 후보 모델: 선호 순서 + 목록에서 발견된 같은 계열 모델 */
  async candidates(kind, key) {
    let list = []; try { list = await this.listModels(key); } catch (e) { }
    const bad = /tts|audio|live|embed|robotics|computer-use|deep-research/i;
    const pref = kind === "image" ? this.MODELS : this.POINT_MODELS;
    const found = list.filter(n => /^gemini/.test(n) && !bad.test(n) && (kind === "image" ? /image/.test(n) : !/image/.test(n)));
    const rank = n => { const v = (n.match(/gemini-(\d+(?:\.\d+)?)/) || [0, 0])[1] * 1; return v * 10 + (/flash/.test(n) ? 1 : 0) + (/preview|exp/.test(n) ? -0.5 : 0); };
    const dyn = found.sort((a, b) => rank(b) - rank(a));
    const out = []; [...pref.filter(n => !list.length || list.includes(n)), ...dyn, ...pref].forEach(n => { if (!out.includes(n)) out.push(n); });
    return out;
  },
  /* 후보를 차례로 시도: 모델 없음/사용 불가 오류면 다음 후보로 */
  _dead: {},
  friendly(msg, status) {
    const m = msg || "";
    if (/limit:\s*0/.test(m)) return "이 키의 무료 등급에서는 이미지 생성 모델을 쓸 수 없습니다 Google AI Studio에서 결제(종량제)를 설정하면 바로 사용됩니다 (이미지 1장당 약 50원)";
    if (status === 429 || /quota|rate/i.test(m)) { const w = m.match(/retry in (\d+)/i); return `요청이 몰렸습니다 ${w ? Math.ceil(w[1]) + "초" : "잠시"} 후 다시 시도해 주세요`; }
    if (/api key not valid|invalid api key|api_key_invalid/i.test(m)) return "API 키가 올바르지 않습니다 STEP 1에서 키를 다시 넣어 주세요";
    if (/permission|forbidden/i.test(m) || status === 403) return "이 키로는 해당 모델에 접근할 수 없습니다";
    return m.length > 160 ? m.slice(0, 160) + "…" : m;
  },
  async generate(kind, body, key) {
    const cands = (await this.candidates(kind, key)).filter(m => !this._dead[m]); let lastErr, lastStatus = 0, quota0 = false;
    for (const m of cands) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) return j;
      const raw = j.error?.message || `HTTP ${r.status}`; lastErr = raw; lastStatus = r.status;
      const msg = raw.toLowerCase();
      if (r.status === 404 || r.status === 400 && /model|not found|no longer|not supported/.test(msg) || /no longer available|not available|not found/.test(msg)) { this._dead[m] = true; continue; }
      if (r.status === 429 && /limit:\s*0/.test(msg)) { this._dead[m] = true; quota0 = true; continue; }  // 무료 등급 한도 0 → 다른 모델 시도
      throw new Error(this.friendly(raw, r.status));
    }
    throw new Error(quota0 ? this.friendly("limit: 0", 429) : lastErr ? this.friendly(lastErr, lastStatus) : "사용 가능한 모델이 없습니다");
  },
  key() { try { return localStorage.getItem("tv.gemini.key") || ""; } catch (e) { return ""; } },
  setKey(k) { this._models = null; try { localStorage.setItem("tv.gemini.key", k.trim()); localStorage.removeItem("tv.gemini.models"); } catch (e) { } },

  /* 어떤 이미지(svg data URL 포함)든 PNG base64 로 변환 */
  async toPng(src, maxW = 1024) {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const s = Math.min(1, maxW / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    const x = c.getContext("2d"); x.fillStyle = "#ffffff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png").split(",")[1];
  },

  async call(parts, key) {
    const j = await this.generate("image", { contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } }, key);
    const ps = j.candidates?.[0]?.content?.parts || [];
    const im = ps.find(p => p.inlineData || p.inline_data);
    if (!im) { const t = ps.find(p => p.text)?.text; throw new Error(t ? "이미지가 생성되지 않았습니다: " + t.slice(0, 120) : "이미지가 생성되지 않았습니다"); }
    const d = im.inlineData || im.inline_data;
    return `data:${d.mimeType || d.mime_type || "image/png"};base64,${d.data}`;
  },

  /* 기준점 좌표 찍기(pointing): 사진에서 7개 몸 기준점(+카드 긴 변 양 끝)을 0~1000 정규 좌표로 받음 */
  async locatePoints({ b64, useCard, key }) {
    const prompt = `You are a precise anthropometric landmark annotator. The image shows one person standing upright, facing the camera, full body visible. Locate these landmarks as accurately as possible, on the person's body outline (not on clothing folds or background):
- head: the topmost point of the head (include hair)
- heel: the lowest point where the feet touch the floor (midpoint between the two feet)
- shL: the LEFT shoulder in the image (viewer's left) — the outermost bony point of the shoulder (acromion), where the shoulder line meets the upper arm.
- shR: the same point on the viewer's RIGHT shoulder.
- wL / wR: the left and right edges of the torso silhouette at the NARROWEST part of the waist (between the ribs and the hip bones) Both at the same height.
- crotch: the point where the two legs meet (inseam top).${useCard ? `
- cardA / cardB: the two ends of the LONG edge of the credit-card-sized card the person is holding (the two corners of the longer side that is most visible)` : ""}
Answer ONLY with JSON: {"head":[y,x],"heel":[y,x],"shL":[y,x],"shR":[y,x],"wL":[y,x],"wR":[y,x],"crotch":[y,x]${useCard ? `,"cardA":[y,x],"cardB":[y,x]` : ""}} where y and x are integers 0-1000 normalized to the image height and width.`;
    const j = await this.generate("text", { contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: b64 } }] }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }, key);
    const txt = (j.candidates?.[0]?.content?.parts || []).filter(p => p.text).map(p => p.text).join("");
    const mm = txt.match(/\{[\s\S]*\}/); if (!mm) throw new Error("좌표를 읽지 못했습니다");
    const o = JSON.parse(mm[0]); const out = {};
    for (const k of ["head", "heel", "shL", "shR", "wL", "wR", "crotch", "cardA", "cardB"]) { const v = o[k]; if (Array.isArray(v) && v.length >= 2 && isFinite(v[0]) && isFinite(v[1])) out[k] = { y: v[0] / 1000, x: v[1] / 1000 }; }
    if (!out.head || !out.heel || !out.shL || !out.wL || !out.crotch) throw new Error("기준점이 부족합니다");
    return out;
  },

  /* 기본 모델 생성 (사용자 사진이 없을 때) */
  async makeModel({ sex, height, frame, key }) {
    const who = sex === "F" ? "Korean woman in her 20s" : "Korean man in his 20s";
    const prompt = `Photorealistic full-body studio photo of a ${who}, about ${Math.round(height)} cm tall, ${frame || "average"} body shape, standing straight facing the camera with arms slightly away from the body, wearing a plain fitted white t-shirt and plain grey shorts, plain light grey seamless background, soft even lighting, full body from head to shoes visible, 3:4 portrait framing. No text, no watermark.`;
    return this.call([{ text: prompt }], key);
  },

  /* 아무 캡처(모델 착용컷·쇼핑몰 화면)에서 옷만 뽑아 상품컷으로 정리 + 종류 판별 */
  async extractGarment({ b64, key }) {
    const prompt = `Image 1 is a screenshot or photo that contains a clothing item (it may be worn by a model, or surrounded by app UI, text, prices, other products) Task: isolate the single most prominent clothing item and produce a clean e-commerce product photo of ONLY that garment: laid flat, front view, centered, on a pure white background, same colors/material/details, no person, no mannequin, no UI, no text, no watermark, 3:4 framing. Also reply with one line of JSON: {"kind":"top|outer|bottom|shoes|dress","name":"<short Korean product name, e.g. 카키 MA-1 블루종>"}.`;
    const j = await this.generate("image", { contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: b64 } }] }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } }, key);
    const ps = j.candidates?.[0]?.content?.parts || [];
    const im = ps.find(p => p.inlineData || p.inline_data); const txt = ps.filter(p => p.text).map(p => p.text).join(" ");
    let meta = {}; const mm = txt.match(/\{[^}]*"kind"[^}]*\}/); if (mm) { try { meta = JSON.parse(mm[0]); } catch (e) { } }
    if (!im) throw new Error("옷을 추출하지 못했습니다");
    const d = im.inlineData || im.inline_data;
    return { url: `data:${d.mimeType || d.mime_type || "image/png"};base64,${d.data}`, kind: ["top", "outer", "bottom", "shoes", "dress"].includes(meta.kind) ? meta.kind : null, name: meta.name || null };
  },

  /* 코디 플랫레이: 고른 옷들을 바닥에 펼쳐 놓은 스타일 컷 */
  async flatLay({ garments, key }) {
    const list = garments.map((g, i) => `image ${i + 1}: ${g.kind} — ${g.name}`).join("; ");
    const prompt = `Create a top-down "flat lay" outfit photo using exactly these clothing items (${list}) Arrange them neatly on a dark grey concrete floor as a complete outfit: top/outer at the top with sleeves naturally folded, pants below, shoes at the bottom, small accessories beside. Keep each item's real colors, patterns, logos and shapes faithful to the reference images. Soft natural lighting, subtle shadows, editorial fashion-magazine styling, 3:4 portrait framing. No people, no text, no watermark.`;
    const parts = [{ text: prompt }]; garments.forEach(g => parts.push({ inlineData: { mimeType: "image/png", data: g.b64 } }));
    return this.call(parts, key);
  },

  /* 가상 착용: person(base64 png) + garments[{name, kind, size, b64}] */
  async tryOn({ personB64, garments, sizesNote, key }) {
    const list = garments.map((g, i) => `image ${i + 2}: ${g.kind} — ${g.name}${g.size ? ` (size ${g.size})` : ""}`).join("; ");
    const prompt = `Virtual try-on. Image 1 is the person. Dress this exact person in the clothing items shown in the following images (${list}) Keep the person's face, hair, skin, body proportions, pose, camera angle and background exactly the same. Replace only the clothing. Render the garments with realistic fabric, drape, shadows and correct fit${sizesNote ? ` (${sizesNote})` : ""}. Layer order: shoes, bottom, top, outer. Output one photorealistic full-body image, same framing as image 1. No text, no watermark.`;
    const parts = [{ text: prompt }, { inlineData: { mimeType: "image/png", data: personB64 } }];
    garments.forEach(g => parts.push({ inlineData: { mimeType: "image/png", data: g.b64 } }));
    return this.call(parts, key);
  }
};
