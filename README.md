# 텍스트 월드 제너레이터

브라우저에서 동작하는 절차적 텍스트 세계 시뮬레이션.
80×40 ASCII 맵 위에 바이옴·엔티티·나래이션이 실시간으로 생성·진행됩니다.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Vite 7 + React 19 + TypeScript (strict) |
| 렌더링 | `<pre>` + `<span>` 셀 방식 — DOM 직접 조작 없음 |
| 스타일 | 순수 CSS (미디어 쿼리로 모바일/데스크톱 분기) |
| 상태 관리 | React `useState` / `useRef` / `useCallback` / `useEffect` |
| 난수 | xorshift32 PRNG — 외부 노이즈 라이브러리 미사용 |

---

## 빠른 시작

```bash
npm install
npm run dev        # 개발 서버 http://localhost:5173
npm run build      # 프로덕션 빌드 → dist/
npm run lint       # ESLint 검사
npx tsc --noEmit   # 타입 체크
```

---

## 구현 내역

### Day 1–2: 기반 인프라

- **Vite + React + TypeScript** 프로젝트 초기화
- **xorshift32 PRNG** (`src/world/rng.ts`)
  - `createRNG(seed)` — 상태를 클로저로 보유하는 결정론적 난수 스트림
  - `hashSeed(...args)` — 여러 인자를 XOR-혼합해 고유 시드 생성
- **오버월드 생성** (`src/world/overworld.ts`)
  - 80×40 격자, 시드 기반 완전 재현 가능
  - 2개 노이즈 레이어(지형 고도 + 습도) 합성
  - 6가지 바이옴: `water` / `plains` / `forest` / `desert` / `rocky_mountain` / `alpine`
- **GridView** (`src/ui/GridView.tsx`)
  - `ResizeObserver`로 폰트 크기 자동 조정 (화면을 꽉 채움)
  - 키보드(WASD / 화살표) + 마우스 클릭으로 커서 이동
  - `touch-action: none` + Pointer Events로 터치 지원
- **Inspector** (`src/ui/Inspector.tsx`)
  - 현재 커서의 바이옴·고도·습도·좌표 표시
  - 접힘/펼침 토글, `noCollapse` prop으로 강제 펼침 지원

### Day 2.5: 바이옴 색상 렌더링

- 셀별 `<span>` + CSS 클래스로 바이옴별 색상 구분
- 결정성 검증: `[World] seed=12345  hash=0x9f3a1c2e` 콘솔 출력

### Day 3: 엔티티 & 콘솔 로그

- **엔티티 시스템** (`src/world/entities.ts`)
  - 4종류: 염소(`g`) / 새(`b`) / 개구리(`f`) / 방랑자(`W`) — 총 12마리
  - 바이옴 선호도 기반 배치 (30회 시도, 실패 시 비-물 셀로 폴백)
  - 1초 틱마다 4방향 랜덤 이동 — 시드 × id × tick 해시로 결정론적
  - 개구리만 물 위 이동 가능; 나머지는 물 회피
- **콘솔 로그** (`src/ui/ConsoleLog.tsx`)
  - 타입라이터 효과 (28ms/글자)
  - `Array.from(text)` — 한국어 Unicode 문자 안전 처리
  - 최신 로그 자동 스크롤, 최대 40개 항목 유지

### Day 3 폴리시: BottomPanel + NPC 스팸 방지

- **BottomPanel** (`src/ui/BottomPanel.tsx`)
  - 드래그 리사이즈 핸들 (Pointer Events + `setPointerCapture`)
  - 3단계 스냅: 접힘 40px / 미니 180px / 확장 max(240px, 40vh)
  - 탭: **콘솔** / **맵정보**
  - 2열 그리드: 좌(콘솔/인스펙터 `1fr`) + 우(D-pad 전용 `156px`)
- **NPC 근접 메시지** (`src/world/simulation.ts`)
  - **FAR → NEAR 진입 이벤트**만 트리거 (`enteredNear = !wasNear && isNearNow`)
  - 엔티티별 30틱 쿨다운 (`lastSpokeAt` 추적)
  - 확률 게이트: 방랑자 60%, 동물 35%
  - 전역 스로틀: 호출당 최대 1개 메시지, 방랑자 우선

### 나래이션 시스템

- **80줄 한국어 서정 나래이션** (`src/world/narration.ts`)
  - 바이옴 태그: `water` / `forest` / `desert` / `plains` / `mountain` / `sky` / `lore` / `time` / `general`
  - **셔플백 알고리즘**: Fisher-Yates + seeded RNG + 재셔플 카운트 솔트
  - **최근 12개 창** — 동일 문장 반복 방지, 최대 10회 재시도
  - 플레이어 이동 시 발생 (틱 기반 아님)
  - 발화 조건: 쿨다운 8틱 + 18% 확률 + 같은 이동에서 NPC 대사 미발생
  - 바이옴 태그 친화도 필터링 (현재 바이옴 우선, 비매칭은 폴백)

### UI/기능 최종 수정 (버그 픽스 포함)

- 지도 상하 여백 대폭 축소 (`.app` padding 최소화)
- 콘솔 기본 높이 → 최소 8줄 표시 (H_MINI=180px)
- D-pad를 맵 오버레이에서 BottomPanel 우측 전용 컬럼으로 이동 (맵 가림 없음)
- **NPC 마주침 버그 수정**
  - **원인**: 틱 이펙트에서 `updateProximity()` 호출 → `wasNear=true` 선점 → 커서 이동 시 `enteredNear` 항상 `false`
  - **수정**: `updateProximity()`를 틱 이펙트에서 완전 제거, 커서 이동 이펙트에서만 호출
- `DEBUG_PROXIMITY` 플래그 추가

---

## 파일 구조

```
src/
├── App.tsx                  # 루트 컴포넌트 — 상태, 이펙트, 레이아웃
├── App.css                  # 전체 스타일 (모바일/데스크톱 미디어 쿼리)
│
├── world/
│   ├── types.ts             # Overworld, Cell, Biome 타입
│   ├── rng.ts               # xorshift32 PRNG (createRNG, hashSeed)
│   ├── overworld.ts         # 노이즈 기반 월드 생성
│   ├── entities.ts          # EntityKind, spawnEntities, tickEntities
│   ├── simulation.ts        # updateProximity, NearStateMap, DEBUG_PROXIMITY
│   └── narration.ts         # 80줄 나래이션, 셔플백, maybeEmitNarration
│
└── ui/
    ├── GridView.tsx          # 80×40 텍스트 맵 렌더러
    ├── Inspector.tsx         # 커서 위치/바이옴 정보 패널
    ├── ConsoleLog.tsx        # 타입라이터 콘솔 로그
    ├── BottomPanel.tsx       # 모바일 하단 패널 (드래그 리사이즈, 탭, D-pad)
    ├── TouchPad.tsx          # D-pad 컴포넌트
    └── tileClasses.ts        # 바이옴 → CSS 클래스 매핑
```

---

## 조작 방법

| 입력 | 동작 |
|------|------|
| `W` / `↑` | 커서 위로 |
| `S` / `↓` | 커서 아래로 |
| `A` / `←` | 커서 왼쪽 |
| `D` / `→` | 커서 오른쪽 |
| 마우스 클릭 | 해당 셀로 커서 이동 |
| 모바일 D-pad | 하단 패널 우측 컬럼에서 이동 |
| 하단 핸들 드래그 | 패널 높이 조절 (3단계 스냅) |
| 핸들 탭 | 접힘 → 미니 → 확장 순환 |
| `Enter` | Seed 입력 후 Generate |

---

## 바이옴 색상표

| 기호 | 바이옴 | 색상 |
|------|--------|------|
| `~` | water | 하늘색 `#4FC3F7` |
| `.` | plains | 연두 `#9CCC65` |
| `♣` | forest | 짙은 초록 `#2E7D32` |
| `°` | desert | 황토 `#FBC02D` |
| `▲` | rocky_mountain | 회색 `#B0BEC5` |
| `*` | alpine | 흰색 계열 `#E0F7FA` |
| `@` | 커서 | 빨강 `#FF5252` |

---

## 엔티티 글리프

| 글리프 | 종류 | 선호 바이옴 | 물 이동 |
|--------|------|-------------|---------|
| `g` | 염소 | rocky_mountain, alpine, plains | 불가 |
| `b` | 새 | plains, forest, alpine | 불가 |
| `f` | 개구리 | water, plains, forest | 가능 |
| `W` | 방랑자 | plains, desert, forest | 불가 |

---

## 콘솔 이벤트 색상

| 색상 | 이벤트 종류 |
|------|-------------|
| 회색 `#888` | 시스템 메시지 |
| 연두 `#C5E1A5` | 엔티티 마주침 (encounter) |
| 청록 `#80CBC4` | 정보 (info) |
| 뮤트 청록 `#8ab4b0` | 서정 나래이션 (narration) |
| 어두운 청회 `#546E7A` | 틱 이벤트 (tick) |

---

## 결정성 검증

동일한 Seed는 항상 동일한 맵·엔티티 배치를 보장합니다.

```
[World] seed=12345  hash=0x9f3a1c2e
```

새로고침 후 같은 Seed를 입력하면 hash가 변하지 않습니다.

---

## 디버그

브라우저 개발자 도구 콘솔에서 NPC 근접 판정 로그를 켤 수 있습니다.

```js
// 소스 파일에서 직접 수정
// src/world/simulation.ts:
export let DEBUG_PROXIMITY = true;
```

활성화 시 출력 예시:

```
[DEBUG] entity wanderer-2 dist=1 enteredNear=true wasNear=false cooldownOk=true (tick=45 lastSpokeAt=-999)
[DEBUG] entity goat-0 dist=2 enteredNear=false wasNear=true cooldownOk=true (tick=45 lastSpokeAt=12)
```

출력 항목: 엔티티 종류·id, Chebyshev 거리, 진입 여부, 이전 근접 상태, 쿨다운 충족 여부, 현재 틱·마지막 발화 틱.

---

## 브랜치

```
claude/text-world-generator-VOZHz
```
