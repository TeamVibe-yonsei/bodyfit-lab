/* BodyFit Lab — 기준 통계
 * 출처: 제8차 한국인 인체치수조사(사이즈코리아, 2020~2021 직접측정) 값을 인용한 학술논문
 *   - 남성: 김지은·김은경(2023), 한국의상디자인학회지 25(1)
 *   - 여성: 김은경·김지은(2022), 한국의상디자인학회지 24(3)
 *   - 20대 여성 교차검증: Wong·Kwon·Kim(2024), RJCC 32(3)
 * 연령 구분: 20 = 20~26세, 30 = 27~39세. 40대·10대 후반은 보도자료 기반 근사(approx).
 * 값 = [평균, 표준편차] (cm, 몸무게 kg)
 */
window.BF = window.BF || {};
BF.REF = {
  M20: { label: "남성 20~26세", status: "measured",
    height: [174.5, 5.66], weight: [73.0, 11.8], shoulder: [40.1, 1.84], chestW: [31.4, 1.84],
    waist: [28.7, 2.88], hipW: [33.8, 1.92], chestC: [99.9, 6.59], waistC: [82.2, 9.13],
    hipC: [96.9, 6.52], leg: [78.9, 3.84], waistH: [106.1, 4.37] },
  M30: { label: "남성 27~39세", status: "measured",
    height: [174.6, 5.68], weight: [77.8, 11.5], shoulder: [40.1, 1.91], chestW: [32.0, 1.80],
    waist: [30.1, 2.65], hipW: [34.3, 1.78], chestC: [102.6, 6.42], waistC: [86.9, 8.81],
    hipC: [98.8, 5.93], leg: [78.5, 3.76], waistH: [106.5, 4.55] },
  M40: { label: "남성 40대 (근사)", status: "approx",
    height: [173.1, 5.7], weight: [77.0, 11.5], shoulder: [40.0, 1.9], chestW: [32.0, 1.8],
    waist: [30.5, 2.7], hipW: [34.3, 1.8], chestC: [102.5, 6.4], waistC: [88.0, 8.8],
    hipC: [98.5, 6.0], leg: [77.5, 3.8], waistH: [105.5, 4.5] },
  MT: { label: "남성 16~19세 (근사)", status: "approx",
    height: [173.2, 5.8], weight: [68.0, 12.0], shoulder: [39.5, 1.9], chestW: [30.8, 1.8],
    waist: [27.5, 2.8], hipW: [33.4, 1.9], chestC: [96.0, 6.6], waistC: [78.0, 9.0],
    hipC: [95.0, 6.5], leg: [78.5, 3.9], waistH: [105.5, 4.4] },
  F20: { label: "여성 20~26세", status: "measured",
    height: [161.1, 5.18], weight: [55.6, 9.08], shoulder: [35.2, 1.60], chestW: [27.5, 1.65],
    waist: [25.4, 2.43], hipW: [33.4, 2.03], chestC: [86.6, 6.32], waistC: [72.3, 7.58],
    hipC: [93.6, 6.40], leg: [73.1, 3.52], waistH: [98.1, 3.98] },
  F30: { label: "여성 27~39세", status: "measured",
    height: [161.9, 4.95], weight: [57.7, 9.64], shoulder: [35.4, 1.64], chestW: [27.8, 1.69],
    waist: [26.1, 2.52], hipW: [33.7, 1.99], chestC: [87.7, 6.57], waistC: [74.8, 8.37],
    hipC: [94.5, 6.51], leg: [73.0, 3.29], waistH: [98.7, 3.79] },
  F40: { label: "여성 40대 (근사)", status: "approx",
    height: [160.5, 5.0], weight: [59.5, 9.6], shoulder: [35.4, 1.6], chestW: [27.9, 1.7],
    waist: [26.8, 2.5], hipW: [33.9, 2.0], chestC: [89.0, 6.6], waistC: [77.0, 8.4],
    hipC: [95.0, 6.5], leg: [72.3, 3.3], waistH: [98.0, 3.8] },
  FT: { label: "여성 16~19세 (근사)", status: "approx",
    height: [161.7, 5.2], weight: [55.0, 9.0], shoulder: [35.0, 1.6], chestW: [27.3, 1.7],
    waist: [25.0, 2.4], hipW: [33.2, 2.0], chestC: [85.5, 6.3], waistC: [71.5, 7.6],
    hipC: [93.0, 6.4], leg: [73.3, 3.5], waistH: [98.3, 4.0] }
};

/* 스펙트럼에 표시할 항목 */
BF.KEYS = [
  { k: "shoulder", name: "어깨너비", unit: "cm", lo: "좁음", hi: "넓음", desc: "양 어깨점(어깨사이너비) 직선거리" },
  { k: "waist",    name: "허리너비", unit: "cm", lo: "가늘음", hi: "넓음", desc: "정면에서 본 허리 최소 폭" },
  { k: "leg",      name: "다리길이", unit: "cm", lo: "짧음", hi: "김", desc: "샅높이(샅점~바닥)" },
  { k: "height",   name: "키",       unit: "cm", lo: "작음", hi: "큼", desc: "머리끝~바닥" },
  { k: "swr",      name: "어깨/허리 비",  unit: "", lo: "허리 우세", hi: "어깨 우세", desc: "어깨너비 ÷ 허리너비", derived: true },
  { k: "legRatio", name: "다리 비율", unit: "%", lo: "상체 김", hi: "다리 김", desc: "샅높이 ÷ 키", derived: true }
];

/* 파생 지표의 기준 분포: 평균은 실측 평균의 비, 표준편차는 오차 전파 근사 */
BF.derivedRef = function (ref) {
  const [sm, ss] = ref.shoulder, [wm, ws] = ref.waist, [lm, ls] = ref.leg, [hm, hs] = ref.height;
  const swr = sm / wm;
  const swrSd = swr * Math.sqrt((ss / sm) ** 2 + (ws / wm) ** 2) * 0.8; // 어깨·허리 양의 상관 감안
  const lr = lm / hm * 100;
  const lrSd = lr * Math.sqrt((ls / lm) ** 2 + (hs / hm) ** 2) * 0.55; // 다리·키 강한 양의 상관
  return { swr: [swr, swrSd], legRatio: [lr, lrSd] };
};

BF.SIGMA_RANGE = 3;
BF.normCdf = z => 0.5 * (1 + BF.erf(z / Math.SQRT2));
BF.erf = x => { // Abramowitz-Stegun 7.1.26
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
};

/* 의류 사이즈 가이드 (국내 브랜드 실측 기준 통상 범위 — 의류 어깨너비, 몸 어깨너비 + 여유분) */
BF.SIZE_GUIDE = {
  M: [["S", 43, 45.5], ["M", 45.5, 48], ["L", 48, 50.5], ["XL", 50.5, 53], ["2XL", 53, 56]],
  F: [["XS", 35, 37], ["S", 37, 39], ["M", 39, 41], ["L", 41, 43.5], ["XL", 43.5, 46]]
};
BF.FIT_EASE = { slim: 1.5, regular: 3.5, semi: 5.5, over: 8 }; // 의류 어깨 = 몸 어깨 + 여유
