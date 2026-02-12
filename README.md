# PSGMX Arena

**Live Quiz & Coding Platform** — Real-time, instructor-led quizzes and coding challenges with instant leaderboards, power-ups, and analytics.

> Any instructor can create a live quiz or coding session, students join instantly, everyone moves question-by-question in sync, results update in real time, zero lag, fully open-source.

---

## Features

### Core Platform
- **18 Question Types** — MCQ, Multi-Select, True/False, Fill in the Blank, Short Answer, Numeric, Code, Ordering, Match, Drag-Drop, Case-Based, Rapid Fire, Long Answer, Hotspot, Matrix, Slider, File Upload, Drawing
- **Real-Time Sync** — Socket.IO-powered question-by-question flow with sub-second updates
- **Live Leaderboard** — Animated rankings with streak multipliers and speed bonuses
- **Code Sandbox** — Monaco Editor + Piston execution engine supporting 10 languages (Python, JavaScript, TypeScript, Java, C, C++, Go, Rust, Ruby, PHP)
- **Power-Ups** — Second Chance, Time Freeze, Fifty-Fifty, Hint system for gamified engagement

### Roles & Access
| Role | Capabilities |
|------|-------------|
| **Admin** | Full platform management, analytics, user role management |
| **Instructor** | Create quizzes, host live sessions, view session analytics |
| **Student** | Join sessions via 6-digit code, play quizzes, view leaderboard history |

### Analytics & Insights
- Per-session analytics with question-level breakdown
- Score distribution histograms
- Student performance reports with CSV/PDF export
- Global platform statistics (Admin)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.4 |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | NextAuth.js v4 (Credentials, GitHub, Google) |
| **Real-Time** | Socket.IO (dedicated server on port 3001) |
| **Cache** | Redis (ioredis) — session state, leaderboards, timers |
| **UI** | Tailwind CSS + Radix UI + Lucide Icons + Framer Motion |
| **Code Editor** | Monaco Editor (@monaco-editor/react) |
| **Code Execution** | Piston API (sandboxed multi-language runner) |
| **Validation** | Zod |
| **Charts** | Recharts |
| **Deployment** | Docker + Docker Compose |

---

## Project Structure

```
psgmx-arena/
├── prisma/
│   ├── schema.prisma        # 15 models, 7 enums — full data layer
│   └── seed.ts               # Demo data (admin, instructor, 5 students, sample quiz)
├── server/
│   ├── index.ts              # Socket.IO server (port 3001)
│   └── handlers.ts           # All WebSocket event handlers
├── src/
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── layout.tsx        # Root layout (providers, toaster)
│   │   ├── auth/
│   │   │   ├── login/        # Credentials login
│   │   │   └── register/     # Registration with role select
│   │   ├── join/             # 6-digit session code entry
│   │   ├── play/[sessionId]/ # Student play view (502 lines)
│   │   ├── session/[sessionId]/host/  # Instructor host controls (315 lines)
│   │   ├── dashboard/
│   │   │   ├── page.tsx      # Role-specific dashboards
│   │   │   ├── layout.tsx    # Sidebar navigation
│   │   │   ├── quizzes/      # Quiz CRUD + question builder
│   │   │   ├── sessions/     # Session management
│   │   │   ├── playground/   # Code playground with challenges
│   │   │   ├── leaderboard/  # Student ranking history
│   │   │   └── analytics/    # Platform + session analytics
│   │   └── api/
│   │       ├── auth/         # NextAuth + registration
│   │       ├── quiz/         # Quiz CRUD + questions
│   │       ├── session/      # Session lifecycle + join
│   │       ├── code/execute/ # Piston code execution
│   │       ├── admin/        # User management + global analytics
│   │       └── analytics/    # Per-session analytics
│   ├── components/
│   │   ├── ui/               # 10 Shadcn-style components
│   │   ├── code-sandbox.tsx  # Monaco + Piston (295 lines)
│   │   ├── live-leaderboard.tsx  # Animated rankings
│   │   └── power-ups.tsx     # Gamification power-ups
│   ├── lib/
│   │   ├── prisma.ts         # Singleton Prisma client
│   │   ├── redis.ts          # Redis helpers (state, leaderboard, timers)
│   │   ├── auth.ts           # NextAuth configuration
│   │   ├── utils.ts          # Scoring, formatting, code generation
│   │   └── validations.ts    # Zod schemas for all inputs
│   ├── providers/
│   │   ├── auth-provider.tsx
│   │   └── socket-provider.tsx
│   ├── types/
│   │   ├── next-auth.d.ts    # Session type augmentation
│   │   └── socket.ts         # Socket.IO event types
│   └── middleware.ts          # Route protection (role-based)
├── public/
│   ├── logo.svg
│   ├── favicon.svg
│   ├── manifest.json
│   └── robots.txt
├── Dockerfile                 # Next.js production build
├── Dockerfile.socket          # Socket.IO server
├── docker-compose.yml         # Full stack (Postgres, Redis, Piston, App, Socket)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.server.json
├── .env.example
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (20 recommended)
- **PostgreSQL** 14+
- **Redis** 7+
- **Docker** (optional, for one-command deployment)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/psgmx-arena.git
cd psgmx-arena

# Start all services (Postgres, Redis, Piston, App, Socket)
docker compose up -d

# Run database migrations
docker compose exec app npx prisma migrate deploy

# Seed demo data
docker compose exec app npx prisma db seed

# Open in browser
# App:    http://localhost:3000
# Socket: http://localhost:3001
```

### Option 2: Local Development

```bash
# 1. Clone and install
git clone https://github.com/your-org/psgmx-arena.git
cd psgmx-arena
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your database and Redis URLs

# 3. Set up database
npx prisma generate
npx prisma db push        # or: npx prisma migrate dev
npx prisma db seed         # optional: load demo data

# 4. Start development servers (in separate terminals)
npm run dev                # Next.js on :3000
npm run socket:dev         # Socket.IO on :3001

# 5. Open http://localhost:3000
```

### Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@psgmx.edu | password123 |
| Instructor | instructor@psgmx.edu | password123 |
| Student | student1@psgmx.edu | password123 |

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/psgmx_arena"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret"

# OAuth (optional)
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Redis
REDIS_URL="redis://localhost:6379"

# Code Execution
PISTON_API_URL="https://emkc.org/api/v2/piston"

# AI (optional)
OLLAMA_URL="http://localhost:11434"
AI_MODEL="llama3"

# App URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WS_URL="http://localhost:3001"
```

---

## Architecture

### Real-Time Quiz Flow

```
┌─────────────┐     Socket.IO      ┌──────────────┐
│  Instructor  │◄──────────────────►│  Socket.IO   │
│  (Host View) │    room:session:X  │   Server     │
└─────────────┘                     │  (port 3001) │
                                    └──────┬───────┘
                                           │
                                    ┌──────┴───────┐
                                    │    Redis     │
                                    │ (state/LB)   │
                                    └──────┬───────┘
                                           │
┌─────────────┐     Socket.IO      ┌──────┴───────┐
│  Student 1   │◄──────────────────►│              │
│  Student 2   │◄──────────────────►│  Broadcast   │
│  Student N   │◄──────────────────►│              │
└─────────────┘                     └──────────────┘
```

1. **Instructor** creates a quiz and starts a live session
2. Students **join** via 6-digit code (or direct link)
3. Instructor advances questions — all clients receive in sync
4. Students submit answers — scored with **speed bonus** + **streak multiplier**
5. Leaderboard updates in real time via Redis sorted sets
6. Session ends — full analytics available with export

### Scoring Formula

```
score = basePoints × speedBonus × streakMultiplier

speedBonus = 1 + (0.5 × timeRemaining / totalTime)
streakMultiplier = 1.0 → 1.1 → 1.2 → 1.3 → 1.5 (consecutive corrects)
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/[...nextauth]` | NextAuth sign-in |

### Quizzes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quiz` | List quizzes |
| POST | `/api/quiz` | Create quiz |
| GET | `/api/quiz/:id` | Get quiz details |
| PATCH | `/api/quiz/:id` | Update quiz |
| DELETE | `/api/quiz/:id` | Delete quiz |
| GET | `/api/quiz/:id/questions` | List questions |
| POST | `/api/quiz/:id/questions` | Add question |
| PUT | `/api/quiz/:id/questions` | Reorder questions |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/session` | List sessions |
| POST | `/api/session` | Create session |
| GET | `/api/session/:id` | Get session details |
| POST | `/api/session/join` | Join via code |

### Code Execution
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/code/execute` | Run code via Piston |

### Admin & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users |
| PATCH | `/api/admin/users` | Update user role |
| GET | `/api/admin/analytics` | Global statistics |
| GET | `/api/analytics/session/:id` | Session analytics |

---

## WebSocket Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `JOIN_SESSION` | `{ sessionId, userId?, guestName? }` | Join a session room |
| `LEAVE_SESSION` | `{ sessionId, participantId }` | Leave session |
| `START_SESSION` | `{ sessionId }` | Start the quiz |
| `NEXT_QUESTION` | `{ sessionId, questionIndex }` | Advance to next question |
| `LOCK_QUESTION` | `{ sessionId, questionIndex }` | Lock answers |
| `SHOW_RESULTS` | `{ sessionId, questionIndex }` | Show question results |
| `END_SESSION` | `{ sessionId }` | End the session |
| `SUBMIT_ANSWER` | `{ sessionId, questionId, answer, timeTaken }` | Submit answer |
| `USE_POWER_UP` | `{ sessionId, powerUpType }` | Activate power-up |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `SESSION_JOINED` | `{ participant, participantCount }` | Confirm join |
| `PARTICIPANT_JOINED` | `{ participant, participantCount }` | New participant |
| `SESSION_STARTED` | `{ totalQuestions }` | Quiz started |
| `QUESTION_DELIVERED` | `{ question, index, total, timeLimit }` | New question |
| `QUESTION_LOCKED` | `{}` | Answers locked |
| `QUESTION_RESULTS` | `{ stats, leaderboard }` | Results revealed |
| `TIMER_TICK` | `{ remaining }` | Timer update |
| `SESSION_ENDED` | `{ finalLeaderboard, analytics }` | Session over |
| `ANSWER_SUBMITTED` | `{ participantId, score, streak }` | Answer confirmed |
| `LEADERBOARD_UPDATE` | `{ entries }` | Rankings update |

---

## Database Schema

**15 models** across the full quiz lifecycle:

- `User` — Roles (Admin/Instructor/Student), OAuth accounts
- `Quiz` — Settings, mode, status, time limits, shuffle, tags
- `Question` — 18 types, options, correct answers, hints, code templates, sub-questions
- `QuizSession` — Live session state, join code, scheduling
- `SessionParticipant` — Scores, streaks, power-ups, connection status
- `StudentAnswer` — Per-question responses with timing data
- `QuizAnalytics` — Aggregated session metrics
- `AbuseReport` — Tab-switch and copy-paste detection

Run `npx prisma studio` to browse the database visually.

---

## Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | postgres:16-alpine | 5432 | Primary database |
| `redis` | redis:7-alpine | 6379 | Cache, leaderboards, timers |
| `piston` | ghcr.io/engineer-man/piston | 2000 | Sandboxed code execution |
| `app` | Custom (Dockerfile) | 3000 | Next.js application |
| `socket` | Custom (Dockerfile.socket) | 3001 | Socket.IO server |

---

## Scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Start production server
npm run socket:dev   # Start Socket.IO server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT — See [LICENSE](LICENSE) for details.

---

Built with Next.js, Socket.IO, Prisma, and Redis.  
**PSGMX Arena** — Where learning meets competition.