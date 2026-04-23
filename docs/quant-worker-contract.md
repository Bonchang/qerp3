# Quant Worker Placeholder Contract

QERP의 `quant-worker`는 아직 실제 자동매매 엔진이 아닙니다. 이 문서는 **현재 공개되는 플레이스홀더 계약**을 고정하기 위한 문서입니다.

## 목적
- 향후 백엔드, 스케줄러, 이벤트 소비자가 붙더라도 바뀌기 어려운 최소 출력 형태를 먼저 정합니다.
- 지금 단계에서는 **결정적(deterministic)** 으로 동작하는 더미 신호만 제공합니다.
- 외부 모델, 외부 API, 외부 큐에 의존하지 않고 로컬에서 즉시 재현 가능해야 합니다.

## 현재 인터페이스
현재 공개 인터페이스는 Python CLI입니다.

```bash
cd quant-worker
python3 -m app.main \
  --symbol AAPL \
  --price 95 \
  --reference-price 100 \
  --threshold-percent 2 \
  --generated-at 2026-04-23T13:33:00Z \
  --pretty
```

### 입력 파라미터

| 인자 | 필수 | 설명 |
| --- | --- | --- |
| `--symbol` | 예 | 평가 대상 심볼. 공백 제거 후 대문자로 정규화합니다. |
| `--price` | 예 | 현재 관측 가격(`observedPrice`) |
| `--reference-price` | 예 | 비교 기준 가격(`referencePrice`) |
| `--threshold-percent` | 아니오 | `HOLD` 구간의 절대 퍼센트 밴드. 기본값 `2` |
| `--generated-at` | 아니오 | ISO-8601 타임스탬프. 테스트/재현용 고정 시간 주입에 사용 |
| `--pretty` | 아니오 | JSON pretty print |

### 입력 제약
- `symbol`은 빈 문자열이면 안 됩니다.
- `price`와 `reference-price`는 0보다 커야 합니다.
- `threshold-percent`는 0 이상이어야 합니다.
- 숫자는 Python `Decimal`로 파싱 가능한 값이어야 합니다.

## 출력 JSON 계약

```json
{
  "symbol": "AAPL",
  "observedPrice": 95.0,
  "referencePrice": 100.0,
  "thresholdPercent": 2.0,
  "priceChangePercent": -5.0,
  "signal": "BUY",
  "explanation": "AAPL 현재가가 기준가보다 5.00% 낮아 BUY placeholder 신호를 반환했습니다.",
  "generatedAt": "2026-04-23T13:33:00Z",
  "source": "placeholder-v1"
}
```

### 필드 의미

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `symbol` | string | 정규화된 심볼 |
| `observedPrice` | number | 입력 현재가 |
| `referencePrice` | number | 입력 기준가 |
| `thresholdPercent` | number | `HOLD` 밴드 기준 퍼센트 |
| `priceChangePercent` | number | `(observedPrice - referencePrice) / referencePrice * 100` |
| `signal` | string enum | `BUY` / `HOLD` / `SELL` |
| `explanation` | string | 짧은 한국어 설명 문자열 |
| `generatedAt` | string | UTC ISO-8601 타임스탬프 |
| `source` | string | 현재 플레이스홀더 계약 버전. 지금은 `placeholder-v1` |

## 신호 판정 규칙
`priceChangePercent`를 아래처럼 해석합니다.

- `priceChangePercent <= -thresholdPercent` → `BUY`
- `priceChangePercent >= thresholdPercent` → `SELL`
- 그 외 → `HOLD`

예시 (`thresholdPercent = 2`):
- 기준가 100, 현재가 97 → `BUY`
- 기준가 100, 현재가 101 → `HOLD`
- 기준가 100, 현재가 103 → `SELL`

## 설계 의도
이 계약은 일부러 단순합니다.

- 신호 종류를 먼저 고정합니다.
- 설명 문자열이 항상 함께 오도록 강제합니다.
- 추후 실제 전략 엔진이 붙더라도 **최소한 이 출력 모양은 유지**하는 것을 목표로 합니다.

## 현재 비범위
아래는 아직 계약에 포함하지 않습니다.
- 포트폴리오 보유 수량, 현금, 체결 이력 반영
- 다중 종목 일괄 배치 입력
- 백엔드 HTTP 호출 또는 메시지 큐 소비
- 외부 AI/ML/LLM 기반 추론
- 재시도, 스케줄링, 작업 상태 저장

즉, 지금의 `quant-worker`는 **로컬에서 바로 실행 가능한 신호 계약 고정용 플레이스홀더**입니다.
