# infra

QERP v2의 로컬 운영 기준선은 루트 `docker-compose.yml`을 중심으로 구성합니다. 목표는 **프론트엔드 + 백엔드 + PostgreSQL**을 최소 재현 가능한 형태로 빠르게 올리고, 수동 개발 흐름을 깨지 않으면서 첫 배포 준비를 돕는 것입니다.

무료 호스팅 배포 경로(Vercel + Render + Neon)는 [docs/deployment-vercel-render-neon.md](../docs/deployment-vercel-render-neon.md)에 정리되어 있습니다.

## 구성 요소

- `postgres`: 주문/포트폴리오 상태를 저장하는 PostgreSQL 16
- `backend`: Spring Boot API 컨테이너
- `frontend`: Next.js 대시보드 컨테이너

프론트엔드는 Compose 네트워크 안에서 `http://backend:8080`으로 백엔드를 호출하고, 사용자는 호스트에서 `http://localhost:3000`으로 접속합니다.

## 빠른 시작

```bash
cp .env.example .env
docker compose up --build
```

기본 노출 포트:
- 프론트엔드: `3000`
- 백엔드: `8080`
- PostgreSQL: `5432`

## 환경 변수

루트 `.env.example`을 복사해 `.env`를 만든 뒤 필요 값만 수정하면 됩니다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `QERP_POSTGRES_DB` | `qerp` | PostgreSQL 데이터베이스 이름 |
| `QERP_POSTGRES_USER` | `qerp` | PostgreSQL 사용자 |
| `QERP_POSTGRES_PASSWORD` | `qerp` | PostgreSQL 비밀번호 예시값 |
| `QERP_POSTGRES_PORT` | `5432` | 호스트에 노출할 DB 포트 |
| `QERP_BACKEND_PORT` | `8080` | 호스트에 노출할 백엔드 포트 |
| `QERP_FRONTEND_PORT` | `3000` | 호스트에 노출할 프론트엔드 포트 |
| `QERP_FRONTEND_API_BASE_URL` | `http://backend:8080` | 프론트엔드 컨테이너가 내부 네트워크에서 사용할 백엔드 주소 |

## 자주 쓰는 명령

```bash
# 백그라운드 실행
docker compose up --build -d

# 로그 보기
docker compose logs -f

# 중지
docker compose down

# 볼륨까지 삭제해서 DB를 초기화
docker compose down -v
```

## 구현 메모

- 백엔드 컨테이너는 이미지 빌드 시 `bootJar`를 수행해 실행 가능한 JAR만 런타임 이미지에 포함합니다.
- 프론트엔드 컨테이너는 Next.js `standalone` 출력을 사용해 런타임 이미지를 작게 유지합니다.
- Compose는 로컬 수동 실행을 대체하지 않습니다. 기존의 `backend`/`frontend` 개별 개발 흐름은 그대로 유지됩니다.
