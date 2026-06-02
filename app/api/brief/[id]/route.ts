import { NextRequest } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Brief, GeneratedPost } from '@/lib/types';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const brief: Brief = await req.json();

  const path = join(process.cwd(), 'briefs', `${id}.json`);
  writeFileSync(path, JSON.stringify(brief, null, 2));

  return Response.json({ ok: true, path });
}

// Launch the Python pipeline for an approved set of posts.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { posts }: { posts: GeneratedPost[] } = await req.json();

  const briefPath = join(process.cwd(), 'briefs', `${id}.json`);
  const brief: Brief = JSON.parse(readFileSync(briefPath, 'utf-8'));

  const pipelineUrl = process.env.PIPELINE_API_URL ?? 'http://localhost:8000';

  const res = await fetch(`${pipelineUrl}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief, posts }),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Pipeline error: ${res.status} ${text}` }, { status: 502 });
  }

  return Response.json(await res.json());
}
