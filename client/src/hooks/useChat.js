'use client';
import { useState, useCallback, useRef } from 'react';
import { streamChat } from '@/lib/api';

export function useChat(onMessagesUpdate) {
  const [streaming, setStreaming] = useState(false);
  const [thinkingActive, setThinkingActive] = useState(false);
  const [waitingForFirst, setWaitingForFirst] = useState(false);
  const [error, setError] = useState(null);
  const [lastUsage, setLastUsage] = useState(null);
  const [lastDuration, setLastDuration] = useState(null);
  const [lastTtk, setLastTtk] = useState(null);
  const abortRef = useRef(null);

  const send = useCallback(async (messages, model, enableThinking = false, options = {}) => {
    setError(null);
    setStreaming(true);
    setThinkingActive(false);
    setWaitingForFirst(true);
    setLastTtk(null);
    const startTime = Date.now();

    let contentAccum = '';
    let thinkingAccum = '';
    let gotFirstToken = false;
    const assistantMsg = {
      role: 'assistant',
      content: '',
      thinking: '',
      usage: null,
      duration: null,
      ttk: null,
      timestamp: Date.now(),
    };
    const allMessages = [...messages, assistantMsg];
    onMessagesUpdate(allMessages);

    await streamChat({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      thinking: enableThinking,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      onThinking: (text) => {
        if (!gotFirstToken) {
          gotFirstToken = true;
          const ttk = ((Date.now() - startTime) / 1000).toFixed(2);
          assistantMsg.ttk = ttk;
          setLastTtk(ttk);
          setWaitingForFirst(false);
        }
        thinkingAccum += text;
        assistantMsg.thinking = thinkingAccum;
        setThinkingActive(true);
        onMessagesUpdate([...messages, { ...assistantMsg }]);
      },
      onChunk: (text) => {
        if (!gotFirstToken) {
          gotFirstToken = true;
          const ttk = ((Date.now() - startTime) / 1000).toFixed(2);
          assistantMsg.ttk = ttk;
          setLastTtk(ttk);
          setWaitingForFirst(false);
        }
        contentAccum += text;
        assistantMsg.content = contentAccum;
        setThinkingActive(false);
        onMessagesUpdate([...messages, { ...assistantMsg }]);
      },
      onUsage: (usage) => {
        assistantMsg.usage = usage;
        setLastUsage(usage);
        onMessagesUpdate([...messages, { ...assistantMsg }]);
      },
      onDone: () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        assistantMsg.duration = duration;
        setLastDuration(duration);
        setStreaming(false);
        setThinkingActive(false);
        setWaitingForFirst(false);
        onMessagesUpdate([...messages, { ...assistantMsg }]);
      },
      onError: (err) => {
        setError(err);
        if (!contentAccum && !thinkingAccum) {
          assistantMsg.content = `Sorry, something went wrong: ${err}`;
          assistantMsg.isError = true;
          onMessagesUpdate([...messages, { ...assistantMsg }]);
        }
        setStreaming(false);
        setThinkingActive(false);
        setWaitingForFirst(false);
      },
    });
  }, [onMessagesUpdate]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setThinkingActive(false);
    setWaitingForFirst(false);
  }, []);

  return { send, stop, streaming, thinkingActive, waitingForFirst, error, lastUsage, lastDuration, lastTtk };
}
