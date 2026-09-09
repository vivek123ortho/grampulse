# GramPulse

AI-powered rural problem discovery & early warning platform. Detects emerging
community issues (water contamination, road damage, etc.) by aggregating and
reasoning over small, scattered citizen reports — before they become formal
complaints or crises.

## Status
🚧 Phase 0 complete — project skeleton, auth-ready structure, testing
infrastructure. See `ROADMAP.md` for the full phase-by-phase build plan.

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios, React-Leaflet, Recharts
- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT, bcrypt, Multer, node-cron
- **AI:** Groq (fast text reasoning) + Gemini (multimodal + embeddings), orchestrated with LangChain.js
- **Maps:** Leaflet + OpenStreetMap
- **Storage:** Cloudinary

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally, OR a MongoDB Atlas connection string
- API keys: Groq, Gemini, Cloudinary (get these before Phase 3+)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# fill in .env with your keys (Mongo URI, JWT secret, AI keys, etc.)
npm run dev
```

Visit `http://localhost:5000/api/health` — you should see:
```json
{ "status": "ok", "service": "grampulse-backend", "timestamp": "..." }
```

### Running tests
```bash
cd backend
npm test
```
Tests use an in-memory MongoDB by default (`mongodb-memory-server`), so no
local database is needed for the test suite. If your network blocks the
binary download (locked-down CI, restricted sandbox), set `TEST_DB_MODE=local`
in your `.env` and point `TEST_MONGODB_URI` at a real local/dev MongoDB
instance instead — see `tests/setup.js` for details.

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure
```
backend/
├── src/
│   ├── controllers/     # request handlers
│   ├── routes/          # Express route definitions
│   ├── models/          # Mongoose schemas
│   ├── middleware/       # auth, validation, error handling
│   ├── services/ai/     # raw AI provider wrappers (pre-LangChain, Phase 3 baseline)
│   ├── agents/           # deterministic agent workflow (Phase 7a)
│   ├── langchain/        # LangChain models, chains, tools, agent executor (Phase 7b)
│   ├── cron/             # scheduled jobs (escalation, Phase 9)
│   ├── config/            # db connection, env-dependent setup
│   └── server.js / app.js
└── tests/                 # Jest + Supertest

frontend/
└── src/
    ├── components/
    ├── pages/
    ├── layouts/
    ├── hooks/
    ├── services/          # API client (Axios)
    ├── context/
    └── utils/
```

## Documentation
- `ROADMAP.md` — full phase-by-phase build plan
- `backend/src/langchain/README.md` — how the LangChain AI layer is wired up
