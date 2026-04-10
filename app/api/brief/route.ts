import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { EXTRACTION_PROMPT } from '@/lib/prompts/extraction';
import { Message, Brief } from '@/lib/types';
import { writeFileSync } from 'fs';
import { join } from 'path';

export async function POST(req: NextRequest) {
  const { messages }: { messages: Message[] } = await req.json();

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'Business owner' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\nCONVERSATION:\n${conversationText}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

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
  writeFileSync(join(briefsDir, `${id}.json`), JSON.stringify(brief, null, 2));

  return NextResponse.json({ id, brief });
}
