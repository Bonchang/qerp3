# quant-worker

QERP v2의 quant-worker 플레이스홀더 구현입니다.

현재 단계의 목표는 **실제 퀀트 엔진을 만드는 것**이 아니라, 나중에 백엔드나 스케줄러가 붙더라도 흔들리지 않을 **입출력 계약을 먼저 고정하는 것**입니다.

## 현재 제공 범위
- 표준 라이브러리만 사용하는 Python 구현
- CLI 한 번으로 실행 가능한 신호 생성기
- `BUY` / `HOLD` / `SELL` 중 하나를 결정적으로 반환
- 사람이 바로 읽을 수 있는 짧은 설명 문자열 포함
- `unittest` 기반 테스트 포함

## 신호 규칙
현재 placeholder는 아래 규칙만 사용합니다.

- `reference_price` 대비 `observed_price` 변동률 계산
- 변동률이 `-threshold_percent` 이하이면 `BUY`
- 변동률이 `+threshold_percent` 이상이면 `SELL`
- 그 사이는 `HOLD`

즉, 실제 전략이나 모델 추론은 없고 **기준가 대비 단순 밴드 판정기**입니다.

## 실행 방법

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

예시 출력:

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

## 테스트

```bash
cd quant-worker
python3 -m unittest discover -s tests -v
```

## 계약 문서
상세 계약은 아래 문서를 기준으로 합니다.

- [`docs/quant-worker-contract.md`](../docs/quant-worker-contract.md)

## 비범위
현재는 아직 하지 않습니다.
- 외부 LLM/ML 모델 호출
- 네트워크 의존 시세 수집
- 백엔드 큐/배치 연동
- 포트폴리오 문맥을 반영한 복합 전략 판단
