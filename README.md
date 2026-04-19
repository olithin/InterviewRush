# QA Quest

Original gamified coding interview learning app for a **C# QA Automation Engineer**.

## Monorepo structure

```text
.
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

## Run frontend
1. Install Node.js 20+.
2. From repo root:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000`.

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
- 12 topics seeded (Linear Scan, HashSet, Dictionary, Two Pointers, Sliding Window, Sorting, Binary Search, Queue, Stack, Prefix Sum, Matrix Basics, BFS/DFS Basics).
- 7 core easy problems seeded with rich explanation structure.

## Suggested next steps
1. Integrate frontend pages with backend APIs.
2. Add persisted user profile/progress with auth.
3. Implement Learn/Practice/Interview action flows and submission logic.
4. Add animation polish and achievement system.
