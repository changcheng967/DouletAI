'use client';
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'douletai_settings';
const PRESETS_KEY = 'douletai_presets';

const defaults = {
  customInstructions: '',
  defaultModel: '',
  defaultTemperature: null,
};

const DEFAULT_PRESETS = [
  { id: '__balanced__', name: 'Balanced', temperature: 0.6, maxTokens: 2048 },
  { id: '__creative__', name: 'Creative', temperature: 1.2, maxTokens: 4096 },
  { id: '__precise__', name: 'Precise', temperature: 0.2, maxTokens: 2048 },
  { id: '__long__', name: 'Long Output', temperature: 0.6, maxTokens: 8192 },
];

function loadSettings() {
  if (typeof window === 'undefined') return { ...defaults };
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? { ...defaults, ...JSON.parse(data) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

function loadPresets() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PRESETS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(defaults);
  const [presets, setPresets] = useState([]);

  useEffect(() => {
    setSettings(loadSettings());
    setPresets(loadPresets());
  }, []);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...defaults });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    }
  }, []);

  const savePresets = useCallback((updated) => {
    const userPresets = updated.filter(p => !p.id.startsWith('__'));
    setPresets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(userPresets));
    }
  }, []);

  const createPreset = useCallback((name, temperature, maxTokens) => {
    const p = { id: crypto.randomUUID(), name, temperature, maxTokens };
    savePresets([...presets, p]);
    return p;
  }, [presets, savePresets]);

  const deletePreset = useCallback((id) => {
    savePresets(presets.filter(p => p.id !== id));
  }, [presets, savePresets]);

  return {
    settings, updateSetting, resetSettings,
    presets: [...DEFAULT_PRESETS, ...presets],
    createPreset, deletePreset,
  };
}
