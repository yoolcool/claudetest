# 텍스트 월드 생성 시뮬레이터

결정적 RNG 기반의 웹 텍스트 월드 생성기. 동일한 Seed를 입력하면 항상 동일한 맵이 생성된다.

---

## 기술 스택

- **Vite** – 빌드 도구
- **React 19** – UI 프레임워크
- **TypeScript** – 타입 안전성

---

## 빠른 시작

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

---

## 사용 방법

### Seed 입력 및 맵 생성

| 요소 | 설명 |
|------|------|
| **Seed 입력창** | 원하는 정수를 입력한다 |
| **Generate 버튼** | 입력한 Seed로 맵을 (재)생성한다 |
| **Random 버튼** | 무작위 Seed를 생성하고 즉시 맵을 만든다 |

> Enter 키를 눌러도 Generate와 동일하게 동작한다.

### 커서 이동

맵 위에서 커서(`@`)를 이동시켜 셀을 탐색한다.

| 키 | 동작 |
|----|------|
| `↑` / `W` | 위로 이동 |
| `↓` / `S` | 아래로 이동 |
| `←` / `A` | 왼쪽으로 이동 |
| `→` / `D` | 오른쪽으로 이동 |

경계 밖으로는 이동되지 않는다.

### Inspector 패널

화면 우측에 현재 선택된 셀의 정보가 표시된다.

| 항목 | 설명 |
|------|------|
| **Seed** | 현재 맵에 사용된 Seed 값 |
| **X / Y** | 커서의 좌표 (0-based) |
| **Biome** | 선택 셀의 바이옴 종류 |
| **Height** | 고도값 (0.00 ~ 1.00) |
| **Moisture** | 습도값 (0.00 ~ 1.00) |

---

## 맵 기호 표

| 기호 | 바이옴 | 조건 |
|------|--------|------|
| `~` | water (바다/강) | height < 0.30 |
| `^` | mountain (산악) | height > 0.75 |
| `.` | desert (사막) | moisture < 0.30 |
| `"` | swamp (늪지) | moisture > 0.70 |
| `,` | plains (평원) | 그 외 |
| `@` | 커서 위치 | — |

---

## 결정성 검증

동일한 Seed는 항상 동일한 맵을 보장한다.

- 브라우저 콘솔(F12)에서 맵 생성 시 해시값 출력을 확인할 수 있다:

```
[World] seed=12345  hash=0x9f3a1c2e
```

- 동일 Seed → 동일 hash → 동일 맵.
- 새로고침 후 같은 Seed를 입력해도 hash가 변하지 않는다.

### 결정성 구현 원리

각 셀은 전역 Seed + 셀의 좌표(x, y)를 혼합한 독립적인 RNG 인스턴스를 사용한다:

```
rng = createRNG(hashSeed(globalSeed, x, y))
height   = rng()
moisture = rng()
```

xorshift32 알고리즘을 사용하며 외부 노이즈 라이브러리에 의존하지 않는다.

---

## 프로젝트 구조

```
src/
  main.tsx              # 앱 진입점
  App.tsx               # 루트 컴포넌트 (상태, 툴바)
  App.css               # 레이아웃 및 컴포넌트 스타일
  index.css             # 전역 다크 테마
  world/
    rng.ts              # xorshift32 PRNG, hashSeed 유틸
    types.ts            # OverworldCell, Overworld, Biome 타입
    overworld.ts        # 80×40 맵 생성 로직
  ui/
    GridView.tsx        # <pre> 기반 텍스트 렌더러 + 키보드 입력
    Inspector.tsx       # 셀 정보 우측 패널
```

---

## 개발 명령어

```bash
npm run dev      # 개발 서버 실행 (HMR 지원)
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint 검사
```

---

## 로드맵

| 단계 | 내용 |
|------|------|
| **Day 1** ✅ | 결정적 RNG, 80×40 Overworld, 커서, Inspector |
| **Day 2** | 노이즈 기반 지형 (Perlin/Value noise), 바이옴 고도화 |
| **Day 3** | Zone/지하 시스템 |
| **Day 4+** | 이동 시뮬레이션, 히스토리, 저장/불러오기 |
