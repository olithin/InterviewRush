# QA Quest

Original gamified coding interview learning app for a **C# QA Automation Engineer**.

## Monorepo structure

```text
.
├── content/
│   └── problems/
│       ├── hashset/
│       ├── dictionary/
│       ├── two-pointers/
│       └── sliding-window/
├── backend/
│   └── src/
│       └── QAQuest.Api/
└── frontend/
    └── src/
        ├── app/
        ├── components/
        ├── data/
        └── lib/
```

## Backend stack
- ASP.NET Core Web API
- EF Core + SQLite

## Frontend stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui-style component setup
- Framer Motion
- lucide-react icons

## Run backend
1. Install .NET 10 SDK (project pinned via `global.json`).
2. From repo root:
   ```bash
   cd backend/src/QAQuest.Api
   dotnet restore
   dotnet run
   ```
3. Swagger (development): `http://localhost:5000/swagger` (or printed port).

## Import problem content from JSON
Problem content is file-driven. Each task is one JSON file:

```text
content/problems/<pattern-folder>/<slug>.json
```

Run importer explicitly (it does not auto-import on normal startup):

```bash
cd backend/src/QAQuest.Api
dotnet run -- import-content
```

Importer behavior:
- scans all JSON files under `content/problems`
- validates required fields
- upserts by `id`/`slug`
  - creates a problem if it does not exist
  - updates existing problem/explanation/solution if it exists
- logs validation/parse errors per file

## Run frontend
1. Install Node.js 20+.
2. From repo root:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000`.

Frontend calls backend API for problem content.  
If needed, set API URL:

```bash
# frontend/.env.local
API_BASE_URL=http://localhost:5000
```

## API endpoints (MVP)
- `GET /api/topics`
- `GET /api/topics/{id}`
- `GET /api/problems`
- `GET /api/problems/{id}`
- `GET /api/problems/{id}/explanation`
- `GET /api/problems/{id}/solutions`
- `GET /api/gaps`
- `GET /api/flashcards`
- `POST /api/attempts`
- `POST /api/gaps`

## Database migration steps
From `backend/src/QAQuest.Api`:
```bash
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate
dotnet ef database update
```

> Note: app also calls `Database.Migrate()` on startup.

## Seed data notes
- Problem tasks are now intended to come from `content/problems/*.json` via `import-content`.
- Existing DB rows are updated by re-import (upsert), not duplicated.

## JSON task schema
Required fields:
- `id`
- `slug`
- `title`
- `topic`
- `pattern`
- `difficulty`
- `statement`
- `signals[]`
- `mnemonic`
- `think[]`
- `algorithm[]`
- `code`
- `tests`
- `interview`
- `ru`
- `visualExplanation`
- `mistakes.critical[]`
- `mistakes.important[]`
- `mistakes.nice[]`
- `gaps[]`
- `edgeCases[]`

Optional fields:
- `sortOrder`
- `status`
- `examples[]`
- `constraints`
- `whyThisPattern`
- `whyNotOtherPatterns[]`

## Add a new task
1. Create file: `content/problems/<pattern-folder>/<slug>.json`
2. Fill required fields from the schema above.
3. Run importer:
   ```bash
   cd backend/src/QAQuest.Api
   dotnet run -- import-content
   ```
4. Start backend and frontend.
5. Open `/problems` and `/problems/{id}` to verify the new task appears.

## Suggested next steps
1. Integrate frontend pages with backend APIs.
2. Add persisted user profile/progress with auth.
3. Implement Learn/Practice/Interview action flows and submission logic.
4. Add animation polish and achievement system.
