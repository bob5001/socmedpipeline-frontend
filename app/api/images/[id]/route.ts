import { NextRequest, NextResponse } from 'next/server';
import { mkdirSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const MAX_IMAGES = 20;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']);

function imagesDir(id: string) {
  return join(process.cwd(), 'briefs', `${id}_images`);
}

function listImages(id: string): string[] {
  try {
    return readdirSync(imagesDir(id)).filter(f => /\.(jpe?g|png|webp|gif|heic)$/i.test(f));
  } catch {
    return [];
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return NextResponse.json({ files: listImages(id) });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const existing = listImages(id);
  if (existing.length >= MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images already uploaded` }, { status: 400 });
  }

  const formData = await req.formData();
  const incoming = formData.getAll('images') as File[];

  const slots = MAX_IMAGES - existing.length;
  const toSave = incoming.slice(0, slots);

  const dir = imagesDir(id);
  mkdirSync(dir, { recursive: true });

  const saved: string[] = [];
  for (const file of toSave) {
    if (!ALLOWED_TYPES.has(file.type)) continue;

    const safeName = basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(join(dir, filename), buffer);
    saved.push(filename);
  }

  return NextResponse.json({ files: saved, total: existing.length + saved.length });
}
