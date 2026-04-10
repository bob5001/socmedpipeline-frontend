import { readFileSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import { Brief } from '@/lib/types';
import { BriefEditor } from './BriefEditor';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BriefPage({ params }: Props) {
  const { id } = await params;

  let brief: Brief;
  try {
    const filePath = join(process.cwd(), 'briefs', `${id}.json`);
    const raw = readFileSync(filePath, 'utf-8');
    brief = JSON.parse(raw);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white mb-1">Your Social Media Brief</h1>
          <p className="text-zinc-500 text-xs">
            Brief saved to <span className="font-mono text-zinc-400">briefs/{id}.json</span>
          </p>
        </div>
        <BriefEditor initialBrief={brief} briefId={id} />
      </div>
    </div>
  );
}
