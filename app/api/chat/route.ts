import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { INTERVIEW_SYSTEM_PROMPT } from '@/lib/prompts/interview-system';
import { Message } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { messages }: { messages: Message[] } = await req.json();

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: INTERVIEW_SYSTEM_PROMPT,
    messages,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return NextResponse.json({ message: text });
}
