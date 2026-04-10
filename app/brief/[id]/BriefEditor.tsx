'use client';
import { useState } from 'react';
import { Brief } from '@/lib/types';
import { BriefCard } from '@/components/BriefCard';

interface Props {
  initialBrief: Brief;
  briefId: string;
}

export function BriefEditor({ initialBrief, briefId }: Props) {
  const [brief, setBrief] = useState<Brief>(initialBrief);
  const [generated, setGenerated] = useState(false);

  return (
    <div className="space-y-4">
      <BriefCard brief={brief} onChange={setBrief} />

      <div className="pt-2">
        {generated ? (
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5 text-center">
            <p className="text-white font-medium mb-1">Brief saved!</p>
            <p className="text-zinc-400 text-sm">
              Your pipeline is ready to run.
            </p>
            <p className="text-zinc-600 text-xs mt-2 font-mono">briefs/{briefId}.json</p>
          </div>
        ) : (
          <button
            onClick={() => setGenerated(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-2xl text-sm transition-colors"
          >
            Generate my content
          </button>
        )}
      </div>
    </div>
  );
}
