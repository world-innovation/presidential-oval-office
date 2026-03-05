## Cursor Cloud specific instructions

### Overview

Goki-Room is a drone delivery airspace management system with a Python/FastAPI backend and React/TypeScript frontend.

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Backend API | `cd backend && uvicorn app.main:app --reload --port 8000` | 8000 | Creates SQLite DB on first startup |
| Frontend dev | `cd frontend && pnpm dev` | 5173 | Proxies `/api` and `/ws` to backend |

### Key commands

See `README.md` for full list. Quick reference:

- **Backend lint**: `cd backend && ruff check .`
- **Backend tests**: `cd backend && pytest tests/ -v`
- **Frontend lint**: `cd frontend && pnpm lint`
- **Frontend type check**: `cd frontend && npx tsc -b --noEmit`
- **Frontend build**: `cd frontend && pnpm build`

### Non-obvious caveats

- The backend uses SQLite (`goki_room.db`) created in the `backend/` directory at startup. Delete it to reset state.
- `POST /api/simulation/seed` creates 8 Tokyo-area demo ports and 16 drones. It is idempotent (no-ops if data exists).
- The Vite dev server proxies `/api` and `/ws` to port 8000, so the backend must be running first.
- `pnpm.onlyBuiltDependencies` in `frontend/package.json` is set to `["esbuild"]` to avoid interactive `pnpm approve-builds`.
