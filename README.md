# Campus Challenge — Backend (Vercel + Prisma)

This repo is a static frontend (`index.html`) + a serverless backend under `api/` (deployable on Vercel).

## Local setup

1) Install dependencies:

```bash
npm i
```

2) Create `.env` (copy from `.env.example`) and set:

- `DATABASE_URL="file:./dev.db"`
- `JWT_SECRET="some-long-random-string"`
- *(optional)* `TASK_MODERATION_URL="http://localhost:8000/moderate"` (your friend’s model endpoint)
- *(optional)* `TASK_MODERATION_API_KEY="..."` (if the model requires auth)

3) Create the database:

```bash
npm run prisma:push
```

4) (Optional) Seed demo users (password is `password123`):

```bash
npm run seed
```

5) Run:

```bash
npm run dev
```

## API (summary)

- `POST /api/auth/signup` → `{ email, password }`
- `POST /api/auth/login` → `{ email, password }`
- `GET /api/me` (Bearer token)
- `POST /api/profile/update` (Bearer) → `{ name, course, department, section }`
- `POST /api/settings/update` (Bearer) → `{ theme, mood, sound, music }`
- `GET /api/leaderboard`
- `GET /api/feed/list`
- `GET /api/profile/completed` (Bearer)
- `POST /api/moderate-task` → `{ text }`
- `POST /api/match/start` (Bearer)
- `POST /api/match/send-task` (Bearer) → `{ matchId, text }`
- `GET /api/match/status?matchId=...` (Bearer)
- `POST /api/match/submit-proof` (Bearer) → `{ matchId, proofType, proofText? }`
- `POST /api/match/review` (Bearer) → `{ matchId, action: "approve"|"reject", postToFeed? }`

