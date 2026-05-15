'use client';
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'douletai_conversations';

function loadConversations() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveConversations(conversations) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const stored = loadConversations();
    setConversations(stored);
    if (stored.length > 0) setActiveId(stored[0].id);
  }, []);

  const active = conversations.find(c => c.id === activeId) || null;

  const save = useCallback((updated) => {
    setConversations(updated);
    saveConversations(updated);
  }, []);

  const create = useCallback((model = '', systemPrompt = '', initialMessages = []) => {
    const conv = {
      id: Date.now().toString(),
      title: initialMessages.length > 0 ? '' : 'New Chat',
      model,
      systemPrompt,
      messages: initialMessages,
      createdAt: Date.now(),
      pinned: false,
    };
    // Auto-title from first user message if present
    if (initialMessages.length > 0) {
      const firstUser = initialMessages.find(m => m.role === 'user');
      if (firstUser) {
        conv.title = firstUser.content.slice(0, 50) + (firstUser.content.length > 50 ? '...' : '');
      }
    }
    const updated = [conv, ...conversations];
    save(updated);
    setActiveId(conv.id);
    return conv;
  }, [conversations, save]);

  const remove = useCallback((id) => {
    const updated = conversations.filter(c => c.id !== id);
    save(updated);
    if (activeId === id) {
      setActiveId(updated.length > 0 ? updated[0].id : null);
    }
  }, [conversations, activeId, save]);

  const clearAll = useCallback(() => {
    save([]);
    setActiveId(null);
  }, [save]);

  const rename = useCallback((id, title) => {
    const updated = conversations.map(c =>
      c.id === id ? { ...c, title } : c
    );
    save(updated);
  }, [conversations, save]);

  const togglePin = useCallback((id) => {
    const updated = conversations.map(c =>
      c.id === id ? { ...c, pinned: !c.pinned } : c
    );
    // Sort: pinned first, then by creation date
    updated.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
    save(updated);
  }, [conversations, save]);

  const updateMessages = useCallback((id, messages) => {
    const updated = conversations.map(c =>
      c.id === id ? { ...c, messages } : c
    );
    const conv = updated.find(c => c.id === id);
    if (conv && conv.title === 'New Chat' && messages.length > 0) {
      const firstUser = messages.find(m => m.role === 'user');
      if (firstUser) {
        conv.title = firstUser.content.slice(0, 50) + (firstUser.content.length > 50 ? '...' : '');
      }
    }
    save(updated);
  }, [conversations, save]);

  const updateModel = useCallback((id, model) => {
    const updated = conversations.map(c =>
      c.id === id ? { ...c, model } : c
    );
    save(updated);
  }, [conversations, save]);

  const updateSystemPrompt = useCallback((id, systemPrompt) => {
    const updated = conversations.map(c =>
      c.id === id ? { ...c, systemPrompt } : c
    );
    save(updated);
  }, [conversations, save]);

  return {
    conversations, active, activeId, setActiveId,
    create, remove, clearAll, rename, togglePin,
    updateMessages, updateModel, updateSystemPrompt,
  };
}
