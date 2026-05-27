import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/llm';
import { EXTRACTION_PROMPT } from '@/lib/prompts/extraction';
import { Message, Brief } from '@/lib/types';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export async function POST(req: NextRequest) {
  const { messages }: { messages: Message[] } = await req.json();

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'Business owner' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const text = await chat({ messages: [{ role: 'user', content: `${EXTRACTION_PROMPT}\n\nCONVERSATION:\n${conversationText}` }], maxTokens: 2048 });

  let briefData: Omit<Brief, 'id' | 'created_at'>;
  try {
    briefData = JSON.parse(text);
  } catch {
    // Strip markdown if model wrapped it
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    briefData = JSON.parse(cleaned);
  }

  const id = `brief-${Date.now()}`;
  const brief: Brief = {
    id,
    created_at: new Date().toISOString(),
    ...briefData,
  };

  const briefsDir = join(process.cwd(), 'briefs');
  mkdirSync(briefsDir, { recursive: true });
  writeFileSync(join(briefsDir, `${id}.json`), JSON.stringify(brief, null, 2));

  return NextResponse.json({ id, brief });
}
