# backend

QERP v2 백엔드 Spring Boot + JDBC/PostgreSQL 기반 페이퍼 트레이딩 API 구현이다.

현재 범위:
- Spring Boot 애플리케이션 기동
- `/health` 경량 헬스 체크 엔드포인트
- Spring 컨텍스트 로딩 smoke test
- 결정적(deterministic) 페이퍼 트레이딩 도메인 기초
  - 주문 타입/상태
  - 시장가/지정가 체결 시뮬레이션
  - 포트폴리오 현금/평단/실현손익/평가손익 계산
- REST API
- PostgreSQL 런타임 저장소
- Flyway 마이그레이션
- 테스트에서는 H2 PostgreSQL 호환 모드 사용

## Prerequisites
- Java 21
- PostgreSQL 15+ 권장

Gradle Wrapper가 포함되어 있어서 전역 Gradle 설치는 필요 없다.

## Run
```bash
export QERP_DB_URL=jdbc:postgresql://localhost:5432/qerp
export QERP_DB_USERNAME=qerp
export QERP_DB_PASSWORD=***
./gradlew bootRun
```

애플리케이션 시작 시 Flyway가 기본 스키마 `qerp3` 에 `orders` / `portfolio_state` / `portfolio_positions` 테이블을 자동 생성한다. 다른 스키마를 쓰려면 `QERP_DB_SCHEMA` 로 덮어쓸 수 있다.

Neon/Render 같이 `public` 스키마에 `CREATE` 권한이 없는 환경을 위해 백엔드는 연결 직후 `search_path` 를 `${QERP_DB_SCHEMA:-qerp3}, public` 으로 설정한다. 따라서 `public` 권한은 더 이상 필요하지 않지만, 앱 롤에는 아래 둘 중 하나가 필요하다.

- DB 레벨 `CREATE` 권한이 있어서 Flyway가 `qerp3` 스키마를 처음 생성할 수 있어야 함
- 또는 소유자/관리자 롤이 미리 `qerp3` 스키마를 만들고 `USAGE, CREATE` 를 앱 롤에 부여해야 함

추가 메모:
- 기본 포트는 `8080`이며, `PORT` 환경 변수가 있으면 그 값을 우선 사용한다.
- 헬스 체크 경로는 `GET /health` 이다.

## Test
```bash
./gradlew test
```

현재 테스트 범위:
- Spring 컨텍스트 로딩
- 주문 시뮬레이션 도메인 규칙
- 포트폴리오 계산 규칙
- REST API 계약 검증
- JDBC/Flyway 기반 persistence 통합 경로 검증

## Build
```bash
./gradlew bootJar
```

## Render 배포 최소 설정

- Root Directory: `backend`
- Build Command: `./gradlew bootJar`
- Start Command: `java -jar build/libs/*.jar`
- Health Check Path: `/health`
- Required env vars:
  - `QERP_DB_URL`
  - `QERP_DB_USERNAME`
  - `QERP_DB_PASSWORD`

선택적 env var:
- `QERP_DB_SCHEMA` (기본값 `qerp3`)

quant signal 엔드포인트를 함께 쓸 경우 런타임에서 `python3` 와 저장소 루트의 sibling `quant-worker/` 경로가 필요하다.
