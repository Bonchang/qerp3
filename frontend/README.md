# QERP frontend MVP shell

This milestone adds a minimal Next.js App Router frontend under `frontend/`.

## Features
- Portfolio summary
- Positions list
- Simple order form
- Recent orders list
- Selected-symbol detail route at `/instruments/[symbol]`
- Deeplinks from search results, positions, and recent orders into the selected-symbol workspace
- Backend-backed quant signal mode
- Friendly fallback when the backend is unavailable
- Configurable backend base URL via `NEXT_PUBLIC_API_BASE_URL` with an automatic Render fallback on Vercel

## Getting started
1. Start the backend on `http://localhost:8080` for local development, or set `NEXT_PUBLIC_API_BASE_URL` to override the backend target.
2. Copy `.env.example` to `.env.local` if needed.
3. Install dependencies:
   `npm install`
4. Start the frontend:
   `npm run dev`
5. Open `http://localhost:3000`

## Notes
- Browser requests go through the Next.js proxy route at `/api/backend/...` so the UI can talk to the existing backend without requiring backend CORS changes.
- When `NEXT_PUBLIC_API_BASE_URL` is unset, local development still targets `http://localhost:8080`, while Vercel deployments fall back to `https://qerp3-backend.onrender.com`.
- Quant mode also uses the same proxy route and loads signals from `/api/backend/quant/signals/{symbol}`.
- The detail route resolves instrument metadata first, then keeps quote, chart, quant, and order entry pinned to the same symbol state.
- The UI is intentionally minimal and unopinionated.
- Verification commands:
  - `npm test`
  - `npm run build`
