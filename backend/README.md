# backend

QERP v2 백엔드 Spring Boot 부트스트랩 + 도메인 기초 구현이다.

현재 범위:
- Spring Boot 애플리케이션 기동
- Spring 컨텍스트 로딩 smoke test
- 결정적(deterministic) 페이퍼 트레이딩 도메인 기초
  - 주문 타입/상태
  - 시장가/지정가 체결 시뮬레이션
  - 포트폴리오 현금/평단/실현손익/평가손익 계산
- REST API, DB, 외부 시세 연동은 아직 미구현

## Prerequisites
- Java 21

Gradle Wrapper가 포함되어 있어서 전역 Gradle 설치는 필요 없다.

## Run
```bash
./gradlew bootRun
```

성공하면 기본 Spring Boot 애플리케이션이 로컬에서 기동한다.

## Test
```bash
./gradlew test
```

현재 테스트 범위:
- Spring 컨텍스트 로딩
- 주문 시뮬레이션 도메인 규칙
- 포트폴리오 계산 규칙

## Build
```bash
./gradlew bootJar
```
