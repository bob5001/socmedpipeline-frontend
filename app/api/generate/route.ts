import { NextRequest, NextResponse } from 'next/server';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { chat } from '@/lib/llm';
import { GENERATION_PROMPT } from '@/lib/prompts/generation';
import { Brief, GeneratedPost } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { brief }: { brief: Brief } = await req.json();

  const text = await chat({
    messages: [{
      role: 'user',
      content: `${GENERATION_PROMPT}\n\nBRIEF:\n${JSON.stringify(brief, null, 2)}`,
    }],
    maxTokens: 4096,
  });

  let posts: GeneratedPost[];
  try {
    posts = JSON.parse(text);
  } catch {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    posts = JSON.parse(cleaned);
  }

  const briefsDir = join(process.cwd(), 'briefs');
  mkdirSync(briefsDir, { recursive: true });
  writeFileSync(join(briefsDir, `${brief.id}_posts.json`), JSON.stringify(posts, null, 2));

  return NextResponse.json({ posts });
}
