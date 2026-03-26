# AI-Powered Job Tracker

## Architecture Diagram

```
flowchart TD
    A[Frontend (React)] -->|REST API| B[Backend (Node.js + Fastify)]
    B -->|Fetch Jobs| C[External Job API (Adzuna)]
    B -->|Resume Upload| D[Storage (JSON/In-Memory)]
    B -->|Job Matching| E[LangChain (AI Matching)]
    B -->|AI Assistant| F[LangGraph (AI Orchestration)]
    F -->|LLM| G[OpenAI/Anthropic/Gemini]
    B -->|Applications| D
    A -->|Web UI| H[User]
```

## Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Environment Variables
- Copy `.env.example` to `.env` in both `/apps/server` and `/apps/web` as needed.
- Fill in your Adzuna and OpenAI API keys.

### Local Setup
```sh
cd apps/server
npm install
npm run dev

cd ../web
npm install
npm run dev
```

### Deployment
- Deploy backend and frontend to your preferred platform (e.g., Vercel, Netlify, Render, Railway).
- Ensure environment variables are set in your deployment environment.

## LangChain & LangGraph Usage
- **LangChain**: Used for AI-powered job-resume semantic matching. Each job is scored against the user's resume using an LLM, with explanations and match scores.
- **LangGraph**: Orchestrates the AI assistant, handling intent detection, action routing (search, filter update, help), conversation state, and tool/function calling for UI filter updates.
- **Prompt Design**: Prompts are crafted for both job matching and assistant intent detection, filter extraction, and help responses.
- **State Management**: Conversation and filter state are managed in the backend and synchronized with the frontend.

## AI Matching Logic
- Combines rule-based and LLM-based scoring for each job-resume pair.
- LLM refines the score and provides a short explanation (skills, experience, keywords).
- Performance: Caches match results and truncates resume text for efficiency.

## Popup Flow Design (Critical Thinking)
- After applying, a popup asks if the user applied, just browsed, or applied earlier.
- Handles edge cases (e.g., user closes tab, applies later).
- Alternative: Could use browser events or email tracking, but popup is privacy-friendly and simple.

## AI Assistant UI Choice
- Floating chat bubble (bottom-right) for minimal disruption and easy access.
- Sidebar was considered but bubble is more mobile-friendly and less intrusive.

## Scalability
- Handles 100+ jobs efficiently with caching and pagination.
- JSON/in-memory storage is simple for demo; for 10,000+ users, migrate to a database.
- Stateless backend and REST API make scaling easy.

## Tradeoffs
- In-memory/JSON storage is not production-grade for large scale.
- LLM calls can be slow/costly at scale; batching and caching help.
- UI is responsive but could be further optimized for mobile.
- With more time: Add database, advanced analytics, notifications, and more job sources.

---

**Submission Checklist:**
- [x] Live link works on desktop & mobile
- [x] Public GitHub repo
- [x] README includes architecture diagram
- [x] LangChain implemented
- [x] LangGraph implemented
- [x] AI controls filters
- [x] Match scores visible
- [x] Application tracking works
- [x] No secrets in code
