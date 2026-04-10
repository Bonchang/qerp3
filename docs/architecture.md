# QERP v2 Architecture

## 1) System Context
QERP v2는 3개 실행 컴포넌트(Frontend, Backend, Quant Worker)와 외부 시장 데이터 소스를 중심으로 동작합니다.

- 사용자: 웹 UI를 통해 시세 조회, 주문, 포트폴리오 확인, 모드 전환 수행
- 외부 시장 데이터 소스: 가격/호가/캔들 데이터 제공
- QERP Backend: API 및 거래/포트폴리오 상태의 단일 진실 원천(Source of Truth)
- QERP Quant Worker: 정기/이벤트 기반 계산으로 인사이트 생성

## 2) 컴포넌트 책임

### Frontend
- 시장 데이터, 주문 상태, 포트폴리오 요약 표시
- 일반 모드/퀀트 모드 UI 전환
- Backend API 호출 및 결과 렌더링
- 도메인 규칙은 보유하지 않고 표현/입력에 집중

### Backend
- 주문 생성/검증/체결 기록
- 포트폴리오 및 손익 계산 결과 제공
- 시장 데이터 캐시 또는 조회 추상화
- Quant Worker와의 작업 인터페이스(큐 또는 스케줄 트리거)

### Quant Worker
- 지표 계산(예: 이동평균, 모멘텀 등 단순 지표부터)
- 전략 신호를 초보자 친화 설명으로 변환
- 결과를 Backend가 조회 가능한 저장소에 반영

## 3) 데이터 흐름
1. **Market Data Ingestion**
   - Backend가 외부 시세 소스에서 데이터 수집/조회
2. **Order Request**
   - 사용자가 Frontend에서 매수/매도 요청
   - Backend가 요청 검증 후 페이퍼 주문 생성
3. **Execution Simulation**
   - Backend가 체결 규칙(단순 가격 기준)을 적용해 체결 처리
4. **Portfolio Update**
   - 체결 이벤트 기반으로 포지션/평단/손익 갱신
5. **Quant Insight**
   - Quant Worker가 최신 시세/포트폴리오를 참고해 인사이트 계산
   - Backend API를 통해 Frontend에 전달

## 4) Scope Boundaries (과도한 설계 방지)
- MVP에서 마이크로서비스 분할을 강제하지 않음
- 이벤트 버스/스트리밍 플랫폼은 필요 증거 전까지 도입하지 않음
- 고급 리스크 엔진/백테스트 플랫폼은 MVP 제외
- 실거래 브로커 API 연동은 MVP 제외
- 멀티 테넌시, 권한 체계, SSO는 MVP 제외

핵심 원칙: **단일 배포 가능한 단순 구조 + 명확한 책임 분리**.
