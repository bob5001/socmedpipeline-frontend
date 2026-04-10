export const EXTRACTION_PROMPT = `Given this conversation between a social media assistant and a business owner, extract the following fields into a JSON object. Be reasonable about defaults where data is missing or implied.

Return ONLY valid JSON, no markdown, no explanation.

Schema:
{
  "business_name": "string",
  "industry": "string — normalized industry category",
  "location": "string — city/region",
  "service_area": "string — geographic coverage",
  "target_audience": "string — description of ideal customer",
  "customer_pain_point": "string — the problem that brings customers to them",
  "discovery_channels": "string — how customers find them",
  "differentiator": "string — what makes them different",
  "brand_voice": "casual | professional | warm | edgy",
  "tone_notes": "string — any specific tone guidance",
  "platforms": ["instagram", "facebook"],
  "posting_frequency": "string e.g. '3x per week'",
  "content_sources": "user_photos | ai_generated | mixed",
  "avoid_topics": ["string"],
  "emphasis_topics": ["string"],
  "upcoming_hooks": [{"event": "string", "date": "string", "notes": "string"}],
  "raw_summary": "string — 2-3 sentence plain English summary of this business and campaign"
}`;
