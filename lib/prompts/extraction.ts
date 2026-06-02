export const EXTRACTION_PROMPT = `Given this conversation between a social media assistant and a business owner, extract the following fields into a JSON object. Be reasonable about defaults where data is missing or implied.

Preserve the user's actual language wherever possible — do not paraphrase, sanitise, or translate their words into polished marketing copy. If they said "no-bullshit adventure, not a holiday", that phrase belongs in the output, not "authentic adventure experiences". Rough edges and non-standard phrasing are signal, not errors.

Return ONLY valid JSON, no markdown, no explanation.

Schema:
{
  "business_name": "string",
  "industry": "string — normalized industry category",
  "location": "string — city/region",
  "service_area": "string — geographic coverage",
  "target_audience": "string — description of ideal customer, using their words where possible",
  "customer_pain_point": "string — the problem that brings customers to them",
  "discovery_channels": "string — how customers find them",
  "differentiator": "string — what makes them different, in their own words",
  "brand_voice": "string — short free-form description of their actual voice. Use their own phrasing if they gave it (e.g. 'direct and unfiltered', 'dry, no-bullshit', 'like someone who was actually there'). Do not map to a fixed category.",
  "tone_notes": "string — specific tone guidance, quoting their exact words where they stated a preference or rejection",
  "platforms": ["instagram", "facebook"],
  "posting_frequency": "string e.g. '3x per week'",
  "content_sources": "user_photos | ai_generated | mixed",
  "avoid_topics": ["string — use their exact phrasing if they named something to avoid"],
  "emphasis_topics": ["string"],
  "upcoming_hooks": [{"event": "string", "date": "string", "notes": "string"}],
  "raw_summary": "string — 2-3 sentences in the user's own voice. Quote or closely paraphrase what they actually said. Do not write this as a marketing summary — write it as notes from a journalist who just interviewed them."
}`;
