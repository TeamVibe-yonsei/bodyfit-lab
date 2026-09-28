/* BodyFit Lab — 스펙트럼·체형 분류·추천 */
window.BF = window.BF || {};

/* values: {height, shoulder, waist, leg} → 스펙트럼 포인트 목록 */
BF.spectrum = function (values, groupKey) {
  const ref = BF.REF[groupKey];
  const d = BF.derivedRef(ref);
  const all = Object.assign({}, ref, d);
  const v = Object.assign({}, values);
  if (v.weight && v.height) v.bmi = v.weight / ((v.height / 100) ** 2);
  if (v.shoulder && v.waist) v.swr = v.shoulder / v.waist;
  if (v.leg && v.height) v.legRatio = v.leg / v.height * 100;
  const out = [];
  BF.KEYS.forEach(K => {
    const val = v[K.k];
    if (!val || !all[K.k]) return;
    const [m, sd] = all[K.k];
    const z = (val - m) / sd;
    const lo = m - BF.SIGMA_RANGE * sd, hi = m + BF.SIGMA_RANGE * sd;
    const pos = Math.max(1.5, Math.min(98.5, (val - lo) / (hi - lo) * 100));
    const cdf = BF.normCdf(z);
    out.push({ key: K.k, name: K.name, unit: K.unit, desc: K.desc, value: val, mean: m, sd, z, pos,
      lo, hi, loLabel: K.lo, hiLabel: K.hi, invert: !!K.invert,
      // 상위 % : 기본은 값이 클수록 상위, invert(허리너비)는 가늘수록 상위
      topPct: Math.max(0.1, Math.min(99.9, (K.invert ? cdf : 1 - cdf) * 100)),
      pct: Math.max(0.1, Math.min(99.9, (K.invert ? 1 - cdf : cdf) * 100)), derived: !!K.derived });
  });
  return out;
};

BF.CUT = 0.7;

const FRAME_DESC = {
  "역삼각형": { tag: "어깨 우세", text: "어깨가 허리보다 뚜렷하게 넓은 상체 발달형입니다. 상의 실루엣이 자연스럽게 잡히므로 어깨를 더 키우는 요소만 피하면 됩니다." },
  "삼각형": { tag: "하체 우세", text: "허리·골반 폭이 어깨보다 상대적으로 넓은 체형입니다. 상체에 시선을 모으고 하체는 세로 라인으로 정리하면 균형이 잡힙니다." },
  "넓은 직사각형": { tag: "체격형", text: "어깨와 허리가 모두 또래 평균보다 넓은 체격형입니다. 여유 있는 핏과 세로 절개로 부피감을 정리하는 것이 좋습니다." },
  "슬림 직사각형": { tag: "슬림형", text: "어깨와 허리가 모두 평균보다 좁은 슬림형입니다. 레이어드와 구조적인 어깨로 볼륨을 더하면 실루엣이 살아납니다." },
  "균형형": { tag: "표준형", text: "어깨와 허리 폭이 또래 평균 범위 안에 있는 균형형입니다. 대부분의 핏을 소화하므로 다리 비율과 키에 맞춘 기장 선택이 핵심입니다." }
};

BF.classify = function (spec, values, sex) {
  const z = {}; spec.forEach(p => z[p.key] = p.z);
  if (["shoulder", "waist", "leg", "height"].some(k => z[k] === undefined)) return null;
  const C = BF.CUT, zs = z.shoulder, zw = z.waist, zl = z.legRatio ?? z.leg, zh = z.height;
  let frame;
  if (zs - zw > C) frame = "역삼각형";
  else if (zw - zs > C) frame = "삼각형";
  else if (zs > 0.6 && zw > 0.6) frame = "넓은 직사각형";
  else if (zs < -0.6 && zw < -0.6) frame = "슬림 직사각형";
  else frame = "균형형";
  const leg = zl > C ? "롱레그" : zl < -C ? "숏레그" : "표준 다리";
  const stature = zh > C ? "장신" : zh < -C ? "단신" : "평균 키";
  const conf = Math.min(99, Math.round(55 + 15 * (Math.abs(zs - zw) + Math.abs(zl) * 0.5)));
  return {
    frame, leg, stature, tag: FRAME_DESC[frame].tag, description: FRAME_DESC[frame].text,
    label: `${frame} · ${leg} · ${stature}`, confidence: conf,
    legRatio: values.leg / values.height, swr: values.shoulder / values.waist,
    recommendations: BF.recommend(zs, zw, zl, zh, sex),
    sizes: BF.sizeGuide(values, sex, values.group)
  };
};

BF.recommend = function (zs, zw, zl, zh, sex) {
  const C = BF.CUT, R = [];
  const push = (part, icon, good, bad, why) => R.push({ part, icon, good, bad, why });
  // 상의
  if (zs - zw > C) push("상의", "top",
    ["V넥·헨리넥, 세트인 숄더", "어깨선이 딱 맞는 재킷·셔츠", "세로 스트라이프, 어두운 톤 상의"],
    ["드롭숄더·보트넥", "어깨 패드, 가로 스트라이프", "가슴 포켓·견장 등 상체 장식"],
    "어깨가 이미 넓으므로 어깨를 확장하는 디테일을 빼면 실루엣이 정돈됩니다.");
  else if (zw - zs > C) push("상의", "top",
    ["어깨 구조가 있는 재킷·블레이저", "밝은 톤 상의, 가로 스트라이프", "드롭숄더 니트·셔츠"],
    ["허리를 조이는 벨트 강조", "타이트한 상의 인(tuck-in)", "허리 라인에 큰 패턴"],
    "상체 폭을 시각적으로 키워 허리·골반과 균형을 맞추는 방향입니다.");
  else if (zs > 0.6 && zw > 0.6) push("상의", "top",
    ["세미오버핏 셔츠·재킷", "단추 라인·세로 절개가 있는 디자인", "어두운 단색, 무광 소재"],
    ["몸에 붙는 니트", "광택 소재, 큰 패턴", "짧은 기장의 크롭 상의"],
    "부피감을 세로로 정리하고 시선을 분산시키는 것이 핵심입니다.");
  else if (zs < -0.6 && zw < -0.6) push("상의", "top",
    ["레이어드(셔츠+가디건, 티+오버셔츠)", "어깨 패드 재킷, 오버핏 아우터", "두께감 있는 니트·플리스"],
    ["과하게 슬림한 핏", "얇은 소재 단독 착용", "너무 큰 오버사이즈(옷에 묻힘)"],
    "볼륨을 더해 프레임을 채우되, 어깨선은 유지하는 것이 좋습니다.");
  else push("상의", "top",
    ["레귤러~세미오버핏 전반", "라운드·V넥 모두 무난", "대부분의 소재·패턴 소화"],
    ["극단적 오버사이즈(비율 손해)", "어깨선이 크게 벗어나는 핏"],
    "표준 범위라 핏 선택 폭이 넓습니다. 키·다리 비율에 맞춘 기장을 우선하세요.");
  // 하의
  if (zl > C) push("하의", "bottom",
    ["와이드·스트레이트 팬츠", "미드·로우라이즈 모두 소화", "상의 오버핏과 조합"],
    ["발목 위 크롭 기장(이점 감소)", "과한 하이웨이스트+크롭 상의(상체 과소)"],
    "다리 비율이 좋아 기장·핏 제약이 적습니다. 상의를 길게 입어도 균형이 유지됩니다.");
  else if (zl < -C) push("하의", "bottom",
    ["하이웨이스트 + 상의 인(tuck-in)", "스트레이트·부츠컷·세미와이드", "하의와 신발 톤 통일, 살짝 긴 기장"],
    ["로우라이즈", "엉덩이를 덮는 롱 상의", "발목에서 끊기는 하의 + 대비되는 신발"],
    "허리선을 올리고 하의·신발을 한 톤으로 이어 다리를 길게 보이게 하는 방향입니다.");
  else push("하의", "bottom",
    ["스트레이트·테이퍼드 기본", "하이~미드라이즈", "기장은 발등에 살짝 닿는 정도"],
    ["밑위가 극단적으로 짧거나 긴 팬츠"],
    "표준 비율이라 하의는 실루엣 취향대로 고르셔도 됩니다.");
  // 아우터·기장
  if (zh > C) push("아우터·기장", "outer",
    ["롱코트·맥코트·트렌치", "상하 톤 분리로 시선 분할", "볼륨 있는 아우터"],
    ["짧은 크롭 아우터 단독(상체 길어 보임)", "지나치게 얇고 짧은 재킷"],
    "긴 기장을 소화할 수 있어 아우터 선택 폭이 넓습니다.");
  else if (zh < -C) push("아우터·기장", "outer",
    ["크롭·숏 재킷, 블루종", "무릎 위 코트", "원톤 코디로 세로 라인 강조"],
    ["무릎 아래 롱 아우터", "굵은 벨트로 허리 분할", "상하 대비가 강한 색 조합"],
    "세로 라인을 끊지 않는 것이 핵심입니다. 짧은 아우터가 다리를 길어 보이게 합니다.");
  else push("아우터·기장", "outer",
    ["하프코트·블루종·데님 재킷 등 표준 기장", "허벅지 중간~무릎 위 코트"],
    ["무릎을 한참 덮는 롱코트(키에 따라 부담)"],
    "표준 기장 아우터가 가장 안정적입니다.");
  return R;
};

/* 둘레 추정: 정면 폭·BMI·어깨너비를 사이즈코리아 통계와 결합 (줄자 실측값이 있으면 그대로 사용) */
BF.estimateCirc = function (values, groupKey) {
  const ref = BF.REF[groupKey] || BF.REF.M20; const z = (k, v) => (v - ref[k][0]) / ref[k][1];
  const bmi = values.weight && values.height ? values.weight / ((values.height / 100) ** 2) : null;
  const out = {};
  // 가슴둘레: BMI(체중 분포) 0.65 + 어깨너비(골격) 0.35 가중 z-점수
  if (values.chestC) out.chestC = { v: values.chestC, src: "실측" };
  else if (values.shoulder || bmi) {
    const zc = bmi && values.shoulder ? 0.65 * z("bmi", bmi) + 0.35 * z("shoulder", values.shoulder) : bmi ? 0.8 * z("bmi", bmi) : 0.7 * z("shoulder", values.shoulder);
    out.chestC = { v: ref.chestC[0] + ref.chestC[1] * zc, src: "추정" };
  }
  // 허리둘레: 정면 허리폭 × (또래 허리둘레/허리너비 비율) 0.6 + BMI 기반 0.4
  if (values.waistC) out.waistC = { v: values.waistC, src: "실측" };
  else if (values.waist) {
    const byWidth = values.waist * ref.waistC[0] / ref.waist[0];
    const byBmi = bmi ? ref.waistC[0] + ref.waistC[1] * z("bmi", bmi) : null;
    out.waistC = { v: byBmi ? 0.6 * byWidth + 0.4 * byBmi : byWidth, src: "추정" };
  }
  return out;
};
BF.sizeGuide = function (values, sex, groupKey) {
  const chart = BF.SIZE_CHART[sex === "F" ? "F" : "M"]; const c = BF.estimateCirc(values, groupKey || (sex === "F" ? "F20" : "M20"));
  const pick = cm => { const row = chart.top.find(r => cm >= r[2] && cm < r[3]) || chart.top[chart.top.length - 1]; const i = chart.top.indexOf(row);
    const dLo = cm - row[2], dHi = row[3] - cm; let note = "";
    if (dLo < 1.5 && i > 0) note = `${chart.top[i - 1][0]}와 경계 — 슬림하게 입으려면 ${chart.top[i - 1][0]}`; else if (dHi < 1.5 && i < chart.top.length - 1) note = `${chart.top[i + 1][0]}와 경계 — 여유 있게 입으려면 ${chart.top[i + 1][0]}`;
    return { size: row[0], tag: row[1], note }; };
  const out = [];
  if (c.chestC) { const p = pick(c.chestC.v); out.push({ part: "상의", size: p.size, tag: p.tag, basis: `가슴둘레 ${c.chestC.src} ${c.chestC.v.toFixed(0)}cm`, note: p.note }); }
  if (c.waistC) { const inch = c.waistC.v / 2.54; let n = Math.round(inch); n = Math.max(chart.bottomRange[0], Math.min(chart.bottomRange[1], n));
    const frac = inch - Math.floor(inch); const note = frac > 0.35 && frac < 0.65 ? `${Math.floor(inch)}~${Math.ceil(inch)} 사이 — 브랜드별 실측 허리 확인` : "";
    out.push({ part: "하의", size: String(n), tag: "인치", basis: `허리둘레 ${c.waistC.src} ${c.waistC.v.toFixed(0)}cm`, note }); }
  if (c.chestC) { const p = pick(c.chestC.v + BF.OUTER_EASE); out.push({ part: "아우터", size: p.size, tag: p.tag, basis: `가슴둘레 +${BF.OUTER_EASE}cm 레이어링 기준`, note: p.note }); }
  return out.length ? out : null;
};
