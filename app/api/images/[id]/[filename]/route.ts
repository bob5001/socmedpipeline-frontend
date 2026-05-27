import { NextRequest } from 'next/server';
import { readFileSync, unlinkSync } from 'fs';
import { join, basename } from 'path';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', heic: 'image/heic',
};

type Ctx = { params: Promise<{ id: string; filename: string }> };

function filePath(id: string, filename: string) {
  // basename prevents path traversal
  return join(process.cwd(), 'briefs', `${id}_images`, basename(filename));
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id, filename } = await ctx.params;
  const path = filePath(id, filename);

  try {
    const file = readFileSync(path);
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    return new Response(file, {
      headers: { 'Content-Type': MIME[ext] ?? 'application/octet-stream' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id, filename } = await ctx.params;
  try {
    unlinkSync(filePath(id, filename));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 404 });
  }
}
