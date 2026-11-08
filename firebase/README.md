# Firebase (ELLP)

What Firebase does in ELLP, and what it does not.

| Service | Used for | Who talks to it |
|---|---|---|
| **Authentication** | Email/password sign-in (Google sign-in can be switched on in the console later) | The browser (frontend/src/services/firebase.ts). The ID token goes to the C# API as `Authorization: Bearer`. |
| **Cloud Firestore** | The data (owners, programs, lessons, quests, users, progress, XP events, messages, mail log, settings) | The C# API only, through the Admin SDK with a service account (backend/Ellp.Api/Shared/Data/FirestoreStore.cs). Client rules are closed (`firestore.rules`). |
| **Hosting** | The built React app (`frontend/dist`), with `/api/**` rewritten to the API (Cloud Run in `firebase.json`; change to your host) | Optional. The API can also serve the SPA from its `wwwroot` as TMCL-PR does. |

## Set up (once per environment)

1. Create a Firebase project. Enable **Authentication → Email/Password** and **Firestore** (production mode).
2. Project settings → Your apps → Web app: copy the config into `frontend/.env.local` (`VITE_FIREBASE_*`) and set `VITE_USE_DEMO=false`.
3. Project settings → Service accounts → Generate new private key: save the JSON **outside the repository** and point the API at it
   (`GOOGLE_APPLICATION_CREDENTIALS` or `Firebase:CredentialFile`). Set `Auth:Mode=Firebase`, `Auth:FirebaseProjectId`, `Store:Mode=Firestore`.
4. Copy `.firebaserc.example` (repository root) to `.firebaserc` and put the project id in. `firebase.json` lives at the root too, because Hosting's public folder (`frontend/dist`) must sit inside the Firebase project directory. Deploy rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

5. Seed the first Super Admin: create the user in Authentication, then add a `users/<uid>` document
   `{ uid, displayName, email, role: "superadmin", ownerId: null, enrolledProgramIds: [], xp: 0, streakDays: 0, lastActiveDate: null, badgeIds: [], avatarColor: "#182433", active: true, createdAt: "<ISO>" }`.
   Everyone else is added from the admin console (Members) and matched by email on their first sign-in.
6. Add the `badges` collection from `backend/Ellp.Api/Shared/Data/SeedData.cs` (four documents) or write your own.

## Local emulators

```bash
firebase emulators:start
```

The frontend and the API can point at the emulators with `FIRESTORE_EMULATOR_HOST=localhost:8080` and
`FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` (standard Firebase SDK variables). V1.0.0 was developed against the in-memory store
and the demo mode; the emulator path is documented but not yet exercised (see docs/roadmap.md).
