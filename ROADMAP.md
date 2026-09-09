# GramPulse — Build Roadmap

Estimated 8-10 weeks at a comfortable pace. Phases 1 → 7b are the highest-priority
core; everything after is dashboard/polish/documentation work.

## Phase 0 — Setup & Decisions ✅ (this commit)
- [x] Project skeleton (backend/frontend folders)
- [x] `package.json` with full dependency list
- [x] `.env.example`
- [x] Express `app.js` / `server.js` split (testable without a running server)
- [x] MongoDB connection helper (`config/db.js`)
- [x] Jest + Supertest + mongodb-memory-server test infrastructure
- [x] Smoke test (`tests/health.test.js`)
- [x] AI layer files staged (`langchain/`, `services/ai/`, `agents/`) — not yet wired to routes

## Phase 1 — Foundation & Auth
- [ ] Mongoose models: `User`, `Village`, `Report`, `CommunityIssue`, `WeatherSnapshot`
- [ ] JWT auth, roles: `citizen`, `representative`, `admin`
- [ ] bcrypt hashing, protected route middleware
- [ ] Seed script: 2-3 villages, 1 user per role
- [ ] Auth middleware tests

## Phase 2 — Reporting + Voice Input
- [ ] Report form: description + category + auto-geolocation
- [ ] Image upload → Multer → Cloudinary
- [ ] Citizen "my reports" view
- [ ] Basic geo query for nearby reports
- [ ] Voice reporting (English) via Web Speech API

## Phase 3 — LangChain Text Classification
- [ ] Wire `langchain/chains.js` → `classifyReportChain()` into report submission
- [ ] Unit tests: schema validation, fallback on API failure

## Phase 4 — LangChain Image Analysis
- [ ] Wire `analyzeImageChain()` for uploaded photos
- [ ] Merge text + image severity (higher wins)

## Phase 5 — Duplicate Detection & Community Issues
- [ ] Wire `services/ai/similarityService.js` into report flow
- [ ] Thorough test suite: exact dup, semantic dup, different location/category boundary cases

## Phase 6 — Severity, Emerging Issue & Weather Signal
- [ ] `calculateSeverity()`, `detectEmergingIssue()` unit tested
- [ ] Weather integration as an additional signal

## Phase 7a — Deterministic Agent Baseline
- [ ] Wire `agents/ruralProblemAgent.js` as default controller path

## Phase 7b — LangChain Agent Tool-Calling
- [ ] Wire `langchain/ruralProblemAgentExecutor.js`
- [ ] 7a vs 7b comparison writeup

## Phase 8 — Case Lifecycle & Representative Dashboard
- [ ] Status transitions, department routing, rep dashboard UI

## Phase 9 — Autonomous Escalation Job
- [ ] `node-cron` job in `src/cron/`, notification on escalation

## Phase 10 — Map, Admin Dashboard & AI Ops Panel
- [ ] React-Leaflet map, admin stats, AI call logging/observability panel

## Phase 11 — Multi-language Voice & Polish
- [ ] Hindi/Marathi voice input, UI visual pass

## Phase 12 — Documentation & Demo Prep
- [ ] Seed demo data, architecture diagrams, demo video, rehearsed walkthrough

## Phase 13 — Final QA & Deploy
- [ ] Cold run of demo script, deploy (Render/Railway + Vercel + Atlas)
