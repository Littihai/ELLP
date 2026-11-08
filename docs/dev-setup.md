# Developer setup

## Tools

- Node.js 22 or newer, npm
- .NET SDK 9
- Git; the GitHub CLI (`gh`) for releases
- Firebase CLI (`npm i -g firebase-tools`) only when going live or using the emulators

## Demo (no server)

```bash
cd frontend
npm ci
npm run dev          # http://localhost:5174, VITE_USE_DEMO defaults to true
```

Progress lives in this browser's localStorage under `ellp.demo.v7` (the suffix changes when the seed's shape changes). Admin › Settings › "Reset demo data" starts over.

## Frontend + API (in-memory, demo header)

```bash
dotnet run --project backend/Ellp.Api     # http://localhost:5220, Swagger at /swagger
```

Swagger: press *Authorize* and enter a seeded uid as `X-Demo-User` (`u_mint`, `u_admin_ann`, `u_owner_sun`, `u_super`).

To drive the React app from the API instead of the demo store, the frontend needs Firebase Auth (live mode always signs in
through Firebase). A demo-header mode for the frontend is deliberately not provided: the two "demo" paths would drift.
Use Swagger to exercise the API, or go live (below).

## Live (Firebase)

1. Follow [firebase/README.md](../firebase/README.md) (project, Auth, Firestore, service account, rules, first Super Admin).
2. `frontend/.env.local`:
   ```
   VITE_USE_DEMO=false
   VITE_API_BASE=/api/v1
   VITE_API_TARGET=http://localhost:5220
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. `backend/Ellp.Api/appsettings.Development.json` (git-ignored):
   ```json
   { "Auth": { "Mode": "Firebase", "FirebaseProjectId": "<id>" }, "Store": { "Mode": "Firestore" }, "Firebase": { "CredentialFile": "D:/secrets/ellp-sa.json" } }
   ```
4. Run both. Sign in with the Super Admin you created.

## Email

Without SMTP settings the API uses `LogOnlyEmailService`: replies are recorded in the mail log as the test-mode guard decides and
logged to the console, nothing leaves. To send real mail set `Email:Host`, `Email:AuthUser`, `EMAIL_PASSWORD` (environment) and,
when you really mean it, `Email:GlobalTestMode=false` **and** the tenant's test mode off in Admin › Settings. Two switches on
purpose.

## Checks before a commit

```bash
cd frontend && npx tsc --noEmit && npm run build
dotnet build backend/Ellp.sln -c Release
dotnet test backend/Ellp.Api.Tests/Ellp.Api.Tests.csproj -c Release
```

## Ports

| What | Port |
|---|---|
| Vite dev server | 5174 |
| API | 5220 |
| Firebase emulators | Auth 9099, Firestore 8080, Hosting 5000 |

(TMCL-PR uses 5173 / 5219, so both projects can run side by side.)

## Deploy the demo (Firebase Hosting)

```bash
cd frontend && npm run build
firebase deploy --only hosting --project ellp-littihai
```

`firebase.json` and `.firebaserc` sit at the repository root (Hosting needs `frontend/dist` inside the project directory).
The live demo is https://ellp-littihai.web.app, demo mode only: the C# API is not hosted yet, so `/api/**` has no rewrite.
