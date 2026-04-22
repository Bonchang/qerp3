# QERP 백엔드 API 계약

## 0. 문서 목적과 범위

이 문서는 현재 QERP가 공개적으로 제공하는 백엔드 API 계약을 정리합니다.

- 포함 범위: 주문 생성/조회/취소, 포트폴리오 조회, 종목 검색, 시세/캔들 조회
- 제외 범위: 인증 상세 구현, 실제 브로커 연동, 고급 리스크 엔진, 자동 체결 재평가 워커
- 전제: 모든 주문은 **페이퍼 트레이딩 시뮬레이션**이며, 시장 데이터는 **결정적 규칙**으로 제공됩니다.

---

## 1. 현재 API 범위

### 포함 엔드포인트
1. `POST /api/v1/orders`
2. `GET /api/v1/orders/{orderId}`
3. `GET /api/v1/orders`
4. `POST /api/v1/orders/{orderId}/cancel`
5. `GET /api/v1/portfolio`
6. `GET /api/v1/portfolio/positions`
7. `GET /api/v1/instruments/search`
8. `GET /api/v1/market/quotes/{symbol}`
9. `GET /api/v1/market/candles/{symbol}`

### 공통 가정
- 인증: 현재 미구현입니다.
- 통화: `USD` 고정
- 수량/가격 단위
  - `quantity`: 소수점 최대 4자리
  - `price`: 소수점 최대 2자리
- 시간 표현: ISO-8601 UTC 문자열 예시 `2026-04-10T12:34:56Z`

---

## 2. 공통 오류 응답 형식

실패 응답은 아래 구조를 따릅니다.

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

### 주요 오류 코드
- `VALIDATION_ERROR` (`400`)
- `NOT_FOUND` (`404`)
- `ORDER_NOT_CANCELLABLE` (`409`)
- `INSUFFICIENT_CASH` (`409`)
- `INSUFFICIENT_POSITION_QUANTITY` (`409`)
- `MARKET_DATA_UNAVAILABLE` (`409`)
- `INTERNAL_ERROR` (`500`)

---

## 3. 주문 도메인 규칙

### 3.1 지원 값
- `side`: `BUY`, `SELL`
- `orderType`: `MARKET`, `LIMIT`
- `timeInForce`: 현재 `GTC`만 허용하며, 생략도 가능합니다.

### 3.2 필수 필드 규칙
- 공통 필수: `symbol`, `side`, `orderType`, `quantity`
- `MARKET` 주문
  - `limitPrice`를 보내면 검증 오류입니다.
- `LIMIT` 주문
  - `limitPrice`가 반드시 있어야 합니다.

### 3.3 검증 규칙
- `symbol`: 영문 대문자/숫자/`.` 허용, 1~15자
- `quantity`: `> 0`, 소수점 최대 4자리
- `limitPrice`: `> 0`, 소수점 최대 2자리 (`LIMIT` 주문에서만 사용)
- 지원하지 않는 `side` 또는 `orderType`은 `400`
- `SELL` 주문 수량이 보유 수량보다 크면 `409 INSUFFICIENT_POSITION_QUANTITY`
- `timeInForce`가 제공될 경우 `GTC`만 허용

### 3.4 취소 규칙
- `PENDING`, `PARTIALLY_FILLED` 상태만 취소 가능합니다.
- `FILLED`, `CANCELLED`, `REJECTED` 상태는 취소할 수 없습니다.
- 현재 기본 실행 로직은 부분 체결을 만들지 않지만, 계약상 상태 값은 유지됩니다.

---

## 4. 주문 상태 모델

### 4.1 상태 정의
- `PENDING`: 주문이 접수되었고 아직 전량 체결되지 않음
- `PARTIALLY_FILLED`: 일부만 체결됨
- `FILLED`: 전량 체결 완료
- `CANCELLED`: 사용자 취소로 종료
- `REJECTED`: 검증 또는 실행 불가로 거절

### 4.2 현재 제품에서의 상태 의미
- 시장가 주문은 정상 조건에서 즉시 `FILLED` 됩니다.
- 지정가 주문은 제출 시점 기준 가격으로 한 번 평가됩니다.
- 조건을 만족하지 못한 지정가 주문은 `PENDING` 상태로 남습니다.
- 대기 주문을 이후 가격 변화에 따라 자동 재평가하는 백그라운드 처리는 없습니다.

---

## 5. 체결 시뮬레이션 규칙

### 5.1 공통 가정
- 주문 처리 시점의 단일 기준가 `referencePrice`를 사용합니다.
- `referencePrice`는 백엔드 시장 데이터 서비스가 제공하는 기준 가격입니다.
- 기준 가격을 구할 수 없으면 주문 생성 시 `409 MARKET_DATA_UNAVAILABLE`을 반환합니다.
- 수수료, 세금, 슬리피지는 현재 반영하지 않습니다.
- 주문은 접수 직후 한 번 평가됩니다.

### 5.2 시장가 주문
- 항상 즉시 전량 체결됩니다.
- 체결가는 `referencePrice`입니다.
- 매수 시 필요 현금이 부족하면 `409 INSUFFICIENT_CASH`를 반환합니다.

### 5.3 지정가 주문
- `BUY`: `referencePrice <= limitPrice` 이면 즉시 전량 체결, 아니면 `PENDING`
- `SELL`: `referencePrice >= limitPrice` 이면 즉시 전량 체결, 아니면 `PENDING`
- `PENDING` 지정가 주문은 이후 자동 재평가되지 않으며, 취소 전까지 현재 상태로 유지됩니다.

### 5.4 부분 체결 정책
- 현재 기본 실행 로직은 부분 체결을 생성하지 않습니다.
- 다만 응답 계약에는 향후 확장을 고려해 `PARTIALLY_FILLED` 상태를 포함합니다.

---

## 6. 엔드포인트 상세 계약

### 6.1 `POST /api/v1/orders`
#### 설명
새 페이퍼 주문을 생성하고, 생성 직후 체결 시뮬레이션을 한 번 수행합니다.

#### 요청 JSON
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

#### 응답 JSON (`201`)
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

#### 검증 규칙
- 3장 규칙을 모두 적용합니다.
- 매수 주문은 생성 시점에 필요 현금을 검증합니다.

#### 오류 사례
- `400 VALIDATION_ERROR`
- `409 INSUFFICIENT_CASH`
- `409 INSUFFICIENT_POSITION_QUANTITY`
- `409 MARKET_DATA_UNAVAILABLE`

---

### 6.2 `GET /api/v1/orders/{orderId}`
#### 설명
단일 주문의 최신 상태를 조회합니다.

#### 경로 파라미터
- `orderId` (string, required)

#### 응답 JSON (`200`)
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

#### 오류 사례
- `404 NOT_FOUND`

---

### 6.3 `GET /api/v1/orders`
#### 설명
주문 목록을 최신 순서 기준으로 조회합니다.

#### 쿼리 파라미터
- `status` (optional): `PENDING|PARTIALLY_FILLED|FILLED|CANCELLED|REJECTED`
- `symbol` (optional)
- `limit` (optional, default `20`, max `100`)
- `cursor` (optional, 문자열 기반 페이지네이션 토큰)

#### 응답 JSON (`200`)
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

#### 검증 규칙
- `limit` 범위를 벗어나면 `400`
- `status` 값이 enum과 맞지 않으면 `400`
- `cursor`가 숫자가 아니거나 범위를 벗어나면 `400`

---

### 6.4 `POST /api/v1/orders/{orderId}/cancel`
#### 설명
취소 가능한 주문을 취소합니다.

#### 요청 본문
빈 본문을 허용합니다.

#### 응답 JSON (`200`)
```json
{
  "orderId": "ord_01JABCXYZ123",
  "status": "CANCELLED",
  "cancelledAt": "2026-04-10T12:36:00Z"
}
```

#### 검증 규칙
- `PENDING`, `PARTIALLY_FILLED` 상태만 취소할 수 있습니다.

#### 오류 사례
- `404 NOT_FOUND`
- `409 ORDER_NOT_CANCELLABLE`

---

### 6.5 `GET /api/v1/portfolio`
#### 설명
포트폴리오 요약 지표를 조회합니다.

#### 응답 JSON (`200`)
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

#### 의미
- `positionsMarketValue = Σ(position.quantity * currentPrice)`
- `totalPortfolioValue = cashBalance + positionsMarketValue`
- `unrealizedPnl = Σ((currentPrice - avgPrice) * quantity)`
- `realizedPnl = 누적 확정 손익`
- `returnRate = (totalPortfolioValue - initialEquity) / initialEquity`

---

### 6.6 `GET /api/v1/portfolio/positions`
#### 설명
심볼별 보유 포지션 상세를 조회합니다.

#### 응답 JSON (`200`)
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

#### 의미
- `avgPrice = 총 매수 체결금액 / 총 보유수량` (가중평균)
- `marketValue = quantity * currentPrice`
- `unrealizedPnl = (currentPrice - avgPrice) * quantity`
- `unrealizedPnlRate = (currentPrice - avgPrice) / avgPrice`

---

### 6.7 `GET /api/v1/instruments/search`
#### 설명
내장된 미국 주식 카탈로그에서 심볼 또는 회사명으로 종목을 검색합니다.

#### 쿼리 파라미터
- `q` (required): 심볼 또는 회사명 검색어, 대소문자 비구분
- `limit` (optional, default `10`, max `20`)

#### 응답 JSON (`200`)
```json
{
  "items": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "exchange": "NASDAQ",
      "assetType": "EQUITY",
      "currency": "USD"
    }
  ]
}
```

#### 오류 사례
- `400 VALIDATION_ERROR` (`q`가 비어 있거나 `limit` 범위 오류)

---

### 6.8 `GET /api/v1/market/quotes/{symbol}`
#### 설명
지원 심볼의 결정적 현재가 스냅샷을 반환합니다.

#### 응답 JSON (`200`)
```json
{
  "symbol": "AAPL",
  "price": 180.0,
  "currency": "USD",
  "change": 1.25,
  "changePercent": 0.7,
  "asOf": "2026-04-22T13:30:00Z"
}
```

#### 오류 사례
- `404 NOT_FOUND`

---

### 6.9 `GET /api/v1/market/candles/{symbol}`
#### 설명
지원 심볼의 결정적 일봉(`1D`) 캔들 시계열을 반환합니다.

#### 쿼리 파라미터
- `interval`: 기본값 `1D`, 현재 `1D`만 지원
- `limit`: 기본값 `30`, 최대 `60`

#### 응답 JSON (`200`)
```json
{
  "symbol": "AAPL",
  "interval": "1D",
  "items": [
    {
      "timestamp": "2026-04-22T20:00:00Z",
      "open": 178.75,
      "high": 183.21,
      "low": 176.05,
      "close": 180.0,
      "volume": 4481007
    }
  ]
}
```

#### 오류 사례
- `400 VALIDATION_ERROR` (`symbol` 형식 오류, `interval` 미지원, `limit` 범위 오류)
- `404 NOT_FOUND` (지원하지 않는 심볼)

---

## 7. HTTP 상태 코드 요약
- `200`: 조회 또는 취소 성공
- `201`: 주문 생성 성공
- `400`: 요청 검증 실패
- `404`: 리소스 없음
- `409`: 비즈니스 충돌(취소 불가, 잔고 부족 등)
- `500`: 서버 내부 오류

---

## 8. 현재 제품에서 기억할 점
- `referencePrice`는 백엔드 시장 데이터 서비스가 제공하는 기준 가격입니다.
- `PARTIALLY_FILLED` 상태는 계약에 포함되지만, 현재 기본 실행 로직에서는 생성되지 않습니다.
- `initialEquity`는 현재 단일 공유 포트폴리오 기준 `100000.00 USD`로 시작합니다.
- `baseCurrency`는 `USD`입니다.

이 문서는 현재 공개 제품 범위에서 API를 이해하고 연동하기 위한 기준선입니다.
