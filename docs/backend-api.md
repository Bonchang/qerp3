# QERP v2 Backend API Contract (MVP Vertical Slice)

## 0) 문서 목적과 범위
이 문서는 QERP v2의 첫 번째 세로 슬라이스(MVP) 구현을 위한 백엔드 API 계약을 정의합니다.

- 대상 범위: 주문 생성/조회/취소, 포트폴리오 조회
- 비범위: 인증 상세 구현, 실제 브로커 연동, 고급 리스크 엔진
- 전제: 페이퍼 트레이딩 시뮬레이터이며, **결정적(deterministic) 규칙**을 우선

---

## 1) MVP API Scope

### 포함 엔드포인트
1. `POST /api/v1/orders`
2. `GET /api/v1/orders/{orderId}`
3. `GET /api/v1/orders`
4. `POST /api/v1/orders/{orderId}/cancel`
5. `GET /api/v1/portfolio`
6. `GET /api/v1/portfolio/positions`

### 공통 가정
- 인증: MVP에서는 미구현. 추후 `X-User-Id` 또는 JWT로 대체 예정.
- 통화: `USD` 고정.
- 수량/가격 단위:
  - `quantity`: 소수점 4자리까지 허용
  - `price`: 소수점 2자리까지 허용
- 시간: ISO-8601 UTC 문자열 (`2026-04-10T12:34:56Z`).

---

## 2) 공통 에러 응답 형식
모든 실패 응답은 아래 JSON 구조를 사용합니다.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "quantity must be greater than 0",
    "details": [
      {
        "field": "quantity",
        "reason": "must be > 0"
      }
    ],
    "traceId": "3e6d8f5c8d2a4b8f"
  },
  "timestamp": "2026-04-10T12:34:56Z",
  "path": "/api/v1/orders"
}
```

### 에러 코드(초기값)
- `VALIDATION_ERROR` (400)
- `NOT_FOUND` (404)
- `ORDER_NOT_CANCELLABLE` (409)
- `INSUFFICIENT_CASH` (409)
- `INTERNAL_ERROR` (500)

---

## 3) 주문 도메인 규칙 (MVP)

### 3.1 지원 값
- `side`: `BUY`, `SELL`
- `orderType`: `MARKET`, `LIMIT`
- `timeInForce`: MVP에서는 `GTC`만 지원(필드는 optional, 미입력 시 `GTC`)

### 3.2 필수 필드 규칙
- 공통 필수: `symbol`, `side`, `orderType`, `quantity`
- `MARKET` 주문:
  - `limitPrice` 금지(입력 시 검증 실패)
- `LIMIT` 주문:
  - `limitPrice` 필수

### 3.3 검증 실패 규칙
- `symbol`: 영문 대문자/숫자/`.` 허용, 1~15자
- `quantity`: `> 0`, 소수점 최대 4자리
- `limitPrice`(LIMIT 전용): `> 0`, 소수점 최대 2자리
- 지원하지 않는 `side`/`orderType` 값은 400

### 3.4 취소 규칙
- `PENDING`, `PARTIALLY_FILLED` 상태만 취소 가능
- `FILLED`, `CANCELLED`, `REJECTED`는 취소 불가(409)
- 부분체결 후 취소 시 미체결 잔량만 취소되고 상태는 `CANCELLED`

---

## 4) 주문 상태 모델과 전이

### 4.1 상태 정의
- `PENDING`: 접수됨, 아직 전체 체결 전
- `PARTIALLY_FILLED`: 일부 체결됨
- `FILLED`: 전량 체결 완료
- `CANCELLED`: 사용자 취소로 종료
- `REJECTED`: 검증/체결 불가로 거절

### 4.2 허용 전이
- `PENDING -> PARTIALLY_FILLED`
- `PENDING -> FILLED`
- `PENDING -> CANCELLED`
- `PENDING -> REJECTED`
- `PARTIALLY_FILLED -> FILLED`
- `PARTIALLY_FILLED -> CANCELLED`

### 4.3 비허용 전이
- 종료 상태(`FILLED`, `CANCELLED`, `REJECTED`)에서 다른 상태로 전이 금지
- `REJECTED -> *` 전이 금지

### 4.4 전이 정책 이유
- 구현 단순화: 이벤트 재처리/롤백 복잡도 최소화
- 사용성: 사용자는 접수/부분체결/완료/취소/거절을 명확히 구분 가능

---

## 5) 체결 시뮬레이션 규칙 (Deterministic)

### 5.1 공통 가정
- 단일 기준가 `referencePrice`를 체결 시점에 사용
- 수수료/세금/슬리피지 = 0 (MVP 단순화)
- 체결 엔진은 주문 접수 직후 1회 평가

### 5.2 MARKET 주문
- 정책: 항상 즉시 전량 체결
- 체결가: `referencePrice`
- 예외: 매수 시 필요 현금 부족이면 `REJECTED(INSUFFICIENT_CASH)`

### 5.3 LIMIT 주문
- `BUY`: `referencePrice <= limitPrice`면 즉시 전량 체결, 아니면 `PENDING`
- `SELL`: `referencePrice >= limitPrice`면 즉시 전량 체결, 아니면 `PENDING`
- `PENDING` LIMIT 주문은 시장 데이터 업데이트 이벤트에서 동일 규칙으로 재평가
- 재평가 시 체결되면 `FILLED`

### 5.4 부분체결 정책
- 기본 정책: MVP에서는 부분체결을 만들지 않음(전량 체결 우선)
- 단, 향후 확장 가능성을 위해 상태 `PARTIALLY_FILLED`는 계약에 유지

---

## 6) Endpoint 상세 계약

## 6.1 POST /api/v1/orders
### Purpose
새 페이퍼 주문을 생성하고, 생성 직후 체결 시뮬레이션을 1회 수행합니다.

### Request JSON
```json
{
  "symbol": "AAPL",
  "side": "BUY",
  "orderType": "LIMIT",
  "quantity": 10,
  "limitPrice": 180.5,
  "timeInForce": "GTC"
}
```

### Response JSON (201)
```json
{
  "orderId": "ord_01JABCXYZ123",
  "symbol": "AAPL",
  "side": "BUY",
  "orderType": "LIMIT",
  "quantity": 10,
  "filledQuantity": 0,
  "remainingQuantity": 10,
  "limitPrice": 180.5,
  "avgFillPrice": null,
  "status": "PENDING",
  "createdAt": "2026-04-10T12:34:56Z",
  "updatedAt": "2026-04-10T12:34:56Z"
}
```

### Validation Rules
- 섹션 3 규칙 전체 적용
- 매수 주문은 생성 시점 기준 필요 현금 검증

### Error Cases
- 400 `VALIDATION_ERROR`
- 409 `INSUFFICIENT_CASH`

---

## 6.2 GET /api/v1/orders/{orderId}
### Purpose
단일 주문의 최신 상태를 조회합니다.

### Path Params
- `orderId` (string, required)

### Response JSON (200)
```json
{
  "orderId": "ord_01JABCXYZ123",
  "symbol": "AAPL",
  "side": "BUY",
  "orderType": "LIMIT",
  "quantity": 10,
  "filledQuantity": 10,
  "remainingQuantity": 0,
  "limitPrice": 180.5,
  "avgFillPrice": 180.2,
  "status": "FILLED",
  "createdAt": "2026-04-10T12:34:56Z",
  "updatedAt": "2026-04-10T12:35:05Z"
}
```

### Error Cases
- 404 `NOT_FOUND`

---

## 6.3 GET /api/v1/orders
### Purpose
주문 목록을 최신순으로 조회합니다.

### Query Params
- `status` (optional): `PENDING|PARTIALLY_FILLED|FILLED|CANCELLED|REJECTED`
- `symbol` (optional)
- `limit` (optional, default 20, max 100)
- `cursor` (optional, 문자열 기반 페이지네이션 토큰)

### Response JSON (200)
```json
{
  "items": [
    {
      "orderId": "ord_01JABCXYZ123",
      "symbol": "AAPL",
      "side": "BUY",
      "orderType": "LIMIT",
      "quantity": 10,
      "filledQuantity": 10,
      "remainingQuantity": 0,
      "status": "FILLED",
      "createdAt": "2026-04-10T12:34:56Z",
      "updatedAt": "2026-04-10T12:35:05Z"
    }
  ],
  "nextCursor": null
}
```

### Validation Rules
- `limit` 범위 벗어나면 400
- `status` enum 불일치면 400

---

## 6.4 POST /api/v1/orders/{orderId}/cancel
### Purpose
취소 가능한 주문을 취소합니다.

### Request JSON
빈 바디 허용.

### Response JSON (200)
```json
{
  "orderId": "ord_01JABCXYZ123",
  "status": "CANCELLED",
  "cancelledAt": "2026-04-10T12:36:00Z"
}
```

### Validation Rules
- 섹션 3.4 취소 가능 상태만 허용

### Error Cases
- 404 `NOT_FOUND`
- 409 `ORDER_NOT_CANCELLABLE`

---

## 6.5 GET /api/v1/portfolio
### Purpose
포트폴리오 요약 지표를 조회합니다.

### Response JSON (200)
```json
{
  "baseCurrency": "USD",
  "cashBalance": 8200.0,
  "positionsMarketValue": 1850.0,
  "totalPortfolioValue": 10050.0,
  "unrealizedPnl": 120.0,
  "realizedPnl": -20.0,
  "returnRate": 0.0102,
  "asOf": "2026-04-10T12:40:00Z"
}
```

### Semantics / Formula
- `positionsMarketValue = Σ(position.quantity * currentPrice)`
- `totalPortfolioValue = cashBalance + positionsMarketValue`
- `unrealizedPnl = Σ((currentPrice - avgPrice) * quantity)`
- `realizedPnl = 누적 확정 손익(매도 체결 시 반영)`
- `returnRate = (totalPortfolioValue - initialEquity) / initialEquity`
  - `initialEquity`는 사용자 시작 자본(고정)

---

## 6.6 GET /api/v1/portfolio/positions
### Purpose
심볼별 보유 포지션 상세를 조회합니다.

### Response JSON (200)
```json
{
  "items": [
    {
      "symbol": "AAPL",
      "quantity": 10,
      "avgPrice": 173.0,
      "currentPrice": 185.0,
      "marketValue": 1850.0,
      "unrealizedPnl": 120.0,
      "unrealizedPnlRate": 0.0694
    }
  ],
  "asOf": "2026-04-10T12:40:00Z"
}
```

### Semantics / Formula
- `avgPrice = 총 매수 체결금액 / 총 보유수량` (가중평균)
- `marketValue = quantity * currentPrice`
- `unrealizedPnl = (currentPrice - avgPrice) * quantity`
- `unrealizedPnlRate = (currentPrice - avgPrice) / avgPrice`

---

## 7) HTTP 상태코드 요약
- 200: 조회/취소 성공
- 201: 주문 생성 성공
- 400: 요청 검증 실패
- 404: 리소스 없음
- 409: 비즈니스 충돌(취소 불가, 잔고 부족)
- 500: 서버 내부 오류

---

## 8) 구현 메모 (Spring Boot 정렬용)
- Controller 레이어: Endpoint/DTO 검증 책임
- Service 레이어: 상태 전이/체결 시뮬레이션/포트폴리오 계산 책임
- Repository 레이어: 영속성 접근
- Flyway는 후속 단계에서 스키마 버전 관리용으로 적용

이 문서는 계약 우선(Contract-first) 구현을 위한 기준선입니다.
