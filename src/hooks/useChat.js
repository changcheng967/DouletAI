'use client';
import { useState, useCallback, useRef } from 'react';
import { streamChat, searchWeb } from '@/lib/api';

export function useChat(onMessagesUpdate, onComplete) {
  const [streaming, setStreaming] = useState(false);
  const [thinkingActive, setThinkingActive] = useState(false);
  const [waitingForFirst, setWaitingForFirst] = useState(false);
  const [error, setError] = useState(null);
  const [lastUsage, setLastUsage] = useState(null);
  const [lastDuration, setLastDuration] = useState(null);
  const [lastTtk, setLastTtk] = useState(null);
  const [searchingWeb, setSearchingWeb] = useState(false);
  const abortRef = useRef(null);

  const send = useCallback(async (messages, model, enableThinking = false, options = {}) => {
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setStreaming(true);
    setThinkingActive(false);
    setWaitingForFirst(true);
    setLastTtk(null);
    const startTime = Date.now();

    let apiMessages = messages.map(m => ({ role: m.role, content: m.content }));

    // Web search: if enabled, search with the last user message and inject results
    if (options.webSearch) {
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      if (lastUser) {
        setSearchingWeb(true);
        const query = lastUser.content.slice(0, 200);
        const results = await searchWeb(query);
        setSearchingWeb(false);

        if (results.length > 0) {
          const searchContext = results.map((r, i) => `[${i + 1}] ${r.snippet}${r.url ? ` (Source: ${r.url})` : ''}`).join('\n');
          const searchPrompt = `The user enabled web search. Here are search results for "${query}":\n\n${searchContext}\n\nUse this information to help answer the user's question. Cite sources when relevant.`;
          // Prepend search context as a system message
          apiMessages = [
            { role: 'system', content: searchPrompt },
            ...apiMessages,
          ];
        }
      }
    }

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
      messages: apiMessages,
      thinking: enableThinking,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      signal: controller.signal,
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
        const finalMessages = [...messages, { ...assistantMsg }];
        onMessagesUpdate(finalMessages);
        onComplete?.(finalMessages);
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
  }, [onMessagesUpdate, onComplete]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setThinkingActive(false);
    setWaitingForFirst(false);
    setSearchingWeb(false);
  }, []);

  return { send, stop, streaming, thinkingActive, waitingForFirst, error, lastUsage, lastDuration, lastTtk, searchingWeb };
}
