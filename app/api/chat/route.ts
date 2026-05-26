import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/llm';
import { INTERVIEW_SYSTEM_PROMPT } from '@/lib/prompts/interview-system';
import { Message } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { messages }: { messages: Message[] } = await req.json();
  const text = await chat({ system: INTERVIEW_SYSTEM_PROMPT, messages, maxTokens: 512 });
  return NextResponse.json({ message: text });
}
