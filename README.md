# socmedpipeline-frontend

A conversational brief builder for small business social media campaigns. An AI interviews a business owner via chat, extracts a structured JSON brief, and saves it for the downstream content pipeline to consume.

This is the intake frontend for [socmedpipeline-working](https://github.com/bob5001/socmedpipeline-working). It produces the `Brief` JSON that Agent 1 of that pipeline reads.

---

## How it works

1. Business owner visits `/onboard` and has a short (~10 exchange) conversation with an AI interviewer
2. The AI covers: business identity, target audience, brand voice, platforms, content logistics, and upcoming events
3. Once it has enough data, the AI summarizes and asks for confirmation
4. On confirmation, the conversation is extracted into a structured `Brief` JSON and saved to `briefs/brief-<timestamp>.json`
5. The owner is redirected to `/brief/[id]` to review and edit every field before handing off to the pipeline

```
/onboard  →  chat interview  →  /api/brief (extract)  →  /brief/[id]  →  briefs/<id>.json
                                                                              ↓
                                            python src/agent_1_campaign_data.py --brief <path>
```

---

## Stack

- **Next.js 16** App Router, TypeScript
- **Tailwind v4** (`@tailwindcss/postcss`)
- **LLM:** Claude Haiku (Anthropic) or any Ollama model — switchable via env var
- No database, no auth (v0 — briefs are flat JSON files on disk)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# For Anthropic (production default)
ANTHROPIC_API_KEY=sk-ant-...
USE_OLLAMA=false

# For local Ollama (testing)
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

You need either a valid `ANTHROPIC_API_KEY` **or** Ollama running locally — not both.

### 3. Create the briefs directory

```bash
mkdir -p briefs
```

### 4. Run

```bash
npm run dev       # development (Turbopack)
npm run build && npm start   # production
```

The app redirects `/` → `/onboard` automatically.

---

## Brief schema

The extracted JSON saved to `briefs/` has this shape:

| Field | Type | Description |
|---|---|---|
| `id` | string | `brief-<timestamp>` |
| `created_at` | string | ISO timestamp |
| `business_name` | string | |
| `industry` | string | Normalized category |
| `location` | string | City / region |
| `service_area` | string | Geographic coverage |
| `target_audience` | string | Description of ideal customer |
| `customer_pain_point` | string | Problem that brings customers to them |
| `discovery_channels` | string | How customers find them |
| `differentiator` | string | What makes them different |
| `brand_voice` | `casual \| professional \| warm \| edgy` | |
| `tone_notes` | string | Specific tone guidance |
| `platforms` | string[] | e.g. `["instagram", "facebook"]` |
| `posting_frequency` | string | e.g. `"3x per week"` |
| `content_sources` | `user_photos \| ai_generated \| mixed` | |
| `avoid_topics` | string[] | |
| `emphasis_topics` | string[] | |
| `upcoming_hooks` | `{event, date, notes}[]` | Promos / seasonal events |
| `raw_summary` | string | 2–3 sentence plain English summary |

---

## Routes

| Route | Description |
|---|---|
| `GET /` | Redirects to `/onboard` |
| `GET /onboard` | Chat interview UI |
| `POST /api/chat` | LLM interview agent — takes `{ messages }`, returns `{ message }` |
| `POST /api/brief` | Extracts brief from conversation, saves to disk — returns `{ id, brief }` |
| `GET /brief/[id]` | Review and edit a saved brief |

---

## LLM providers

The `lib/llm.ts` abstraction routes all LLM calls. Switch providers with a single env var — no code changes.

**Anthropic (default for production):** Set `USE_OLLAMA=false` and provide `ANTHROPIC_API_KEY`. Uses `claude-haiku-4-5-20251001`.

**Ollama (local testing):** Set `USE_OLLAMA=true`. Tested with `llama3.1:8b`. Any chat-capable Ollama model works — set `OLLAMA_MODEL` to match what you have installed (`ollama list`).

---

## Connecting to the pipeline

After a brief is generated, pass its path to Agent 1 of `socmedpipeline-working`:

```bash
python src/agent_1_campaign_data.py --brief briefs/brief-<timestamp>.json
```

The brief covers everything Agent 1 needs: business identity, audience, voice, platforms, content logistics, and upcoming promotional hooks.

---

## Production considerations

**Brief storage:** Briefs are written as JSON files to `briefs/` at the project root. This works for single-instance use or low volume. For multi-user or multi-instance deployments, replace the `writeFileSync` calls in `app/api/brief/route.ts` and the `readFileSync` in `app/brief/[id]/page.tsx` with a database or object storage.

**Authentication:** There is none. If this is publicly accessible, add auth before it goes live — anyone who can reach `/onboard` can generate briefs and read any brief by ID.

**LLM costs:** In Anthropic mode, each interview session makes ~10–15 Haiku calls (chat) plus one call for extraction. A full session costs well under $0.01 at current pricing.

**Turbopack + fonts:** `next/font/google` throws a `DOMException` under Turbopack. The app uses a system font stack instead. If you switch to the standard webpack build this constraint goes away.

---

## Status

Alpha. Core flow (interview → extract → review) works end-to-end. The "Generate my content" button on `/brief/[id]` currently just confirms the brief is saved — pipeline trigger from the UI is not yet wired.
