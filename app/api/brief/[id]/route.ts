import { NextRequest } from 'next/server';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { Brief } from '@/lib/types';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const brief: Brief = await req.json();

  const path = join(process.cwd(), 'briefs', `${id}.json`);
  writeFileSync(path, JSON.stringify(brief, null, 2));

  return Response.json({ ok: true, path });
}
