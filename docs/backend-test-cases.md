# QERP v2 Backend MVP Test Cases

## 0) 목적
이 문서는 `docs/backend-api.md`를 구현 가능한 수준으로 검증하기 위한 QA/명세 테스트 케이스를 정의합니다.

- 대상: 주문 생성/상태 전이/체결 시뮬레이션/포트폴리오 계산/에러 응답 일관성
- 비대상: 인증 상세, 실브로커 연동, 고급 체결 엔진
- 원칙: 단순성, 결정성(deterministic), 재현 가능성

---

## 1) 주문 생성 검증 테스트 케이스

> 공통 전제
> - 통화: USD
> - 사용자 ID: `user_001` (MVP 가정)
> - `initialEquity = 100000.00`
> - 기본 기준가(`referencePrice`): `AAPL=180.00`, `MSFT=320.00`

| Test ID | 시나리오 | 입력 (POST /api/v1/orders) | Expected HTTP | Expected Result / Error Code | Notes |
|---|---|---|---:|---|---|
| OC-001 | 유효한 MARKET 매수 | `{ "symbol":"AAPL", "side":"BUY", "orderType":"MARKET", "quantity":10 }` | 201 | 성공, `status=FILLED` | `limitPrice` 미포함 필수 |
| OC-002 | 유효한 MARKET 매도 | `{ "symbol":"AAPL", "side":"SELL", "orderType":"MARKET", "quantity":2 }` | 201 | 성공, `status=FILLED` | 보유수량 충분 전제 |
| OC-003 | 유효한 LIMIT 매수 | `{ "symbol":"AAPL", "side":"BUY", "orderType":"LIMIT", "quantity":10, "limitPrice":181.00 }` | 201 | 성공, 즉시체결 또는 PENDING | 기준가 180.00이므로 즉시체결 |
| OC-004 | 유효한 LIMIT 매도 | `{ "symbol":"AAPL", "side":"SELL", "orderType":"LIMIT", "quantity":5, "limitPrice":179.00 }` | 201 | 성공, 즉시체결 또는 PENDING | 기준가 180.00이므로 즉시체결 |
| OC-005 | 필수 필드 누락 | `{ "side":"BUY", "orderType":"MARKET", "quantity":1 }` | 400 | `VALIDATION_ERROR` | `symbol` 누락 |
| OC-006 | 수량 오류(0 이하) | `{ "symbol":"AAPL", "side":"BUY", "orderType":"MARKET", "quantity":0 }` | 400 | `VALIDATION_ERROR` | `quantity > 0` 위반 |
| OC-007 | LIMIT에 limitPrice 누락 | `{ "symbol":"AAPL", "side":"BUY", "orderType":"LIMIT", "quantity":1 }` | 400 | `VALIDATION_ERROR` | LIMIT 필수값 누락 |
| OC-008 | MARKET에 limitPrice 포함 | `{ "symbol":"AAPL", "side":"BUY", "orderType":"MARKET", "quantity":1, "limitPrice":180 }` | 400 | `VALIDATION_ERROR` | MARKET 금지 필드 |
| OC-009 | 미지원 orderType | `{ "symbol":"AAPL", "side":"BUY", "orderType":"STOP", "quantity":1 }` | 400 | `VALIDATION_ERROR` | MVP 지원값: MARKET/LIMIT |
| OC-010 | 미지원 side | `{ "symbol":"AAPL", "side":"HOLD", "orderType":"MARKET", "quantity":1 }` | 400 | `VALIDATION_ERROR` | MVP 지원값: BUY/SELL |
| OC-011 | 잘못된 심볼 형식 | `{ "symbol":"AAPL#", "side":"BUY", "orderType":"MARKET", "quantity":1 }` | 400 | `VALIDATION_ERROR` | `[A-Z0-9.]`, 1~15자 |
| OC-012 | 매수 현금 부족 | `{ "symbol":"MSFT", "side":"BUY", "orderType":"MARKET", "quantity":1000 }` | 409 | `INSUFFICIENT_CASH` | 필요금액 320,000 > 현금 100,000 |
| OC-013 | 매도 보유수량 부족 | `{ "symbol":"AAPL", "side":"SELL", "orderType":"MARKET", "quantity":50 }` | 409 | `INSUFFICIENT_POSITION_QUANTITY` | 신규 에러코드 명시 |

---

## 2) 주문 생명주기/상태 전이 테스트 케이스

| Test ID | Current State | Trigger Event | Expected Next State | Allowed | Expected Result / Error |
|---|---|---|---|---|---|
| ST-001 | PENDING | 체결 조건 만족(평가 실행) | FILLED | Yes | 200/도메인 성공 |
| ST-002 | PENDING | 사용자 취소 요청 | CANCELLED | Yes | 200/도메인 성공 |
| ST-003 | PENDING | 사후 검증 실패(예: 데이터 불일치) | REJECTED | Yes | 200/도메인 성공 |
| ST-004 | FILLED | 취소 요청 | FILLED(유지) | No | 409 `ORDER_NOT_CANCELLABLE` |
| ST-005 | CANCELLED | 취소 재요청 | CANCELLED(유지) | No | 409 `ORDER_NOT_CANCELLABLE` |
| ST-006 | REJECTED | 취소 요청/재처리 이벤트 | REJECTED(유지) | No | 409 `ORDER_NOT_CANCELLABLE` |
| ST-007 | PARTIALLY_FILLED | 취소 요청 | CANCELLED | Yes* | 확장 모드에서만 허용 |
| ST-008 | PARTIALLY_FILLED | 잔량 체결 조건 만족 | FILLED | Yes* | 확장 모드에서만 허용 |

**PARTIALLY_FILLED 처리 결론(MVP):**
- API enum 호환성을 위해 조회 응답 enum에는 유지합니다.
- **MVP 기본 실행 정책에서는 생성하지 않습니다.**
- 즉, MVP 테스트 기준으로는 `PARTIALLY_FILLED` 실발생 케이스를 필수 통과 기준에서 제외하고, ST-007/ST-008은 확장 회귀 테스트로 분리합니다.

---

## 3) 체결 시뮬레이션 테스트 케이스 (결정적 예시)

### EX-001 MARKET 주문 즉시 체결
- 입력: `BUY AAPL MARKET 10`
- 기준가: `referencePrice(AAPL)=180.00`
- 기대:
  - 체결가 `180.00`
  - 체결수량 `10`
  - 상태 `FILLED`
  - 현금변화 `-1800.00`

### EX-002 LIMIT 주문 조건 만족 시 체결
- 입력: `BUY AAPL LIMIT 10 @ 181.00`
- 기준가: `180.00`
- 조건: `referencePrice <= limitPrice` (180.00 <= 181.00)
- 기대: 즉시 `FILLED`, 체결가 `180.00`

### EX-003 LIMIT 주문 조건 미충족 시 대기
- 입력: `BUY AAPL LIMIT 10 @ 179.00`
- 기준가: `180.00`
- 조건 미충족: `180.00 <= 179.00` false
- 기대: `PENDING`, `filledQuantity=0`

### EX-004 체결 전 취소
- 입력: EX-003으로 생성된 `PENDING` 주문
- 이벤트: `POST /api/v1/orders/{orderId}/cancel`
- 기대: `CANCELLED`, 미체결 수량 전체 취소

### EX-005 검증 실패로 거절
- 입력: `BUY MSFT MARKET 1000`, 기준가 `320.00`, 현금 `100000.00`
- 필요금액: `320000.00`
- 기대: 409 `INSUFFICIENT_CASH`, 주문 미생성(또는 REJECTED로 저장 시 정책 일관 필요)

**MVP 정책 고정:** 검증 실패는 HTTP 에러로 즉시 반환하며 영속 주문을 생성하지 않습니다.

---

## 4) 포트폴리오 계산 테스트 케이스

> 공통 공식
> - `positionMarketValue = positionQty * referencePrice`
> - `positionCost = positionQty * avgPrice`
> - `unrealizedPnl = Σ(positionMarketValue - positionCost)`
> - `realizedPnl = 누적 매도 실현손익`
> - `totalPortfolioValue = cashBalance + Σ(positionMarketValue)`
> - `returnRate = (totalPortfolioValue - initialEquity) / initialEquity`

### PF-001 첫 매수로 포지션 생성
- 초기: `cash=100000.00`, 포지션 없음
- 거래: `BUY AAPL 10 @ 180.00`
- 결과:
  - `cash=98200.00`
  - `AAPL qty=10, avgPrice=180.00`

### PF-002 추가 매수 시 평단 갱신
- 이전 상태: `AAPL qty=10, avg=180.00`
- 거래: `BUY AAPL 20 @ 210.00`
- 계산: `(10*180 + 20*210) / 30 = 200.00`
- 결과: `AAPL qty=30, avgPrice=200.00`

### PF-003 전량 매도로 포지션 종료
- 이전 상태: `AAPL qty=30, avg=200.00`
- 거래: `SELL AAPL 30 @ 205.00`
- 실현손익: `(205-200)*30 = +150.00`
- 결과: `AAPL 포지션 제거`, `realizedPnl += 150.00`

### PF-004 부분 매도로 포지션 유지
- 이전 상태: `AAPL qty=30, avg=200.00`
- 거래: `SELL AAPL 10 @ 205.00`
- 결과:
  - 잔량 `qty=20`
  - `avgPrice=200.00` 유지
  - 실현손익 `+50.00` 누적

### PF-005 평가손익(unrealized) 계산
- 상태: `AAPL qty=20, avg=200.00`, 기준가 `210.00`
- 계산: `(210-200)*20 = +200.00`
- 기대: `unrealizedPnl=200.00`

### PF-006 실현손익(realized) 누적
- 거래1: `SELL 10 @205` => `+50.00`
- 거래2: `SELL 5 @190` => `-50.00`
- 기대: 누적 `realizedPnl=0.00`

### PF-007 수익률(returnRate) 계산
- 예시 상태: `cash=96000.00`, `AAPL qty=20`, 기준가 `210.00`
- `totalPortfolioValue = 96000 + (20*210) = 100200.00`
- `returnRate = (100200 - 100000)/100000 = 0.002 (=0.2%)`

### PF-008 매수/매도에 따른 현금 잔고 변화
- 초기 현금 `100000.00`
- `BUY 10 @180` 후: `98200.00`
- `SELL 4 @200` 후: `99000.00`
- 기대: 체결 단위로 현금이 즉시 증감

---

## 5) 에러 응답 일관성 테스트 케이스

모든 오류 응답은 아래 필드를 포함해야 합니다.
- `error.code`
- `error.message`
- `timestamp`
- `path`

| Test ID | Scenario | Endpoint | Expected HTTP | Required JSON Keys |
|---|---|---|---:|---|
| ER-001 | 필수값 누락 | POST /api/v1/orders | 400 | `error.code`, `error.message`, `timestamp`, `path` |
| ER-002 | 주문 없음 | GET /api/v1/orders/{orderId} | 404 | 동일 |
| ER-003 | 취소 불가 상태 | POST /api/v1/orders/{orderId}/cancel | 409 | 동일 |
| ER-004 | 현금 부족 | POST /api/v1/orders | 409 | 동일 |
| ER-005 | 보유수량 부족 | POST /api/v1/orders | 409 | 동일 |

예시:

```json
{
  "error": {
    "code": "INSUFFICIENT_CASH",
    "message": "not enough cash to place order"
  },
  "timestamp": "2026-04-10T12:34:56Z",
  "path": "/api/v1/orders"
}
```

---

## 6) Open Decision Alignment (MVP 단순 선택 확정)

### 6.1 referencePrice 소스 확정
- **결정:** Backend의 시장 데이터 캐시에 저장된 **마지막 체결가(last trade price)** 를 `referencePrice`로 사용.
- **fallback:** 해당 심볼 가격이 캐시에 없으면 주문 생성 시 409 `MARKET_DATA_UNAVAILABLE` 반환.
- **이유:** 구현 단순성 + 재현성 + 외부 API 호출 의존 최소화.

### 6.2 PARTIALLY_FILLED 유지 여부
- **결정:** 상태 enum은 유지하되, MVP 실행 로직에서는 발생시키지 않음.
- **이유:** 향후 확장 호환성은 유지하면서 현재 구현 복잡도를 억제.

### 6.3 initialEquity 정책 확정
- **결정:** MVP에서는 사용자별 `initialEquity`를 고정값 `100000.00 USD`로 시작.
- **적용 시점:** 사용자의 첫 포트폴리오 접근(지연 초기화) 시 1회 생성.
- **이유:** 온보딩/설정 API 없이도 즉시 테스트 가능.

---

## 7) 구현 준비 체크리스트

- [ ] API 유효성 검증이 테스트 케이스 ID(OC-001~013)와 1:1 매핑되는가
- [ ] 상태 전이 제한(ST-001~008)이 서비스 계층에서 강제되는가
- [ ] 체결 계산(EX-001~005)이 결정적으로 재현되는가
- [ ] 포트폴리오 공식(PF-001~008)이 API 응답과 일치하는가
- [ ] 에러 JSON 구조(ER-001~005)가 전 엔드포인트에서 일관적인가

위 체크리스트가 충족되면 Spring Boot 구현 착수 전 사양 검토(implementation review) 진행이 가능합니다.
