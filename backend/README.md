# backend

QERP v2 백엔드 Spring Boot + JDBC/PostgreSQL 기반 페이퍼 트레이딩 API 구현이다.

현재 범위:
- Spring Boot 애플리케이션 기동
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
export QERP_DB_PASSWORD=qerp
./gradlew bootRun
```

애플리케이션 시작 시 Flyway가 orders / portfolio_state / portfolio_positions 테이블을 자동 생성한다.

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
