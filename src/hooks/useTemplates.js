'use client';
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'douletai_templates';

function loadTemplates() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

const DEFAULTS = [
  { id: '__default_code__', name: 'Code Helper', prompt: 'Help me write code. Explain your approach step by step, then provide the implementation.', createdAt: 0, builtIn: true },
  { id: '__default_explain__', name: 'Explain Like I\'m 5', prompt: 'Explain the following concept in simple terms that anyone could understand. Use analogies and examples.', createdAt: 0, builtIn: true },
  { id: '__default_translate__', name: 'Translator', prompt: 'Translate the following text. Detect the source language automatically and translate to English (or the language specified after the text).', createdAt: 0, builtIn: true },
  { id: '__default_summarize__', name: 'Summarize', prompt: 'Summarize the following text concisely. Extract the key points and main takeaways.', createdAt: 0, builtIn: true },
  { id: '__default_debug__', name: 'Debug Assistant', prompt: 'Help me debug this issue. Analyze the code/error, identify the root cause, and suggest a fix with explanation.', createdAt: 0, builtIn: true },
];

export function useTemplates() {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const stored = loadTemplates();
    setTemplates([...DEFAULTS, ...stored]);
  }, []);

  const saveUserTemplates = useCallback((updated) => {
    const userTemplates = updated.filter(t => !t.builtIn);
    setTemplates(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userTemplates));
    }
  }, []);

  const createTemplate = useCallback((name, prompt) => {
    const t = { id: crypto.randomUUID(), name, prompt, createdAt: Date.now() };
    saveUserTemplates([...templates, t]);
    return t;
  }, [templates, saveUserTemplates]);

  const updateTemplate = useCallback((id, updates) => {
    const updated = templates.map(t => t.id === id ? { ...t, ...updates } : t);
    saveUserTemplates(updated);
  }, [templates, saveUserTemplates]);

  const deleteTemplate = useCallback((id) => {
    const updated = templates.filter(t => t.id !== id);
    saveUserTemplates(updated);
  }, [templates, saveUserTemplates]);

  return { templates, createTemplate, updateTemplate, deleteTemplate };
}
