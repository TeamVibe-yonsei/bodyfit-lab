/* BodyFit Lab — 기본 제공 의류(SVG) 와 사이즈 규격 */
window.BF = window.BF || {};

/* 각 아이템: 그림의 기준 폭이 실제 몇 cm 인지(refCm) 를 알고 있어 사이즈별로 정확히 배치됨.
   상의·아우터: refCm = 의류 어깨너비, 그림에서 어깨가 차지하는 비율 refFrac
   하의: refCm = 의류 허리(반폭×2 아님, 정면 폭), 신발: 발 길이 근사 */
BF.SIZES_BY = {
  M: {
    top:    { S: 44, M: 46.5, L: 49, XL: 51.5 },      // 의류 어깨너비 cm (국내 남성 레귤러핏 통상값)
    outer:  { S: 46, M: 48.5, L: 51, XL: 53.5 },
    bottom: { 28: 36.5, 30: 38.5, 32: 40.5, 34: 42.5 }, // 허리 정면 폭 cm (인치 사이즈 ÷ 2 × 2.54 근사)
    shoes:  { 250: 25, 260: 26, 270: 27, 280: 28 }
  },
  F: {
    top:    { S: 38, M: 40, L: 42, XL: 44 },          // 여성 상의 어깨너비 cm
    outer:  { S: 40, M: 42.5, L: 45, XL: 47.5 },
    bottom: { 24: 31.5, 25: 32.8, 26: 34, 27: 35.3, 28: 36.5 },
    shoes:  { 225: 22.5, 230: 23, 235: 23.5, 240: 24, 245: 24.5 }
  }
};
BF.SIZES = BF.SIZES_BY.M;
BF.setSizeSex = sex => { BF.SIZES = BF.SIZES_BY[sex === "F" ? "F" : "M"]; };
BF.sizeKeys = kind => Object.keys(BF.SIZES[kind === "dress" ? "top" : kind] || BF.SIZES.top);

const svgUrl = (w, h, inner) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${inner}</svg>`);
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * f)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) * f)), b = Math.max(0, Math.min(255, (n & 255) * f)); return `rgb(${r | 0},${g | 0},${b | 0})`; };

const DRAW = {
  tee(c) { // 200x220, 어깨 폭 = 156 (x 22~178) → refFrac .78
    return svgUrl(200, 220, `<path d="M62 8 Q100 26 138 8 L178 26 L198 74 L160 90 L154 70 L154 212 L46 212 L46 70 L40 90 L2 74 L22 26 Z" fill="${c}" stroke="${shade(c, .75)}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M62 8 Q100 40 138 8" fill="none" stroke="${shade(c, .7)}" stroke-width="3"/><path d="M46 70 L154 70" stroke="${shade(c, .9)}" stroke-width="1" opacity=".5"/>`);
  },
  hoodie(c) { // 200x260, 어깨 152 (24~176) → refFrac .76, 긴소매
    return svgUrl(200, 260, `<path d="M64 14 Q100 2 136 14 L176 26 L196 222 L164 230 L156 76 L156 250 L44 250 L44 76 L36 230 L4 222 L24 26 Z" fill="${c}" stroke="${shade(c, .75)}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M64 14 Q100 62 136 14 Q120 36 100 38 Q80 36 64 14 Z" fill="${shade(c, .85)}"/><rect x="62" y="170" width="76" height="46" rx="8" fill="${shade(c, .92)}" stroke="${shade(c, .75)}" stroke-width="1.5"/>
      <path d="M92 42 L88 92 M108 42 L112 92" stroke="${shade(c, .6)}" stroke-width="3" stroke-linecap="round"/><path d="M44 236 L156 236" stroke="${shade(c, .8)}" stroke-width="2"/>`);
  },
  shirt(c) { // 200x260, 어깨 152 → refFrac .76, 긴소매
    return svgUrl(200, 260, `<path d="M70 6 L100 30 L130 6 L176 22 L194 216 L162 224 L156 72 L156 252 L44 252 L44 72 L38 224 L6 216 L24 22 Z" fill="${c}" stroke="${shade(c, .78)}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M70 6 L84 22 L100 30 L116 22 L130 6" fill="none" stroke="${shade(c, .7)}" stroke-width="2.5"/><path d="M100 30 L100 250" stroke="${shade(c, .75)}" stroke-width="1.5"/>
      ${[70, 110, 150, 190, 230].map(y => `<circle cx="100" cy="${y}" r="2.6" fill="${shade(c, .55)}"/>`).join("")}<rect x="118" y="54" width="26" height="24" fill="none" stroke="${shade(c, .75)}" stroke-width="1.2"/>
      <path d="M8 204 L40 210 M160 210 L192 204" stroke="${shade(c, .7)}" stroke-width="1.5"/>`);
  },
  coat(c) { // 200x340, 어깨 152 → refFrac .76, 긴소매 롱코트
    return svgUrl(200, 340, `<path d="M66 10 L100 40 L134 10 L176 24 L198 230 L164 238 L160 120 L172 330 L28 330 L40 120 L36 238 L2 230 L24 24 Z" fill="${c}" stroke="${shade(c, .75)}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M66 10 L100 70 L134 10 L118 28 L100 40 L82 28 Z" fill="${shade(c, .82)}"/><path d="M100 70 L100 328" stroke="${shade(c, .7)}" stroke-width="1.5"/>
      ${[120, 172, 224].map(y => `<circle cx="112" cy="${y}" r="3" fill="${shade(c, .5)}"/>`).join("")}<path d="M48 210 L86 210 M114 210 L152 210" stroke="${shade(c, .7)}" stroke-width="2"/>
      <path d="M4 218 L38 224 M162 224 L196 218" stroke="${shade(c, .7)}" stroke-width="1.5"/>`);
  },
  jeans(c) { // 160x300, 허리 폭 = 128 (16~144) → refFrac .8
    return svgUrl(160, 300, `<path d="M16 6 L144 6 L152 150 L146 296 L92 296 L80 110 L68 296 L14 296 L8 150 Z" fill="${c}" stroke="${shade(c, .72)}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M16 6 L144 6 L142 22 L18 22 Z" fill="${shade(c, .88)}"/><path d="M80 24 L80 110" stroke="${shade(c, .7)}" stroke-width="2"/>
      <path d="M22 30 Q40 48 56 32 M104 32 Q120 48 138 30" fill="none" stroke="${shade(c, .7)}" stroke-width="1.5"/><circle cx="80" cy="14" r="3" fill="${shade(c, .5)}"/>`);
  },
  wide(c) { // 190x300, 허리 128 (31~159) → refFrac .674
    return svgUrl(190, 300, `<path d="M31 6 L159 6 L188 296 L104 296 L95 120 L86 296 L2 296 Z" fill="${c}" stroke="${shade(c, .72)}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M31 6 L159 6 L158 22 L32 22 Z" fill="${shade(c, .88)}"/><path d="M95 24 L95 120" stroke="${shade(c, .7)}" stroke-width="2"/>
      <path d="M50 24 L30 290 M140 24 L160 290" stroke="${shade(c, .8)}" stroke-width="1" opacity=".6"/>`);
  },
  shorts(c) { // 160x150, 허리 128
    return svgUrl(160, 150, `<path d="M16 6 L144 6 L152 146 L92 146 L80 90 L68 146 L8 146 Z" fill="${c}" stroke="${shade(c, .72)}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M16 6 L144 6 L142 22 L18 22 Z" fill="${shade(c, .88)}"/><path d="M80 24 L80 90" stroke="${shade(c, .7)}" stroke-width="2"/>`);
  },
  sneaker(c) { // 220x80 두 짝, 발길이 = 100px 한 짝 → refFrac .45
    const one = (x) => `<g transform="translate(${x} 0)"><path d="M6 60 Q4 40 20 34 L44 30 Q60 10 78 8 L96 14 Q104 40 100 60 Q60 72 6 60 Z" fill="${c}" stroke="${shade(c, .7)}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M4 60 Q52 76 102 60 L102 70 Q52 82 4 70 Z" fill="#f2f2f0" stroke="${shade(c, .7)}" stroke-width="1.5"/><path d="M44 30 L60 46 M54 24 L70 40 M64 18 L80 34" stroke="${shade(c, .6)}" stroke-width="2" stroke-linecap="round"/></g>`;
    return svgUrl(220, 80, one(0) + one(114));
  }
};

/* 카탈로그: refFrac = 기준 치수가 그림 폭에서 차지하는 비율 */
BF.CATALOG = [
  { id: "tee-white", tags: ["티셔츠","레귤러","라운드","밝은 톤","단색"], name: "베이직 티셔츠", kind: "top", draw: "tee", color: "#F4F4F1", refFrac: .78, w: 200, h: 220, fit: "레귤러" },
  { id: "tee-black", tags: ["티셔츠","레귤러","라운드","어두운","단색"], name: "베이직 티셔츠", kind: "top", draw: "tee", color: "#23252B", refFrac: .78, w: 200, h: 220, fit: "레귤러" },
  { id: "tee-navy", tags: ["티셔츠","레귤러","라운드","어두운","단색"], name: "베이직 티셔츠", kind: "top", draw: "tee", color: "#2E3F66", refFrac: .78, w: 200, h: 220, fit: "레귤러" },
  { id: "shirt-blue", tags: ["셔츠","단추","레귤러","밝은 톤","어깨선"], name: "옥스포드 셔츠", kind: "top", draw: "shirt", color: "#BFD3EC", refFrac: .76, w: 200, h: 260, fit: "레귤러" },
  { id: "shirt-white", tags: ["셔츠","단추","레귤러","밝은 톤","어깨선"], name: "옥스포드 셔츠", kind: "top", draw: "shirt", color: "#F7F7F4", refFrac: .76, w: 200, h: 260, fit: "레귤러" },
  { id: "hoodie-grey", tags: ["세미오버","오버핏","후드","두께감","드롭숄더"], name: "후드 스웨트셔츠", kind: "top", draw: "hoodie", color: "#A7ABB3", refFrac: .76, w: 200, h: 260, fit: "세미오버" },
  { id: "hoodie-green", tags: ["세미오버","오버핏","후드","두께감","드롭숄더","어두운"], name: "후드 스웨트셔츠", kind: "top", draw: "hoodie", color: "#3F6B4F", refFrac: .76, w: 200, h: 260, fit: "세미오버" },
  { id: "coat-camel", tags: ["롱코트","코트","볼륨"], name: "싱글 코트", kind: "outer", draw: "coat", color: "#C9A57A", refFrac: .76, w: 200, h: 340, fit: "레귤러" },
  { id: "coat-black", tags: ["롱코트","코트","어두운","원톤"], name: "싱글 코트", kind: "outer", draw: "coat", color: "#2A2C31", refFrac: .76, w: 200, h: 340, fit: "레귤러" },
  { id: "jeans-indigo", tags: ["스트레이트","데님","미드"], name: "스트레이트 데님", kind: "bottom", draw: "jeans", color: "#3A4E7A", refFrac: .80, w: 160, h: 300, fit: "스트레이트" },
  { id: "jeans-black", tags: ["스트레이트","데님","어두운","톤 통일"], name: "스트레이트 데님", kind: "bottom", draw: "jeans", color: "#2B2C30", refFrac: .80, w: 160, h: 300, fit: "스트레이트" },
  { id: "chino-beige", tags: ["스트레이트","치노","테이퍼드"], name: "치노 팬츠", kind: "bottom", draw: "jeans", color: "#CFC2A6", refFrac: .80, w: 160, h: 300, fit: "스트레이트" },
  { id: "wide-grey", tags: ["와이드","슬랙스","세미와이드"], name: "와이드 슬랙스", kind: "bottom", draw: "wide", color: "#7B7F86", refFrac: .674, w: 190, h: 300, fit: "와이드" },
  { id: "shorts-khaki", tags: ["쇼츠","크롭"], name: "버뮤다 쇼츠", kind: "bottom", draw: "shorts", color: "#8B8A6A", refFrac: .80, w: 160, h: 150, fit: "레귤러" },
  { id: "sneaker-white", tags: ["스니커즈"], name: "스니커즈", kind: "shoes", draw: "sneaker", color: "#F2F2EE", refFrac: .45, w: 220, h: 80, fit: "" },
  { id: "sneaker-black", tags: ["스니커즈","톤 통일"], name: "스니커즈", kind: "shoes", draw: "sneaker", color: "#2A2B2F", refFrac: .45, w: 220, h: 80, fit: "" }
];
BF.CATALOG.forEach(c => { c.url = DRAW[c.draw](c.color); });
/* STEP 3 추천 문구 ↔ 옷 태그 매칭: 추천 "좋아요" 문장에 태그가 포함되면 추천 옷 */
BF.recoMatch = function (recs, items) {
  const out = [];
  (recs || []).forEach(r => (r.good || []).forEach(phrase => {
    items.forEach(it => { if ((it.tags || []).some(t => phrase.includes(t)) && !out.some(o => o.item === it)) out.push({ item: it, part: r.part, phrase }); });
  }));
  return out;
};
BF.KIND_LABEL = { top: "상의", outer: "아우터", bottom: "하의", dress: "원피스", shoes: "신발" };
