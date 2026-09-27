/* Team Vibe — AI 실사 착용 (Google Gemini 이미지 모델, 사용자 본인 API 키로 브라우저에서 직접 호출) */
window.BF = window.BF || {};

BF.ai = {
  MODELS: ["gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"],
  key() { try { return localStorage.getItem("tv.gemini.key") || ""; } catch (e) { return ""; } },
  setKey(k) { try { localStorage.setItem("tv.gemini.key", k.trim()); } catch (e) { } },

  /* 어떤 이미지(svg data URL 포함)든 PNG base64 로 변환 */
  async toPng(src, maxW = 1024) {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const s = Math.min(1, maxW / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    const x = c.getContext("2d"); x.fillStyle = "#ffffff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png").split(",")[1];
  },

  async call(parts, key) {
    let lastErr;
    for (const m of this.MODELS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { lastErr = new Error(j.error?.message || `HTTP ${r.status}`); if (r.status === 404) continue; throw lastErr; }
      const ps = j.candidates?.[0]?.content?.parts || [];
      const im = ps.find(p => p.inlineData || p.inline_data);
      if (!im) { const t = ps.find(p => p.text)?.text; throw new Error(t ? "이미지가 생성되지 않았습니다: " + t.slice(0, 120) : "이미지가 생성되지 않았습니다"); }
      const d = im.inlineData || im.inline_data;
      return `data:${d.mimeType || d.mime_type || "image/png"};base64,${d.data}`;
    }
    throw lastErr || new Error("모델을 사용할 수 없습니다");
  },

  /* 기본 모델 생성 (사용자 사진이 없을 때) */
  async makeModel({ sex, height, frame, key }) {
    const who = sex === "F" ? "Korean woman in her 20s" : "Korean man in his 20s";
    const prompt = `Photorealistic full-body studio photo of a ${who}, about ${Math.round(height)} cm tall, ${frame || "average"} body shape, standing straight facing the camera with arms slightly away from the body, wearing a plain fitted white t-shirt and plain grey shorts, plain light grey seamless background, soft even lighting, full body from head to shoes visible, 3:4 portrait framing. No text, no watermark.`;
    return this.call([{ text: prompt }], key);
  },

  /* 아무 캡처(모델 착용컷·쇼핑몰 화면)에서 옷만 뽑아 상품컷으로 정리 + 종류 판별 */
  async extractGarment({ b64, key }) {
    const prompt = `Image 1 is a screenshot or photo that contains a clothing item (it may be worn by a model, or surrounded by app UI, text, prices, other products). Task: isolate the single most prominent clothing item and produce a clean e-commerce product photo of ONLY that garment: laid flat, front view, centered, on a pure white background, same colors/material/details, no person, no mannequin, no UI, no text, no watermark, 3:4 framing. Also reply with one line of JSON: {"kind":"top|outer|bottom|shoes|dress","name":"<short Korean product name, e.g. 카키 MA-1 블루종>"}.`;
    let lastErr;
    for (const m of this.MODELS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: b64 } }] }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { lastErr = new Error(j.error?.message || `HTTP ${r.status}`); if (r.status === 404) continue; throw lastErr; }
      const ps = j.candidates?.[0]?.content?.parts || [];
      const im = ps.find(p => p.inlineData || p.inline_data); const txt = ps.filter(p => p.text).map(p => p.text).join(" ");
      let meta = {}; const mm = txt.match(/\{[^}]*"kind"[^}]*\}/); if (mm) { try { meta = JSON.parse(mm[0]); } catch (e) { } }
      if (!im) throw new Error("옷을 추출하지 못했습니다");
      const d = im.inlineData || im.inline_data;
      return { url: `data:${d.mimeType || d.mime_type || "image/png"};base64,${d.data}`, kind: ["top", "outer", "bottom", "shoes", "dress"].includes(meta.kind) ? meta.kind : null, name: meta.name || null };
    }
    throw lastErr || new Error("모델을 사용할 수 없습니다");
  },

  /* 코디 플랫레이: 고른 옷들을 바닥에 펼쳐 놓은 스타일 컷 */
  async flatLay({ garments, key }) {
    const list = garments.map((g, i) => `image ${i + 1}: ${g.kind} — ${g.name}`).join("; ");
    const prompt = `Create a top-down "flat lay" outfit photo using exactly these clothing items (${list}). Arrange them neatly on a dark grey concrete floor as a complete outfit: top/outer at the top with sleeves naturally folded, pants below, shoes at the bottom, small accessories beside. Keep each item's real colors, patterns, logos and shapes faithful to the reference images. Soft natural lighting, subtle shadows, editorial fashion-magazine styling, 3:4 portrait framing. No people, no text, no watermark.`;
    const parts = [{ text: prompt }]; garments.forEach(g => parts.push({ inlineData: { mimeType: "image/png", data: g.b64 } }));
    return this.call(parts, key);
  },

  /* 가상 착용: person(base64 png) + garments[{name, kind, size, b64}] */
  async tryOn({ personB64, garments, sizesNote, key }) {
    const list = garments.map((g, i) => `image ${i + 2}: ${g.kind} — ${g.name}${g.size ? ` (size ${g.size})` : ""}`).join("; ");
    const prompt = `Virtual try-on. Image 1 is the person. Dress this exact person in the clothing items shown in the following images (${list}). Keep the person's face, hair, skin, body proportions, pose, camera angle and background exactly the same. Replace only the clothing. Render the garments with realistic fabric, drape, shadows and correct fit${sizesNote ? ` (${sizesNote})` : ""}. Layer order: shoes, bottom, top, outer. Output one photorealistic full-body image, same framing as image 1. No text, no watermark.`;
    const parts = [{ text: prompt }, { inlineData: { mimeType: "image/png", data: personB64 } }];
    garments.forEach(g => parts.push({ inlineData: { mimeType: "image/png", data: g.b64 } }));
    return this.call(parts, key);
  }
};
