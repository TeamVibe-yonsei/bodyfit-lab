# BodyFit Lab — 웹앱 (순수 HTML/JS, 서버 불필요)

전신 사진 한 장 → 어깨너비·허리너비·다리길이 추정 → 사이즈코리아 8차 인체치수 분포 대비 위치(상위 %) → 체형 유형·스타일 추천·사이즈 가이드 → 백색 아바타에 옷 입혀 보기.
모든 처리가 브라우저 안에서 이루어지며 사진은 서버로 전송되지 않습니다.

## 폴더 구조
```
index.html          화면
css/style.css       스타일(라이트/다크 테마)
js/reference.js     기준 통계(사이즈코리아 8차 인용값) · 사이즈 가이드
js/classify.js      스펙트럼(z-점수·상위 %) · 체형 분류 · 추천
js/measure.js       사진 스테이지(기준점 드래그) · MediaPipe 포즈 자동 인식
js/avatar.js        백색 아바타(SVG) · 의류 배경 제거·배치
js/app.js           화면 제어 · 저장 · PNG 내보내기
vendor/pose/        MediaPipe Pose 런타임·모델 (자체 호스팅, 24MB)
```

## 로컬에서 열기
파일을 더블클릭(file://)하면 포즈 인식 모델을 불러올 수 없습니다. 간단한 로컬 서버로 여세요.
- VS Code: 확장 "Live Server" 설치 → index.html 우클릭 → Open with Live Server
- 또는 터미널: `python -m http.server 8000` → 브라우저에서 http://localhost:8000

## GitHub Pages로 배포 (무료, 링크 하나로 접속)
1. github.com 로그인 → New repository → 이름 `bodyfit-lab` → Public → Create
2. "uploading an existing file" 클릭 → 이 폴더의 **모든 파일·폴더**를 드래그(vendor 포함) → Commit changes
   - 파일이 많으면 GitHub Desktop 앱으로 폴더째 올리는 것이 편합니다.
3. 저장소 Settings → Pages → Source: "Deploy from a branch" → Branch: `main` / `(root)` → Save
4. 1~2분 후 `https://<아이디>.github.io/bodyfit-lab/` 에서 접속 가능

카메라 촬영 기능은 HTTPS(GitHub Pages 기본)에서만 동작합니다.

## 정확도·데이터 출처
- 기준 통계: 제8차 한국인 인체치수조사(2020~2023) 직접측정치를 인용한 김지은·김은경(2023), 김은경·김지은(2022) 논문 값. 40대·10대 후반은 보도자료 기반 근사값(코드에 status: "approx" 표시).
- 체형 분류 컷오프(±0.7σ)는 초기값이며 연구 데이터로 조정 예정.
- 사진 1장 추정치는 자세·거리·의복에 따라 ±2~3cm 오차가 있습니다.

## 라이선스
MediaPipe: Apache-2.0 (Google). 나머지 코드: 연세대학교 학생자율연구 BodyFit Lab 팀.
