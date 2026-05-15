'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Eye, Brain, Code2, Clock, Zap } from 'lucide-react';
import { fetchModels } from '@/lib/api';

const PROVIDER_NAMES = {
  anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', meta: 'Meta',
  mistralai: 'Mistral', qwen: 'Qwen', 'x-ai': 'xAI', 'deepseek-ai': 'DeepSeek',
  nvidia: 'NVIDIA', 'z-ai': 'Z.AI', microsoft: 'Microsoft', deepseek: 'DeepSeek',
  minimax: 'MiniMax', ring: 'Ring', 'arli-ai': 'Arli AI', moonshotai: 'Moonshot',
  minimaxai: 'MiniMax', 'stepfun-ai': 'StepFun', sarvamai: 'Sarvam',
  stockmark: 'Stockmark', upstage: 'Upstage',
};

const CAPABILITY_ICONS = {
  vision: <Eye size={10} />,
  reasoning: <Brain size={10} />,
  coding: <Code2 size={10} />,
};

const ROUTING_TAGS = new Set(['zen','arli','freetheai','modal','groq','sambanova','cerebras','google-ai','openrouter','github','llm7']);

function getCapabilities(tags) {
  return (tags || []).filter(t => !ROUTING_TAGS.has(t));
}

function SpeedBadge({ speed, ttk }) {
  if (ttk != null) return <span className="badge badge-speed"><Zap size={8} />{ttk < 1 ? '<1s' : `${Math.round(ttk)}s`}</span>;
  if (speed === 'slow') return <span className="badge badge-slow"><Clock size={9} /></span>;
  if (speed === 'medium') return <span className="badge badge-medium"><Clock size={9} /></span>;
  return null;
}

export default function ModelSelector({ value, onChange }) {
  const [models, setModels] = useState(null);
  const [grouped, setGrouped] = useState({});
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    fetchModels()
      .then(data => {
        setModels(data.models || []);
        setGrouped(data.grouped || {});
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedModel = models?.find(m => m.id === value);
  const displayName = selectedModel
    ? selectedModel.name
    : value ? value.split('/').pop() : 'Select a model...';

  const displayGrouped = search
    ? (() => {
        const q = search.toLowerCase();
        const filtered = {};
        for (const [provider, ms] of Object.entries(grouped)) {
          const match = ms.filter(m =>
            m.id.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            m.provider.toLowerCase().includes(q) ||
            (m.tags || []).some(t => t.includes(q))
          );
          if (match.length) filtered[provider] = match;
        }
        return filtered;
      })()
    : grouped;

  return (
    <div className="model-selector" ref={ref}>
      <button className="model-selector-btn" onClick={() => setOpen(!open)}>
        <span className="model-selector-value">
          {displayName}
          {selectedModel && (
            <span className="model-selector-badges">
              {getCapabilities(selectedModel.tags).map(t => (
                <span key={t} className={`badge badge-${t}`}>{CAPABILITY_ICONS[t]}</span>
              ))}
              <SpeedBadge speed={selectedModel.speed} ttk={selectedModel.ttk} />
            </span>
          )}
        </span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="model-selector-dropdown">
          <div className="model-selector-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search models, capabilities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {models && <span className="model-count">{models.length} models</span>}
          </div>
          <div className="model-selector-list">
            {Object.entries(displayGrouped).map(([provider, ms]) => (
              <div key={provider}>
                <div className="model-selector-group">
                  {PROVIDER_NAMES[provider] || provider}
                  <span className="model-selector-group-count">{ms.length}</span>
                </div>
                {ms.map(m => (
                  <button
                    key={m.id}
                    className={`model-selector-item ${m.id === value ? 'active' : ''}`}
                    onClick={() => { onChange(m.id); setOpen(false); setSearch(''); }}
                  >
                    <span className="model-item-name">{m.name}</span>
                    <span className="model-item-badges">
                      {getCapabilities(m.tags).map(t => (
                        <span key={t} className={`badge badge-${t}`}>{CAPABILITY_ICONS[t]}</span>
                      ))}
                      <SpeedBadge speed={m.speed} ttk={m.ttk} />
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {models === null && <div className="model-selector-loading">Loading models...</div>}
            {models?.length === 0 && <div className="model-selector-loading">No models available</div>}
          </div>
        </div>
      )}
    </div>
  );
}
