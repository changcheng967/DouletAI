'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'douletai_conversations';
const FOLDERS_KEY = 'douletai_folders';

function loadFolders() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(FOLDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function loadConversations() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const saveTimerRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => {
    const stored = loadConversations();
    setConversations(stored);
    setFolders(loadFolders());
    if (stored.length > 0) setActiveId(stored[0].id);
  }, []);

  const save = useCallback((updated, updatedFolders) => {
    latestRef.current = updated;
    setConversations(updated);
    if (updatedFolders !== undefined) {
      setFolders(updatedFolders);
      if (typeof window !== 'undefined') {
        localStorage.setItem(FOLDERS_KEY, JSON.stringify(updatedFolders));
      }
    }
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (latestRef.current && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(latestRef.current));
      }
    }, 300);
  }, []);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current);
      if (latestRef.current && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(latestRef.current));
      }
    };
  }, []);

  const active = conversations.find(c => c.id === activeId) || null;

  const create = useCallback((model = '', systemPrompt = '', initialMessages = []) => {
    const conv = {
      id: crypto.randomUUID(),
      title: initialMessages.length > 0 ? '' : 'New Chat',
      model,
      systemPrompt,
      messages: initialMessages,
      createdAt: Date.now(),
      pinned: false,
    };
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

  const rateMessage = useCallback((convId, msgIndex, rating) => {
    const updated = conversations.map(c => {
      if (c.id !== convId) return c;
      const messages = c.messages.map((m, i) =>
        i === msgIndex ? { ...m, rating } : m
      );
      return { ...c, messages };
    });
    save(updated);
  }, [conversations, save]);

  const createFolder = useCallback((name) => {
    const folder = { id: crypto.randomUUID(), name, createdAt: Date.now() };
    const updated = [...folders, folder];
    save(conversations, updated);
    return folder;
  }, [conversations, folders, save]);

  const renameFolder = useCallback((folderId, name) => {
    const updated = folders.map(f => f.id === folderId ? { ...f, name } : f);
    save(conversations, updated);
  }, [conversations, folders, save]);

  const deleteFolder = useCallback((folderId) => {
    const updatedFolders = folders.filter(f => f.id !== folderId);
    const updatedConvs = conversations.map(c =>
      c.folderId === folderId ? { ...c, folderId: null } : c
    );
    save(updatedConvs, updatedFolders);
  }, [conversations, folders, save]);

  const moveToFolder = useCallback((convId, folderId) => {
    const updated = conversations.map(c =>
      c.id === convId ? { ...c, folderId: folderId || null } : c
    );
    save(updated);
  }, [conversations, save]);

  return {
    conversations, active, activeId, setActiveId,
    create, remove, clearAll, rename, togglePin,
    updateMessages, updateModel, updateSystemPrompt, rateMessage,
    folders, createFolder, renameFolder, deleteFolder, moveToFolder,
  };
}
