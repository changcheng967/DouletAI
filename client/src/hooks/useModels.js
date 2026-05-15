'use client';
import { useState, useEffect } from 'react';
import { fetchModels } from '@/lib/api';

export function useModels() {
  const [models, setModels] = useState([]);

  useEffect(() => {
    fetchModels()
      .then(data => {
        setModels(data.models || []);
      })
      .catch(() => {});
  }, []);

  return { models };
}
