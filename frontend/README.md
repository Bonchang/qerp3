# QERP frontend MVP shell

This milestone adds a minimal Next.js App Router frontend under `frontend/`.

## Features
- Portfolio summary
- Positions list
- Simple order form
- Recent orders list
- Friendly fallback when the backend is unavailable
- Configurable backend base URL via `NEXT_PUBLIC_API_BASE_URL`

## Getting started
1. Start the backend on `http://localhost:8080` or set `NEXT_PUBLIC_API_BASE_URL`.
2. Copy `.env.example` to `.env.local` if needed.
3. Install dependencies:
   `npm install`
4. Start the frontend:
   `npm run dev`
5. Open `http://localhost:3000`

## Notes
- Browser requests go through the Next.js proxy route at `/api/backend/...` so the UI can talk to the existing backend without requiring backend CORS changes.
- The UI is intentionally minimal and unopinionated.
- Verification commands:
  - `npm test`
  - `npm run build`
