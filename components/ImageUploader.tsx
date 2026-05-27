'use client';
import { useState, useEffect, useRef, useCallback, DragEvent } from 'react';

const MAX_IMAGES = 20;

interface Props {
  briefId: string;
}

export function ImageUploader({ briefId }: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/images/${briefId}`)
      .then(r => r.json())
      .then(d => setFiles(d.files ?? []));
  }, [briefId]);

  const upload = useCallback(async (picked: FileList | File[]) => {
    const arr = Array.from(picked).filter(f => f.type.startsWith('image/'));
    if (arr.length === 0) return;

    const slots = MAX_IMAGES - files.length;
    if (slots <= 0) return;

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      arr.slice(0, slots).forEach(f => form.append('images', f));

      const res = await fetch(`/api/images/${briefId}`, { method: 'POST', body: form });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Upload failed');
      }
      const data = await res.json();
      setFiles(prev => [...prev, ...data.files]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [briefId, files.length]);

  async function remove(filename: string) {
    await fetch(`/api/images/${briefId}/${filename}`, { method: 'DELETE' });
    setFiles(prev => prev.filter(f => f !== filename));
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
  }

  const remaining = MAX_IMAGES - files.length;
  const full = remaining <= 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Photos</h3>
        <span className="text-xs text-zinc-500">{files.length} / {MAX_IMAGES}</span>
      </div>

      {/* Drop zone — hidden once full */}
      {!full && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl px-4 py-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-indigo-500 bg-indigo-900/20'
              : 'border-zinc-700 hover:border-zinc-500'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files && upload(e.target.files)}
          />
          {uploading ? (
            <p className="text-zinc-400 text-sm">Uploading…</p>
          ) : (
            <>
              <p className="text-zinc-400 text-sm">
                Drop photos here or <span className="text-indigo-400">browse</span>
              </p>
              <p className="text-zinc-600 text-xs mt-1">{remaining} slot{remaining !== 1 ? 's' : ''} remaining</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Thumbnail grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {files.map(filename => (
            <div key={filename} className="relative group aspect-square">
              <img
                src={`/api/images/${briefId}/${filename}`}
                alt=""
                className="w-full h-full object-cover rounded-xl"
              />
              <button
                onClick={() => remove(filename)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full text-xs
                           flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
