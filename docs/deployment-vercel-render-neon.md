# Vercel + Render + Neon 배포 가이드

이 저장소의 가장 단순한 무료 배포 경로는 다음 조합입니다.

- **Vercel**: Next.js 프론트엔드 (`frontend/`)
- **Render**: Spring Boot 백엔드 (`backend/`)
- **Neon**: PostgreSQL 데이터베이스

이 경로는 현재 저장소 구조와 잘 맞습니다.

- 프론트엔드는 이미 `NEXT_PUBLIC_API_BASE_URL` 로 백엔드 주소를 바꿀 수 있습니다.
- 브라우저 요청은 Next.js 프록시(`/api/backend/*`)를 통해 전달되므로 백엔드 CORS를 추가로 열지 않아도 됩니다.
- 백엔드는 `GET /health` 와 `PORT` 환경 변수 바인딩을 지원하므로 Render 헬스 체크에 바로 사용할 수 있습니다.

## 1. Neon 준비

Neon에서 PostgreSQL 데이터베이스를 하나 만든 뒤 아래 값을 확인합니다.

- host
- database name
- username
- password

QERP 백엔드는 아래 환경 변수를 사용합니다.

| 변수 | 설명 |
| --- | --- |
| `QERP_DB_URL` | PostgreSQL JDBC URL |
| `QERP_DB_USERNAME` | DB 사용자 |
| `QERP_DB_PASSWORD` | DB 비밀번호 |

예시:

```text
QERP_DB_URL=jdbc:postgresql://<neon-host>/<database>?sslmode=require
QERP_DB_USERNAME=<neon-username>
QERP_DB_PASSWORD=***
QERP_DB_SCHEMA=qerp3
```

`QERP_DB_URL` 은 **JDBC 형식**이어야 합니다. Neon 대시보드가 추가 SSL/연결 파라미터를 제공하면 그 쿼리스트링을 그대로 반영하면 됩니다.

백엔드는 기본적으로 `QERP_DB_SCHEMA`(기본값 `qerp3`)를 Flyway 기본 스키마와 JDBC `search_path` 의 첫 번째 스키마로 사용합니다. 따라서 Neon의 기본 `public` 스키마에 `CREATE` 권한이 없는 앱 롤이어도, 별도 `qerp3` 스키마만 준비되면 기동할 수 있습니다.

중요한 권한 조건:

- `public` 스키마 권한은 더 이상 필요하지 않습니다.
- 대신 앱 롤(`qerp3_app`)이 **DB 레벨 `CREATE` 권한으로 `qerp3` 스키마를 직접 만들 수 있거나**,
- Neon 소유자/관리자 롤이 먼저 `qerp3` 스키마를 만들고 `USAGE, CREATE ON SCHEMA qerp3` 를 앱 롤에 부여해야 합니다.

후자라면 예시는 아래와 같습니다.

```sql
CREATE SCHEMA IF NOT EXISTS qerp3 AUTHORIZATION <owner_role>;
GRANT USAGE, CREATE ON SCHEMA qerp3 TO qerp3_app;
```

## 2. Render 백엔드 배포

저장소 루트에 `render.yaml` 이 포함되어 있으므로 **Blueprint** 방식이 가장 간단합니다.

### 권장: Blueprint 사용

1. Render에서 **New + > Blueprint** 를 선택합니다.
2. 이 저장소를 연결합니다.
3. Render가 루트의 `render.yaml` 을 읽어 `backend/` 서비스 설정을 채웁니다.
4. 아래 비밀 환경 변수를 입력합니다.
   - `QERP_DB_URL`
   - `QERP_DB_USERNAME`
   - `QERP_DB_PASSWORD`
   - 필요하면 `QERP_DB_SCHEMA` (기본값 `qerp3`)
5. 배포를 시작합니다.

Blueprint가 설정하는 핵심 값:

- Root Directory: `backend`
- Runtime: `Docker`
- Docker Context: `.`
- Dockerfile Path: `./Dockerfile`
- Health Check Path: `/health`
- Plan: `free`

### 수동으로 만들 경우

Blueprint를 쓰지 않으면 Render Web Service를 직접 아래처럼 만듭니다.

- Environment / Runtime: Docker
- Root Directory: `backend`
- Docker Context: `.`
- Dockerfile Path: `./Dockerfile`
- Health Check Path: `/health`

### Render 런타임 메모

- 백엔드는 `PORT` 환경 변수를 자동으로 읽어 바인딩합니다.
- Flyway는 시작 시 `QERP_DB_SCHEMA`(기본 `qerp3`)에 스키마 히스토리 테이블과 애플리케이션 테이블을 생성/업데이트합니다.
- `/health` 는 경량 프로세스 헬스 체크용이며 `200 OK` 와 `{"status":"ok"}` 를 반환합니다.

### quant-worker caveat

현재 quant signal 엔드포인트는 런타임에서 아래 두 가지를 기대합니다.

- `python3`
- 저장소 루트 기준 sibling `quant-worker/` 디렉터리

`render.yaml` 은 기본적으로 `QERP3_QUANT_WORKER_DIR=../quant-worker` 와 `QERP3_QUANT_PYTHON_BIN=python3` 를 설정합니다. 다만 Render 런타임에서 실제로 `python3` 가 사용 가능한지는 배포 후 `GET /api/v1/quant/signals/{symbol}` 로 한 번 확인하는 것이 안전합니다. 이 caveat는 **quant signal 엔드포인트에만 영향**이 있고, 일반 시장/주문/포트폴리오 API와 `/health` 는 별개입니다.

## 3. Vercel 프론트엔드 배포

1. Vercel에서 **New Project** 로 이 저장소를 가져옵니다.
2. **Root Directory** 를 `frontend` 로 설정합니다.
3. 환경 변수에 아래 값을 추가합니다.

```text
NEXT_PUBLIC_API_BASE_URL=https://<your-render-service>.onrender.com
```

4. Deploy를 실행합니다.

기본적으로 프론트엔드는 Vercel 서버에서 위 백엔드 주소를 향해 요청하고, 브라우저는 같은 프론트엔드 도메인의 `/api/backend/*` 프록시만 호출합니다.

## 4. 배포 후 확인 순서

### 백엔드

1. `https://<render-service>.onrender.com/health`
2. 기대 결과:

```json
{"status":"ok"}
```

3. 추가 확인 예시:
   - `GET /api/v1/portfolio`
   - `GET /api/v1/instruments/search?q=AAPL`

### 프론트엔드

1. Vercel 배포 URL 접속
2. 메인 대시보드 로딩 확인
3. 종목 검색 / 포트폴리오 / 최근 주문 패널이 정상 응답하는지 확인
4. 필요하면 프론트엔드 프록시도 직접 확인

```text
https://<your-vercel-app>.vercel.app/api/backend/portfolio
```

## 5. 배포에 필요한 환경 변수 요약

### Render backend

| 변수 | 필수 | 비고 |
| --- | --- | --- |
| `QERP_DB_URL` | 예 | Neon JDBC URL |
| `QERP_DB_USERNAME` | 예 | Neon 사용자 |
| `QERP_DB_PASSWORD` | 예 | Neon 비밀번호 |
| `QERP_DB_SCHEMA` | 아니오 | 기본값 `qerp3`; Flyway/JDBC 기본 스키마 |
| `QERP3_QUANT_WORKER_DIR` | 아니오 | 기본값 `../quant-worker` |
| `QERP3_QUANT_PYTHON_BIN` | 아니오 | 기본값 `python3` |

### Vercel frontend

| 변수 | 필수 | 비고 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | 예 | Render 백엔드의 공개 URL |

## 6. 가장 안전한 기본값

- **Vercel 설정은 문서로만 유지**: Vercel의 monorepo Root Directory는 대시보드 설정이 가장 명확해서 별도 `vercel.json` 은 추가하지 않았습니다.
- **Neon 전용 설정 파일은 추가하지 않음**: 이 저장소에 필요한 것은 결국 PostgreSQL 접속 정보뿐이라 환경 변수 문서화만 유지했습니다.
- **Render는 blueprint 추가**: monorepo에서 `backend/` 루트, Docker context/Dockerfile, 헬스 체크 경로를 반복 입력하지 않도록 `render.yaml` 을 추가했습니다.
