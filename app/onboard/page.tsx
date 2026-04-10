'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Message } from '@/lib/types';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';

export default function OnboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const hasInitialized = useRef(false);

  // Trigger opening message on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      sendMessage(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(userText: string | null) {
    const newMessages: Message[] = userText
      ? [...messages, { role: 'user', content: userText }]
      : messages;

    if (userText) setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      let assistantText: string = data.message;

      const briefReady = assistantText.includes('[BRIEF_READY]');
      assistantText = assistantText.replace('[BRIEF_READY]', '').trim();

      const updated: Message[] = [...newMessages, { role: 'assistant', content: assistantText }];
      setMessages(updated);
      setLoading(false);

      if (briefReady) {
        setBriefLoading(true);
        const briefRes = await fetch('/api/brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updated }),
        });
        const briefData = await briefRes.json();
        router.push(`/brief/${briefData.id}`);
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
    }
  }

  function handleStartOver() {
    hasInitialized.current = false;
    setMessages([]);
    setLoading(false);
    setBriefLoading(false);
    // Re-trigger opening question
    setTimeout(() => {
      hasInitialized.current = true;
      sendMessage(null);
    }, 0);
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <span className="text-zinc-400 text-sm font-medium">Social media setup</span>
        <button
          onClick={handleStartOver}
          className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
        >
          Start over
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {(loading || briefLoading) && (
          <div className="flex justify-start mb-3">
            <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {briefLoading ? (
        <div className="p-4 text-center text-zinc-500 text-sm border-t border-zinc-700">
          Building your plan...
        </div>
      ) : (
        <ChatInput onSend={text => sendMessage(text)} disabled={loading} />
      )}
    </div>
  );
}
