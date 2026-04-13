# QERP v2 Initial Architecture Decisions

## ADR-001 Frontend Framework
- **Decision**: React + Next.js(앱 라우터) 사용
- **Why**:
  - 빠른 화면 구성과 생태계 성숙도
  - 추후 SSR/ISR 등 확장 경로 확보
  - 배포 타겟(Vercel/유사 플랫폼)과 궁합이 좋음

## ADR-002 Backend Framework
- **Decision**: Java + Spring Boot 사용
- **Why**:
  - 금융/포트폴리오 중심 백엔드 도메인에 강한 적합성
  - 트랜잭션 처리와 데이터 정합성 보장에 유리
  - 주문/체결/포지션 같은 도메인 모델을 명시적으로 설계하기 좋음

## ADR-003 Database
- **Decision**: PostgreSQL 단일 인스턴스 시작
- **Why**:
  - 관계형 데이터(주문, 체결, 포지션)에 적합
  - Spring Boot + Flyway 조합으로 스키마 변경 이력 관리가 명확
  - 관리형 서비스 선택지가 풍부
  - MVP 단계에서 단일 저장소가 단순성과 운영성을 높임

## ADR-004 Worker Strategy
- **Decision**: 독립 **Python** `quant-worker` 프로세스 + 단순 큐/스케줄 방식
- **Why**:
  - API 응답 경로와 연산 경로를 분리해 안정성 확보
  - 초기에는 복잡한 이벤트 인프라 없이도 운영 가능
  - 워커 스케일 조정이 상대적으로 간단

## ADR-005 Deployment Approach
- **Decision**: 단일 클라우드 우선, 관리형 서비스 중심
- **Why**:
  - 인프라 관리 부담 최소화
  - MVP 속도와 배포 재현성 확보
  - 추후 IaC 고도화 여지를 남김

## ADR-006 Simplicity Principle
- **Decision**: "먼저 작게 배포 가능하게"를 기본 원칙으로 채택
- **Why**:
  - 과도한 초기 설계를 방지
  - 기능/운영 피드백을 빠르게 반영
  - 변경 비용이 낮은 구조를 유지
