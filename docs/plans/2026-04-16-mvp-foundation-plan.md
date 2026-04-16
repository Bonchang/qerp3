# QERP v2 MVP Foundation Plan

> For Hermes: follow this plan in small task-by-task increments. Verify each step before moving on.

**Goal:** QERP v2의 첫 구현 단계로, 백엔드 세로 슬라이스와 최소 프론트엔드 연결이 가능한 실행형 프로젝트 골격을 만든다.

**Architecture:** 문서에 이미 합의된 구조를 유지한다. Spring Boot 백엔드를 단일 진실 원천으로 두고, Next.js 프론트엔드는 화면/입력에 집중하며, quant-worker는 이번 단계에서는 인터페이스 자리만 만든다. 초기 구현은 결정적(deterministic) 페이퍼 트레이딩 MVP에만 집중한다.

**Tech Stack:** Java 21, Spring Boot, Gradle, PostgreSQL(개발 초기에는 H2 또는 Testcontainers 보조 가능), Flyway, JUnit 5, Next.js App Router, TypeScript, Python 3.

---

## 0. Current Baseline

현재 저장소 상태:
- 구현 코드는 사실상 없음
- 기준 문서는 존재함:
  - `README.md`
  - `docs/mvp.md`
  - `docs/architecture.md`
  - `docs/decisions.md`
  - `docs/backend-api.md`
  - `docs/backend-test-cases.md`
- `backend/`, `frontend/`, `quant-worker/`, `infra/` 는 README 수준의 빈 골격임

즉, 지금은 리팩터링 단계가 아니라 `문서 → 실행 가능한 첫 코드베이스`로 넘어가는 단계다.

---

## 1. Delivery Goal for Phase 1

이번 첫 구현 라운드의 완료 기준:
1. 백엔드 Spring Boot 앱이 실행된다.
2. 주문/포트폴리오 MVP 도메인 테스트가 돈다.
3. `POST /api/v1/orders`, `GET /api/v1/orders/{id}`, `GET /api/v1/orders`, `POST /api/v1/orders/{id}/cancel`, `GET /api/v1/portfolio`, `GET /api/v1/portfolio/positions` 가 동작한다.
4. 프론트엔드에서 최소한 다음이 보인다:
   - 단일 심볼 시세/기준가
   - 주문 폼
   - 주문 목록
   - 포트폴리오 요약
5. quant-worker는 실제 전략 엔진 대신, 추후 연결 가능한 입출력 계약 자리만 만든다.

---

## 2. Implementation Order

### Phase 1A — Repository bootstrapping

**Objective:** 실행 가능한 프로젝트 뼈대를 만든다.

**Files to create/modify:**
- Create: `backend/settings.gradle`
- Create: `backend/build.gradle`
- Create: `backend/src/main/java/com/qerp/QerpApplication.java`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/test/java/com/qerp/QerpApplicationTests.java`
- Create: `frontend/package.json`
- Create: `frontend/next.config.js`
- Create: `frontend/tsconfig.json`
- Create: `frontend/src/app/page.tsx`
- Create: `quant-worker/requirements.txt`
- Create: `quant-worker/app/__init__.py`
- Modify: `README.md`

**Output:** 백엔드/프론트엔드/워커가 각각 실행 명령을 가진다.

### Phase 1B — Backend domain model first

**Objective:** 주문/체결/포트폴리오 핵심 도메인을 API보다 먼저 고정한다.

**Files to create:**
- `backend/src/main/java/com/qerp/domain/order/Order.java`
- `backend/src/main/java/com/qerp/domain/order/OrderSide.java`
- `backend/src/main/java/com/qerp/domain/order/OrderType.java`
- `backend/src/main/java/com/qerp/domain/order/OrderStatus.java`
- `backend/src/main/java/com/qerp/domain/portfolio/Position.java`
- `backend/src/main/java/com/qerp/domain/portfolio/PortfolioSnapshot.java`
- `backend/src/main/java/com/qerp/domain/market/MarketQuote.java`
- `backend/src/test/java/com/qerp/domain/OrderDomainTest.java`
- `backend/src/test/java/com/qerp/domain/PortfolioCalculationTest.java`

**Output:** 문서의 EX/PF 테스트 케이스를 코드 테스트로 옮긴다.

### Phase 1C — Application services

**Objective:** 주문 생성/조회/취소/포트폴리오 조회 유스케이스를 서비스 계층으로 구현한다.

**Files to create:**
- `backend/src/main/java/com/qerp/application/order/OrderService.java`
- `backend/src/main/java/com/qerp/application/order/OrderQueryService.java`
- `backend/src/main/java/com/qerp/application/portfolio/PortfolioService.java`
- `backend/src/main/java/com/qerp/application/market/MarketDataService.java`
- `backend/src/test/java/com/qerp/application/OrderServiceTest.java`

**Output:** 처음에는 인메모리 저장소로도 괜찮다. 핵심은 deterministic rule 구현이다.

### Phase 1D — REST API layer

**Objective:** `docs/backend-api.md` 계약을 실제 엔드포인트로 노출한다.

**Files to create:**
- `backend/src/main/java/com/qerp/api/order/OrderController.java`
- `backend/src/main/java/com/qerp/api/order/OrderRequest.java`
- `backend/src/main/java/com/qerp/api/order/OrderResponse.java`
- `backend/src/main/java/com/qerp/api/portfolio/PortfolioController.java`
- `backend/src/main/java/com/qerp/api/common/ErrorResponse.java`
- `backend/src/main/java/com/qerp/api/common/GlobalExceptionHandler.java`
- `backend/src/test/java/com/qerp/api/OrderControllerTest.java`
- `backend/src/test/java/com/qerp/api/PortfolioControllerTest.java`

**Output:** API contract와 테스트 케이스 문서가 1:1 대응된다.

### Phase 1E — Persistence hardening

**Objective:** 인메모리 상태를 넘어 DB 정합성 기반으로 간다.

**Files to create:**
- `backend/src/main/resources/db/migration/V1__create_orders.sql`
- `backend/src/main/resources/db/migration/V2__create_positions.sql`
- `backend/src/main/resources/db/migration/V3__create_portfolio_state.sql`
- JPA 또는 JDBC 기반 repository classes
- integration tests with DB

**Output:** 최소 PostgreSQL 스키마와 마이그레이션 체인을 확보한다.

### Phase 1F — Frontend MVP shell

**Objective:** 사용자 관점에서 세로 슬라이스가 보이는 화면을 만든다.

**Files to create:**
- `frontend/src/app/page.tsx`
- `frontend/src/components/order-form.tsx`
- `frontend/src/components/order-list.tsx`
- `frontend/src/components/portfolio-summary.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/types/api.ts`

**Output:** 단일 페이지에서도 좋으니 주문 생성 → 목록 반영 → 포트폴리오 요약 확인이 가능해야 한다.

### Phase 1G — Quant worker placeholder

**Objective:** 실제 퀀트 엔진 전 단계로 인터페이스를 고정한다.

**Files to create:**
- `quant-worker/app/main.py`
- `quant-worker/app/signals.py`
- `quant-worker/app/explanations.py`
- `quant-worker/tests/test_placeholder_signal.py`
- `docs/quant-worker-contract.md`

**Output:** 더미 신호(`BUY`, `HOLD`, `SELL`) + 짧은 설명 문자열을 반환하는 수준의 placeholder를 만든다.

### Phase 1H — Operability baseline

**Objective:** 로컬 개발과 첫 배포 준비를 쉽게 만든다.

**Files to create:**
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `infra/README.md` 업데이트
- `.env.example`

**Output:** 로컬에서 백엔드+프론트엔드+DB를 최소 재현 가능하게 한다.

---

## 3. Recommended Immediate Sprint

다음 스프린트는 아래 범위로 자르는 게 가장 좋다.

### Sprint 1
- backend Spring Boot skeleton 생성
- backend 도메인 테스트 작성
- 인메모리 주문/포트폴리오 서비스 구현
- 핵심 주문 API 6개 구현
- API 테스트 통과

### Sprint 2
- frontend Next.js skeleton 생성
- 주문 폼/목록/포트폴리오 요약 연결
- 수동 E2E 확인

### Sprint 3
- PostgreSQL/Flyway 도입
- persistence 통합 테스트
- docker-compose 정리

### Sprint 4
- quant-worker placeholder + 모드 토글 UI
- 스테이징 후보 배포 구조 정리

---

## 4. Key Risks

1. 문서 과잉 상태에서 실제 코드가 늦게 나오면 추진력이 떨어진다.
2. 초기부터 DB/JPA를 과하게 넣으면 첫 세로 슬라이스 속도가 느려질 수 있다.
3. 프론트엔드를 먼저 키우면 백엔드 계약이 흔들릴 수 있다.
4. quant-worker를 너무 일찍 진짜처럼 만들면 MVP 범위를 망칠 가능성이 있다.

따라서 첫 구현은 반드시:
- backend 중심
- deterministic rule 중심
- in-memory 가능
- contract test 우선
이어야 한다.

---

## 5. Decision Recommendation

지금 당장 가장 좋은 시작점:

**`Phase 1A + Phase 1B + Phase 1C 일부 + Phase 1D 일부`**

즉,
1. Spring Boot skeleton 생성
2. 주문/포트폴리오 도메인 테스트 작성
3. 주문 생성/조회/취소 + 포트폴리오 조회 API를 인메모리로 먼저 완성

이렇게 가면 가장 빨리 “문서 프로젝트”를 “실행 프로젝트”로 바꿀 수 있다.

---

## 6. Definition of Done for the next execution round

다음 실행 라운드 완료 조건:
- `backend`에서 테스트가 돈다.
- 주문 API 6개가 MockMvc 또는 통합테스트 기준 통과한다.
- README에 실행 방법이 적힌다.
- 이후 프론트엔드 연결을 시작할 수 있는 안정된 API 표면이 생긴다.
