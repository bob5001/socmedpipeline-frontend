export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface GeneratedPost {
  platform: string;
  content_pillar: string;
  caption: string;
  hashtags: string[];
  image_prompt: string;
  overlay_text: string;
}

export interface Brief {
  id: string;
  created_at: string;
  business_name: string;
  industry: string;
  location: string;
  service_area: string;
  target_audience: string;
  customer_pain_point: string;
  discovery_channels: string;
  differentiator: string;
  brand_voice: 'casual' | 'professional' | 'warm' | 'edgy';
  tone_notes: string;
  platforms: string[];
  posting_frequency: string;
  content_sources: 'user_photos' | 'ai_generated' | 'mixed';
  avoid_topics: string[];
  emphasis_topics: string[];
  upcoming_hooks: Array<{ event: string; date: string; notes: string }>;
  raw_summary: string;
}
