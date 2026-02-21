# PSGMX Arena

**Live Quiz & Coding Platform** - Real-time, instructor-led quizzes and coding challenges with instant leaderboards, power-ups, and analytics.

> Any instructor can create a live quiz or coding session, students join instantly, everyone moves question-by-question in sync, results update in real time.

---

## Features

### Core Platform
- **18 Question Types** - MCQ, Multi-Select, True/False, Fill in the Blank, Short Answer, Numeric, Code, Ordering, Match, Drag-Drop, Case-Based, Rapid Fire, Long Answer, Hotspot, Matrix, Slider, File Upload, Drawing
- **Real-Time Sync** - Socket.IO-powered question-by-question flow with sub-second updates
- **Live Leaderboard** - Animated rankings with streak multipliers and speed bonuses
- **Code Sandbox** - Monaco Editor + Piston execution engine supporting 6 core languages (Python, JavaScript, TypeScript, Java, C, C++)
- **Code Playground** - Standalone coding challenges accessible from all role dashboards
- **Power-Ups** - Second Chance, Time Freeze, Fifty-Fifty, Hint system for gamified engagement

### Code Sandbox Integration

The code sandbox is integrated at three levels:

1. **Quiz Code Questions** - Instructors add CODE-type questions while building a quiz, each with selectable language, starter code, and test cases (input/expected output) for auto-grading.
2. **Student Play View** - During a live quiz, CODE questions present a full Monaco Editor with syntax highlighting, run/test capabilities, and real-time execution via Piston API.
3. **Code Playground** - Standalone practice environment at `/dashboard/playground` with curated challenges (Two Sum, FizzBuzz, Palindrome).

### Roles & Access

| Role | Capabilities |
|------|-------------|
| **Admin** | Full platform management, analytics, user role management, code playground |
| **Instructor** | Create quizzes (with code questions), host live sessions, view session analytics, code playground |
| **Student** | Join sessions via 6-digit code, play quizzes (including code), view leaderboard, code playground |

### Analytics & Insights
- Per-session analytics with question-level breakdown
- Score distribution histograms
- Student performance reports with Excel export
- Global platform statistics (Admin)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.4 |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Supabase Auth |
| **Real-Time** | Socket.IO (dedicated server on port 3001) |
| **State** | In-memory store (Redis-compatible API) |
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
+-- prisma/
|   +-- schema.prisma          # 15 models, 7 enums
|   +-- seed.ts                # Demo data seeder
+-- server/
|   +-- index.ts               # Socket.IO server (port 3001)
|   +-- handlers.ts            # WebSocket event handlers with timer
+-- scripts/
|   +-- test-db.ts             # DB connectivity test
+-- src/
|   +-- middleware.ts           # Route protection
|   +-- app/
|   |   +-- page.tsx            # Landing page
|   |   +-- layout.tsx          # Root layout (providers, toaster)
|   |   +-- auth/               # Login, forgot/change password
|   |   +-- join/               # 6-digit session code entry
|   |   +-- play/[sessionId]/   # Student play view (with CodeSandbox)
|   |   +-- session/.../host/   # Instructor host controls
|   |   +-- dashboard/
|   |   |   +-- page.tsx        # Role-specific dashboards
|   |   |   +-- layout.tsx      # Sidebar navigation
|   |   |   +-- quizzes/        # Quiz CRUD + question builder (CODE)
|   |   |   +-- sessions/       # Session management
|   |   |   +-- playground/     # Code playground with challenges
|   |   |   +-- users/          # Admin user management
|   |   |   +-- leaderboard/    # Rankings
|   |   |   +-- analytics/      # Analytics
|   |   +-- api/
|   |       +-- auth/           # Supabase auth routes
|   |       +-- quiz/           # Quiz CRUD + questions (CRUD)
|   |       +-- session/        # Session + join + answer persistence
|   |       +-- code/execute/   # Piston code execution
|   |       +-- admin/          # User management + analytics
|   |       +-- leaderboard/    # Leaderboard API
|   |       +-- export/         # Excel report export
|   +-- components/
|   |   +-- ui/                 # 10 Shadcn-style components
|   |   +-- code-sandbox.tsx    # Monaco + Piston (10 langs, test cases)
|   |   +-- live-leaderboard.tsx
|   |   +-- fullscreen-guard.tsx
|   |   +-- power-ups.tsx
|   |   +-- contact-support.tsx
|   |   +-- theme-toggle.tsx
|   |   +-- providers/          # Auth, Socket, Theme providers
|   +-- lib/
|   |   +-- db.ts              # Supabase admin client
|   |   +-- redis.ts           # In-memory store
|   |   +-- auth.ts            # Auth helpers
|   |   +-- utils.ts           # Scoring, formatting
|   |   +-- validations.ts     # Zod schemas
|   +-- types/
|       +-- socket.ts          # Socket.IO typed events
+-- Dockerfile
+-- Dockerfile.socket
+-- docker-compose.yml
+-- package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (20 recommended)
- **Supabase** project (for PostgreSQL and Auth)
- **Docker** (optional, for containerized deployment)

### Local Development

```bash
# 1. Clone and install
git clone <repo-url>
cd psgmx-arena
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Push database schema
npx prisma db push

# 4. Start development servers
npm run dev          # Next.js on :3000
npm run socket:dev   # Socket.IO on :3001

# Or use the dev script:
# Windows: dev.bat
# Linux/Mac: ./dev.sh

# 5. Open http://localhost:3000
```

### Docker Compose

```bash
docker compose up -d
```

### Default Admin Password

New users created by admin get the default password: `Psgmx123`  
Users must change their password on first login.

---

## Environment Variables

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Code Execution
PISTON_API_URL="https://emkc.org/api/v2/piston"

# App URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WS_URL="http://localhost:3001"
```

---

## Architecture

### Real-Time Quiz Flow

```
Instructor (Host View)
        |
   Socket.IO  <-->  Socket.IO Server (:3001)
        |                    |
        |             In-Memory Store
        |            (state, leaderboard)
        |                    |
   Socket.IO  <-->       Broadcast
        |
Students (Play View with CodeSandbox)
```

1. Instructor creates a quiz (with optional CODE questions) and starts a live session
2. Students join via 6-digit code
3. Instructor advances questions - all clients receive in sync with auto-timer
4. For CODE questions, students code in Monaco Editor and execute via Piston API
5. Answers are persisted to database and counted in real-time
6. Leaderboard updates via in-memory sorted sets
7. Session ends - full analytics available with Excel export

### Scoring Formula

```
score = basePoints * speedBonus * streakMultiplier

speedBonus = 1 + (0.5 * timeRemaining / totalTime)
streakMultiplier = 1.0, 1.1, 1.2, 1.3, 1.5 (consecutive corrects)
```

---

## API Reference

### Quizzes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quiz` | List quizzes |
| POST | `/api/quiz` | Create quiz |
| GET | `/api/quiz/:id` | Get quiz details |
| PATCH | `/api/quiz/:id` | Update quiz |
| DELETE | `/api/quiz/:id` | Delete quiz |
| GET | `/api/quiz/:id/questions` | List questions |
| POST | `/api/quiz/:id/questions` | Add question (supports CODE type) |
| PUT | `/api/quiz/:id/questions` | Reorder questions |
| DELETE | `/api/quiz/:id/questions?questionId=X` | Delete a question |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/session` | List sessions |
| POST | `/api/session` | Create session |
| GET | `/api/session/:id` | Get session details |
| POST | `/api/session/join` | Join via code |
| POST | `/api/session/:id/answer` | Persist student answer |

### Code Execution
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/code/execute` | Run code via Piston |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users |
| PATCH | `/api/admin/users` | Update user role |
| POST | `/api/admin/users` | Create user |
| GET | `/api/admin/analytics` | Global statistics |
| GET | `/api/export/report` | Export Excel report |

---

## Supported Languages

| Language | Version |
|----------|---------|
| Python 3 | 3.10.0 |
| JavaScript | 18.15.0 |
| TypeScript | 5.0.3 |
| Java | 15.0.2 |
| C | 10.2.0 |
| C++ | 10.2.0 |
| Go | 1.16.2 |
| Rust | 1.68.2 |
| Ruby | 3.0.1 |
| PHP | 8.2.3 |

---

## WebSocket Events

### Client to Server
| Event | Payload |
|-------|---------|
| `JOIN_SESSION` | `{ sessionId, participantId }` |
| `START_SESSION` | `{ sessionId, timePerQuestion? }` |
| `NEXT_QUESTION` | `{ sessionId, timePerQuestion? }` |
| `LOCK_QUESTION` | `{ sessionId }` |
| `SHOW_RESULTS` | `{ sessionId }` |
| `END_SESSION` | `{ sessionId }` |
| `SUBMIT_ANSWER` | `{ sessionId, participantId, questionId, answerData, timeTakenMs }` |

### Server to Client
| Event | Payload |
|-------|---------|
| `SESSION_STATE_CHANGE` | `{ state, currentQuestionIndex }` |
| `PARTICIPANT_JOINED` | `{ id, name, count }` |
| `ANSWER_COUNT_UPDATE` | `{ questionIndex, count, total }` |
| `TIMER_SYNC` | `{ remaining }` |
| `QUESTION_RESULTS` | `{ questionIndex, correctAnswer, stats, leaderboard }` |
| `SESSION_COMPLETE` | `{ finalLeaderboard, analytics }` |

---

## Database Schema

**15 models** across the full quiz lifecycle:

- `User` - Roles (Admin/Instructor/Student), Supabase Auth integration
- `Quiz` - Settings, mode, status, code question toggle, tags
- `Question` - 18 types, CODE questions (language, starter code, test cases)
- `QuizSession` - Live session state, join code
- `SessionParticipant` - Scores, streaks, connection status
- `StudentAnswer` - Responses with timing, code output, test results
- `QuizAnalytics` - Aggregated session metrics
- `PasswordResetRequest` - Admin-managed password resets

---

## Scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Start production server
npm run socket:dev   # Start Socket.IO server
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
```

---

## License

MIT

---

Built with Next.js, Socket.IO, Supabase, and Piston.
**PSGMX Arena** - Where learning meets competition.
