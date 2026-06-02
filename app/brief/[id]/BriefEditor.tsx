'use client';
import { useState } from 'react';
import { Brief, GeneratedPost } from '@/lib/types';
import { BriefCard } from '@/components/BriefCard';
import { PostCard } from '@/components/PostCard';
import { ImageUploader } from '@/components/ImageUploader';

interface Props {
  initialBrief: Brief;
  briefId: string;
  briefPath: string;
}

type Phase = 'editing' | 'saved' | 'generating' | 'posts' | 'launching' | 'launched';

export function BriefEditor({ initialBrief, briefId, briefPath }: Props) {
  const [brief, setBrief] = useState<Brief>(initialBrief);
  const [phase, setPhase] = useState<Phase>('editing');
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setPhase('saving' as Phase);
    try {
      const res = await fetch(`/api/brief/${briefId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brief),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setPhase('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setPhase('editing');
    }
  }

  async function handleGenerate() {
    setError(null);
    setPhase('generating');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });
      if (!res.ok) throw new Error(`Generation failed: ${res.status}`);
      const data = await res.json();
      setPosts(data.posts);
      setPhase('posts');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setPhase('saved');
    }
  }

  function updatePost(index: number, updated: GeneratedPost) {
    setPosts(prev => prev.map((p, i) => (i === index ? updated : p)));
  }

  async function handleLaunchPipeline() {
    setError(null);
    setPhase('launching');
    try {
      const res = await fetch(`/api/brief/${briefId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Launch failed: ${res.status}`);
      }
      setPhase('launched');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Launch failed');
      setPhase('posts');
    }
  }

  return (
    <div className="space-y-4">
      {/* Brief form — always visible unless viewing posts */}
      {phase !== 'posts' && (
        <BriefCard brief={brief} onChange={setBrief} />
      )}

      {/* Collapsed brief summary when viewing posts */}
      {phase === 'posts' && (
        <div className="bg-zinc-800/40 border border-zinc-700 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">{brief.business_name}</p>
            <p className="text-zinc-500 text-xs">{brief.industry} · {brief.location}</p>
          </div>
          <button
            onClick={() => setPhase('saved')}
            className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
          >
            Edit brief
          </button>
        </div>
      )}

      {/* Image uploader — visible once brief is saved */}
      {(phase === 'saved' || phase === 'posts') && (
        <div className="bg-zinc-800/40 border border-zinc-700 rounded-2xl p-5">
          <ImageUploader briefId={briefId} />
        </div>
      )}

      {/* Action area */}
      <div className="pt-1 space-y-2">
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        {(phase === 'editing' || (phase as string) === 'saving') && (
          <button
            onClick={handleSave}
            disabled={(phase as string) === 'saving'}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium py-3 rounded-2xl text-sm transition-colors"
          >
            {(phase as string) === 'saving' ? 'Saving…' : 'Save brief'}
          </button>
        )}

        {phase === 'saved' && (
          <button
            onClick={handleGenerate}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-2xl text-sm transition-colors"
          >
            Generate posts
          </button>
        )}

        {phase === 'generating' && (
          <div className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-3 text-center">
            <span className="text-zinc-400 text-sm">Writing your posts…</span>
          </div>
        )}
      </div>

      {/* Post cards */}
      {phase === 'posts' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-medium">Your posts</h2>
            <button
              onClick={handleGenerate}
              className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
            >
              Regenerate
            </button>
          </div>

          {posts.map((post, i) => (
            <PostCard key={i} post={post} index={i} onChange={updated => updatePost(i, updated)} />
          ))}

          {phase === 'posts' && (
            <button
              onClick={handleLaunchPipeline}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-2xl text-sm transition-colors"
            >
              Generate images
            </button>
          )}

          {phase === 'launching' && (
            <div className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-3 text-center">
              <span className="text-zinc-400 text-sm">Launching pipeline…</span>
            </div>
          )}

          {phase === 'launched' && (
            <div className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-3 text-center">
              <span className="text-zinc-400 text-sm">Pipeline running — images generating in the background</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
