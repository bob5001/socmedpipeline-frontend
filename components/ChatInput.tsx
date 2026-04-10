'use client';
import { useState, KeyboardEvent } from 'react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t border-zinc-700 bg-zinc-900">
      <textarea
        className="flex-1 resize-none rounded-xl bg-zinc-800 text-white text-sm px-4 py-3 outline-none placeholder-zinc-500 min-h-[48px] max-h-32"
        placeholder="Type here..."
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        rows={1}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-3 text-sm font-medium transition-colors"
      >
        Send
      </button>
    </div>
  );
}
