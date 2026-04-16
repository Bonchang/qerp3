# QERP v2

QERP v2는 **배포 가능한 모의투자 앱**을 목표로 하는 MVP 프로젝트입니다. 현재는 백엔드 API와 프론트엔드 쉘을 연결한 세로 슬라이스가 구현되어 있습니다.

## 현재 아키텍처
- `backend/`: **Spring Boot 3 + Java 21 + Gradle** 기반 API 서버
- `frontend/`: **Next.js(App Router) 기반 MVP UI shell**
- 데이터 계층: **PostgreSQL + Flyway**(스키마 마이그레이션)
- `quant-worker/`: Python 워커 자리만 마련된 상태(실제 연산 로직 미구현)
- `infra/`, `docs/`: 운영/설계 문서 및 기준 관리

## MVP에서 현재 가능한 기능
- 페이퍼 주문 생성/조회/목록/취소
- 포트폴리오 요약(현금/평가금액/손익) 조회
- 포지션 목록 조회
- 프론트엔드에서 주문 입력, 최근 주문/포트폴리오 확인
- 백엔드 미가용 시 UI fallback 표시

## 구현된 API 엔드포인트
- `POST /api/v1/orders` 주문 생성
- `GET /api/v1/orders/{orderId}` 단일 주문 조회
- `GET /api/v1/orders` 주문 목록 조회 (`status`, `symbol`, `limit`, `cursor` 지원)
- `POST /api/v1/orders/{orderId}/cancel` 주문 취소
- `GET /api/v1/portfolio` 포트폴리오 요약 조회
- `GET /api/v1/portfolio/positions` 포지션 목록 조회

## 로컬 실행 / 테스트

### Backend
사전 요구사항: Java 21, PostgreSQL

```bash
cd backend
export QERP_DB_URL=jdbc:postgresql://localhost:5432/qerp
export QERP_DB_USERNAME=qerp
export QERP_DB_PASSWORD=qerp
./gradlew bootRun
```

```bash
cd backend
./gradlew test
```

### Frontend
사전 요구사항: Node.js 20+

```bash
cd frontend
npm install
npm run dev
```

```bash
cd frontend
npm test
```

기본 백엔드 주소는 `http://localhost:8080`이며, 필요하면 `NEXT_PUBLIC_API_BASE_URL`로 변경할 수 있습니다.

## 아직 미구현
- 인증/인가(로그인, 사용자 권한 모델)
- quant-worker의 실제 지표 계산/신호 생성/설명 생성 로직
- 배포 완성도 보강(운영 자동화, 모니터링/알림, 하드닝 등)
