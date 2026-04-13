# QERP v2 MVP Scope

## 1) MVP 기능 목록
- 실시간 시세(최소 1개 시장/자산군) 조회
- 기본 차트 표시(캔들 또는 라인 중 단일 타입)
- 매수/매도 페이퍼 주문 생성
- 단순 체결 시뮬레이션 및 주문 상태 표시
- 포트폴리오 잔고/평단/손익 요약
- 일반 모드/퀀트 모드 토글
- 퀀트 보조 인사이트(신호 + 짧은 설명)

## 2) Out of Scope
- 인증/인가(초기 MVP 단계 제외)
- 실브로커 연동 및 실제 주문 전송
- 복수 거래소 통합 라우팅
- 고급 차트 도구/지표 마켓플레이스
- 고빈도 거래 시뮬레이션
- 모바일 네이티브 앱

## 3) 권장 구현 단계
1. **Phase A: Skeleton + Vertical Slice**
   - Frontend/Backend 연결
   - 단일 자산 시세 표시
   - 주문 → 체결 → 포트폴리오 반영
2. **Phase B: Quant Assist Baseline**
   - Quant Worker 주기 실행
   - 단순 신호와 설명 텍스트 노출
3. **Phase C: Operability**
   - 기본 로깅/헬스체크
   - 스테이징 배포 및 회귀 점검 루틴

## 4) 배포 타겟
- 우선순위: **단일 클라우드의 관리형 서비스 조합**
  - Frontend: 정적 호스팅 + CDN
  - Backend: Java + Spring Boot 컨테이너 기반 앱 서비스
  - Quant Worker: Python 스케줄/큐 기반 워커 런타임
  - Database: 관리형 PostgreSQL
- 초기 목표는 저비용/간단한 운영이며, 트래픽 증가 시 점진 확장
