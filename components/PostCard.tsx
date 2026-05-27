'use client';
import { useState } from 'react';
import { GeneratedPost } from '@/lib/types';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-900/50 text-pink-300 border-pink-800',
  facebook: 'bg-blue-900/50 text-blue-300 border-blue-800',
  linkedin: 'bg-sky-900/50 text-sky-300 border-sky-800',
  tiktok: 'bg-purple-900/50 text-purple-300 border-purple-800',
};

function platformColor(platform: string) {
  return PLATFORM_COLORS[platform.toLowerCase()] ?? 'bg-zinc-800 text-zinc-300 border-zinc-700';
}

interface Props {
  post: GeneratedPost;
  index: number;
  onChange: (post: GeneratedPost) => void;
}

export function PostCard({ post, index, onChange }: Props) {
  const [hashtagText, setHashtagText] = useState(post.hashtags.join(' '));

  function set<K extends keyof GeneratedPost>(key: K, value: GeneratedPost[K]) {
    onChange({ ...post, [key]: value });
  }

  function commitHashtags(raw: string) {
    const tags = raw
      .split(/[\s,]+/)
      .map(t => (t.startsWith('#') ? t : `#${t}`))
      .filter(t => t.length > 1);
    set('hashtags', tags);
  }

  return (
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${platformColor(post.platform)}`}>
          {post.platform}
        </span>
        <span className="text-zinc-600 text-xs">Post {index + 1}</span>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Caption</label>
        <textarea
          value={post.caption}
          onChange={e => set('caption', e.target.value)}
          rows={5}
          className="w-full bg-zinc-900 text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors resize-none leading-relaxed"
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Hashtags</label>
        <input
          type="text"
          value={hashtagText}
          onChange={e => setHashtagText(e.target.value)}
          onBlur={() => commitHashtags(hashtagText)}
          placeholder="#tag1 #tag2 #tag3"
          className="w-full bg-zinc-900 text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors font-mono"
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Image prompt</label>
        <textarea
          value={post.image_prompt}
          onChange={e => set('image_prompt', e.target.value)}
          rows={3}
          className="w-full bg-zinc-900 text-zinc-300 text-sm rounded-xl px-3 py-2.5 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors resize-none leading-relaxed italic"
        />
      </div>
    </div>
  );
}
