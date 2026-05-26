# SocMedPipeline Brief Builder — Front End Scope

## What This Is

A conversational onboarding web app that interviews a small business owner and produces a structured campaign brief JSON that the existing socmedpipeline Python pipeline can consume. This is the missing front door to the pipeline. The user never sees the pipeline. They see a friendly chat that asks them about their business and produces social media content.

## Context

The existing pipeline lives at `~/Projects/socmedpipeline-working`. It's a six-agent Python pipeline: campaign data → content generation → image gen → vision QA → design overlay → queue/posting. Currently it consumes a hand-written markdown brief (see `Signal Sanctuary — EHS Awareness Campa.md` for the shape of one). This front end replaces that manual step.

## Target User

Non-technical small business owners. Plumbers, restaurant managers, nonprofit directors, yoga studios. People who know they should post on social media but don't have time, don't know what to say, and have never heard of an API. Design for someone on their phone, slightly impatient, who will bail if it feels like a form.

## Core UX: The Interview

A conversational chat interface — NOT a multi-step form. The user talks to an AI that guides them through building their brief. It should feel like talking to a friendly marketing person, not filling out an intake form.

### Interview Flow (guided but flexible)

The AI should extract the following through natural conversation. It does NOT need to ask these as literal questions — it should be conversational, adaptive, and able to pull multiple data points from a single response.

**Phase 1 — Who are you? (Business Identity)**
- Business name
- What they do (in their words — the AI normalizes later)
- Location / service area
- How long they've been in business

**Phase 2 — Who do you serve? (Audience)**
- Their best/favorite type of customer
- What that customer's problem was when they first called
- How they found the business (word of mouth, Google, etc.)

**Phase 3 — What makes you different? (Voice & Positioning)**
- What they'd tell a friend about why their business is different
- Tone check: are they casual/funny, professional/serious, warm/community-oriented?
- Any topics they want to avoid or emphasize

**Phase 4 — Practical Constraints**
- Which platforms they care about (Instagram, Facebook, LinkedIn, X — default to IG + FB)
- How often they want to post (suggest 3x/week as default)
- Do they have photos/video they can supply, or do they need AI-generated imagery?
- Any upcoming events, promotions, or seasonal hooks?

**Phase 5 — Confirmation & Brief Generation**
- AI summarizes what it heard back to the user in plain English
- User confirms or corrects
- System generates the structured brief JSON

### Conversation Guardrails

- If the user gives a one-word answer, the AI follows up with a softer prompt, not a repeat of the question
- If the user dumps a wall of text, the AI should extract what it can and confirm rather than re-asking
- The AI should be able to handle "I don't know" gracefully — suggest defaults, give examples from their industry
- Keep the total interview under 10-12 exchanges. Respect their time.

## Technical Spec

### Stack
- **Next.js** (App Router) — Robert is already in this world with robertrkoch.com
- **Tailwind CSS** — clean, mobile-first
- **Anthropic API** (Claude Haiku or Sonnet for the interview agent — cost-constrained, Haiku preferred if quality holds)
- **No database for v0** — brief output is JSON saved to filesystem or passed to pipeline via API call. Persistent user accounts come later.

### Architecture

```
┌─────────────────────────────┐
│  Next.js App                │
│                             │
│  /onboard        Chat UI    │──── Anthropic API (Haiku)
│  /brief/[id]     Review UI  │     with system prompt that
│  /api/chat       Chat route │     enforces interview structure
│  /api/brief      Brief gen  │
│                             │
└──────────┬──────────────────┘
           │
           ▼  (JSON brief output)
┌─────────────────────────────┐
│  Existing Python Pipeline   │
│  socmedpipeline-working     │
│  run_pipeline.py            │
└─────────────────────────────┘
```

### API Route: `/api/chat`

- Accepts message history + new user message
- System prompt contains the interview structure, phase tracking, and output format instructions
- Returns AI response
- The system prompt should include a state machine concept: track which phases have sufficient data, which still need info, and when to trigger the summary/confirmation phase
- Use Haiku. If response quality on the interview is insufficient, escalate to Sonnet. Do not use Opus — this must be cheap to run at scale.

### API Route: `/api/brief`

- Called when user confirms the summary
- Takes the full conversation, makes one final structured extraction call to the LLM
- Prompt: "Given this conversation, extract the following fields into JSON: { business_name, industry, location, service_area, target_audience, customer_pain_point, discovery_channels, differentiator, brand_voice (enum: casual|professional|warm|edgy), tone_notes, platforms (array), posting_frequency, content_sources (enum: user_photos|ai_generated|mixed), avoid_topics (array), emphasis_topics (array), upcoming_hooks (array of {event, date, notes}), raw_summary (plain english paragraph) }"
- Saves JSON to `briefs/` directory with timestamp filename
- Returns brief ID for review page

### Page: `/onboard`

- Full-screen mobile-first chat interface
- Messages appear conversationally (not instant — slight stagger for AI responses to feel natural)
- Minimal chrome. No sidebar, no nav, no settings. Just the conversation.
- A subtle progress indicator (not a step counter — maybe a gentle color shift or a "almost done" from the AI itself)
- "Start over" option tucked away but accessible

### Page: `/brief/[id]`

- Displays the generated brief in a clean, editable card layout
- User can tweak fields before confirming
- "Generate my content" button triggers pipeline (v0: just saves the JSON; pipeline integration comes next sprint)

## What Is Explicitly Out of Scope for v0

- User authentication / accounts
- Payment / billing
- Direct social media API posting (the pipeline handles this separately)
- Image upload from user
- Multi-brand / agency dashboard
- Analytics or post-performance tracking
- Pipeline orchestration (this front end just produces the brief JSON)

## Quality Bar

- The interview must feel like talking to a person, not filling out a form
- Mobile-first — assume the plumber is on their phone between jobs
- The entire onboarding should take under 5 minutes
- The brief JSON must be complete enough that the existing pipeline's Agent 1 (campaign data) can consume it without manual editing

## File Structure (suggested)

```
socmedpipeline-frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              → redirect to /onboard
│   ├── onboard/
│   │   └── page.tsx          → chat interface
│   ├── brief/
│   │   └── [id]/
│   │       └── page.tsx      → brief review/edit
│   └── api/
│       ├── chat/
│       │   └── route.ts      → interview chat endpoint
│       └── brief/
│           └── route.ts      → brief extraction + save
├── components/
│   ├── ChatMessage.tsx
│   ├── ChatInput.tsx
│   ├── BriefCard.tsx
│   └── ProgressIndicator.tsx
├── lib/
│   ├── prompts/
│   │   ├── interview-system.ts   → system prompt for interview agent
│   │   └── extraction.ts        → brief extraction prompt
│   ├── types.ts                  → Brief interface, Message types
│   └── anthropic.ts              → API client wrapper
├── briefs/                       → generated JSON output
├── tailwind.config.ts
├── package.json
└── README.md
```

## System Prompt Guidance (for the interview agent)

The system prompt is the product. It should:
- Introduce itself as a social media assistant, not an AI
- Open with one warm question, not a list of what it needs
- Track state internally (which phases have data, which don't)
- Transition between phases naturally ("Great — now I have a good sense of what you do. Let me ask about your customers...")
- Be able to synthesize partial answers ("Sounds like your customers are mostly homeowners dealing with emergency repairs — is that right?")
- Know when it has enough to generate a brief and offer to wrap up
- Handle the user wanting to skip or saying "I don't know" — suggest sensible defaults based on their industry
- Stay under 3 sentences per response. This is a conversation, not a lecture.

## Definition of Done

- A user can open `/onboard` on their phone, have a 5-minute conversation, and get a `brief.json` file that contains all fields needed to run the existing pipeline
- The conversation feels natural, not robotic
- No crashes, no blank screens, no infinite spinners on mobile
- Brief JSON validates against the expected schema