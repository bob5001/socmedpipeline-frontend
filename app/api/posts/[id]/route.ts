import { NextRequest } from 'next/server';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { GeneratedPost } from '@/lib/types';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const posts: GeneratedPost[] = await req.json();

  const path = join(process.cwd(), 'briefs', `${id}_posts.json`);
  writeFileSync(path, JSON.stringify(posts, null, 2));

  return Response.json({ ok: true });
}
